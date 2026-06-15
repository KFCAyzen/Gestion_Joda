import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth-context';

/**
 * Écran imposé quand `must_change_password === true` (1re connexion ou après
 * réinitialisation par mot de passe temporaire). Le routeur racine n'autorise
 * rien d'autre tant que le flag n'est pas levé.
 */
export default function ChangePasswordScreen() {
  const { changePassword, logout } = useAuth();
  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mismatch = confirm.length > 0 && pwd !== confirm;

  async function handleSubmit() {
    setError(null);
    if (pwd.length < 8) return setError('Au moins 8 caractères.');
    if (pwd !== confirm) return setError('Les mots de passe ne correspondent pas.');
    setLoading(true);
    const res = await changePassword(pwd);
    if (!res.success) setError(res.message ?? 'Échec.');
    setLoading(false);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.eyebrow}>Sécurité</Text>
        <Text style={styles.title}>Choisis ton mot de passe</Text>
        <Text style={styles.subtitle}>
          Pour ta première connexion, définis un nouveau mot de passe personnel.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Nouveau mot de passe"
          placeholderTextColor="#888"
          secureTextEntry
          value={pwd}
          onChangeText={setPwd}
        />
        <TextInput
          style={styles.input}
          placeholder="Confirme le mot de passe"
          placeholderTextColor="#888"
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.button, (loading || mismatch) && styles.buttonDisabled]}
          disabled={loading || mismatch}
          onPress={handleSubmit}>
          <Text style={styles.buttonText}>{loading ? 'Enregistrement…' : 'Valider'}</Text>
        </Pressable>

        <Pressable onPress={logout} hitSlop={8}>
          <Text style={styles.link}>Se déconnecter</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#100307' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 18, gap: 12 },
  eyebrow: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.6,
  },
  title: { color: '#fff', fontSize: 26, fontWeight: '600' },
  subtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 8 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 15,
  },
  button: {
    backgroundColor: '#d11a2a',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  link: { color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center', marginTop: 10 },
  error: { color: '#ff5a5f', fontSize: 13 },
});
