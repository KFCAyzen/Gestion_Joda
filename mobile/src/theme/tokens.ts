/**
 * Tokens de design — port de `design_handoff_portail_etudiant_mobile/pm.css`.
 * Source de vérité visuelle du portail étudiant mobile. (Étape 3.)
 */
import type { TextStyle, ViewStyle } from 'react-native';

export const colors = {
  bgBase: '#100307',
  bgDeep: '#0c0205',
  bgDeep2: '#240709',
  bgDeep3: '#160409',

  crimson: '#ef4444',
  crimsonVivid: '#ff5a5f',
  crimsonDeep: '#d11a2a',
  crimsonDeep2: '#b91c1c',
  rose: '#fb7185',

  mint: '#34d9a8',
  mintDeep: '#0f8f6e',
  amber: '#fbbf24',
  amberDeep: '#b45309',
  blue: '#60a5fa',
  blueDeep: '#2563eb',
  purple: '#a78bfa',
  purpleDeep: '#7c3aed',

  text: '#ffffff',
  ink70: 'rgba(255,255,255,0.70)',
  ink50: 'rgba(255,255,255,0.50)',
  ink35: 'rgba(255,255,255,0.35)',

  glass: 'rgba(255,255,255,0.055)',
  glass2: 'rgba(255,255,255,0.085)',
  glassLine: 'rgba(255,255,255,0.12)',
  glassLine2: 'rgba(255,255,255,0.18)',
  redGlass: 'rgba(239,68,68,0.13)',
  redLine: 'rgba(239,68,68,0.32)',
  track: 'rgba(255,255,255,0.08)',
} as const;

/** Dégradés réutilisables (expo-linear-gradient attend un tuple de couleurs). */
export const gradients = {
  crimson: ['#ff5a5f', '#d11a2a'] as const,
  crimsonButton: ['#ff5a5f', '#d11a2a'] as const,
  agentAvatar: ['#fb7185', '#e11d2a'] as const,
  staffAvatar: ['#fb7185', '#e11d2a'] as const,
  studentAvatar: ['#60a5fa', '#2563eb'] as const,
  mint: ['#34d9a8', '#0f8f6e'] as const,
  purple: ['#a78bfa', '#7c3aed'] as const,
};

export const radius = {
  xl: 30,
  lg: 22,
  md: 16,
  sm: 12,
  pill: 999,
  student: 28, // --student-radius 1.75rem
} as const;

export const spacing = {
  screenX: 18,
  cardGap: 13,
  rowGap: 8,
  heroPad: 20,
  cardPad: 16,
  rowPad: 12,
} as const;

export const fontSize = {
  screenTitle: 25,
  bigAmount: 42,
  ringValue: 32,
  cardTitle: 15,
  body: 13.5,
  meta: 12,
  eyebrow: 10.5,
} as const;

/** Ombres (iOS shadow* + Android elevation). */
export const shadow: Record<'primary' | 'tabBar' | 'card', ViewStyle> = {
  primary: {
    shadowColor: colors.crimson,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  tabBar: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.5,
    shadowRadius: 25,
    elevation: 16,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 4,
  },
};

export const eyebrow: TextStyle = {
  fontSize: fontSize.eyebrow,
  fontWeight: '700',
  textTransform: 'uppercase',
  letterSpacing: 1.6,
  color: colors.ink50,
};
