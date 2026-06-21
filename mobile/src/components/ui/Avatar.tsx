import { StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { gradients } from '@/theme/tokens';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Avatar `pav` — initiales sur dégradé selon le rôle. */
export function Avatar({
  name,
  size = 44,
  kind = 'agent',
}: {
  name: string;
  size?: number;
  kind?: 'agent' | 'student' | 'staff';
}) {
  return (
    <LinearGradient
      colors={kind === 'student' ? gradients.studentAvatar : gradients.agentAvatar}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.base, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.text, { fontSize: size * 0.36 }]}>{initials(name)}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff', fontWeight: '600' },
});
