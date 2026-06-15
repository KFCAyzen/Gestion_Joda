import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth-context';

export default function SignInScreen() {
  const { login, forgotPassword } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleLogin() {
    setLoading(true);
    setError(null);
    setNotice(null);
    const res = await login(identifier, password);
    if (!res.success) setError(res.message ?? 'Connexion impossible.');
    setLoading(false);
  }

  async function handleForgot() {
    if (!identifier.trim()) {
      setError('Saisis ton identifiant ou ton email d’abord.');
      return;
    }
    setError(null);
    await forgotPassword(identifier);
    setNotice('Si le compte existe, un mot de passe temporaire a été envoyé.');
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inner}>
          <Text style={styles.eyebrow}>Joda Company</Text>
          <Text style={styles.title}>Portail étudiant</Text>
          <Text style={styles.subtitle}>Connecte-toi pour suivre ton dossier de bourse.</Text>

          <TextInput
            style={styles.input}
            placeholder="Identifiant ou email"
            placeholderTextColor="#888"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={identifier}
            onChangeText={setIdentifier}
          />
          <TextInput
            style={styles.input}
            placeholder="Mot de passe"
            placeholderTextColor="#888"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={handleLogin}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            disabled={loading}
            onPress={handleLogin}>
            <Text style={styles.buttonText}>{loading ? 'Connexion…' : 'Se connecter'}</Text>
          </Pressable>

          <Pressable onPress={handleForgot} hitSlop={8}>
            <Text style={styles.link}>Mot de passe oublié ?</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#100307' },
  flex: { flex: 1 },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 18, gap: 12 },
  eyebrow: {
    color: '#ff5a5f',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.6,
  },
  title: { color: '#fff', fontSize: 28, fontWeight: '600' },
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
  notice: { color: '#34d9a8', fontSize: 13 },
});
