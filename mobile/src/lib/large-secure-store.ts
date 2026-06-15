import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import * as aesjs from 'aes-js';

/**
 * Adaptateur de stockage de session recommandé par Supabase pour React Native.
 *
 * Problème : `expo-secure-store` (Keychain iOS / Keystore Android) plafonne à
 * ~2 Ko par valeur, or une session Supabase (JWT + refresh token) peut dépasser
 * cette limite. AsyncStorage n'a pas de limite mais n'est pas chiffré.
 *
 * Solution : on chiffre la valeur avec une clé AES-256 aléatoire par entrée,
 * la clé AES vit dans SecureStore (chiffré matériel), le texte chiffré vit dans
 * AsyncStorage (sans limite de taille). On obtient sécurité + capacité.
 *
 * Implémente l'interface attendue par l'option `auth.storage` de supabase-js.
 */
export class LargeSecureStore {
  private async _encrypt(key: string, value: string): Promise<string> {
    // expo-crypto : inclus dans Expo Go (pas de module natif tiers à linker).
    const encryptionKey = Crypto.getRandomBytes(256 / 8);
    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
    const encryptedBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(value));

    await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(encryptionKey));
    return aesjs.utils.hex.fromBytes(encryptedBytes);
  }

  private async _decrypt(key: string, value: string): Promise<string | null> {
    const encryptionKeyHex = await SecureStore.getItemAsync(key);
    if (!encryptionKeyHex) return null;

    const cipher = new aesjs.ModeOfOperation.ctr(
      aesjs.utils.hex.toBytes(encryptionKeyHex),
      new aesjs.Counter(1),
    );
    const decryptedBytes = cipher.decrypt(aesjs.utils.hex.toBytes(value));
    return aesjs.utils.utf8.fromBytes(decryptedBytes);
  }

  async getItem(key: string): Promise<string | null> {
    const encrypted = await AsyncStorage.getItem(key);
    if (!encrypted) return null;
    return this._decrypt(key, encrypted);
  }

  async setItem(key: string, value: string): Promise<void> {
    const encrypted = await this._encrypt(key, value);
    await AsyncStorage.setItem(key, encrypted);
  }

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(key);
  }
}
