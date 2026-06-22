import { useMemo, useState } from 'react';
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
import { type Palette } from '@/theme/tokens';
import { useColors } from '@/theme/theme';

export default function SignInScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
            placeholderTextColor={colors.ink35}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={identifier}
            onChangeText={setIdentifier}
          />
          <TextInput
            style={styles.input}
            placeholder="Mot de passe"
            placeholderTextColor={colors.ink35}
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

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgBase },
    flex: { flex: 1 },
    inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 18, gap: 12 },
    eyebrow: {
      color: colors.crimsonVivid,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1.6,
    },
    title: { color: colors.text, fontSize: 28, fontWeight: '600' },
    subtitle: { color: colors.ink70, fontSize: 14, marginBottom: 8 },
    input: {
      backgroundColor: colors.glass,
      borderColor: colors.glassLine,
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
      color: colors.text,
      fontSize: 15,
    },
    button: {
      backgroundColor: colors.crimsonDeep,
      borderRadius: 14,
      paddingVertical: 15,
      alignItems: 'center',
      marginTop: 4,
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
    link: { color: colors.ink70, fontSize: 13, textAlign: 'center', marginTop: 10 },
    error: { color: colors.crimsonVivid, fontSize: 13 },
    notice: { color: colors.mint, fontSize: 13 },
  });
