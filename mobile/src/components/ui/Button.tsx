import { useMemo, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { gradients, radius, shadow, type Palette } from '@/theme/tokens';
import { useColors } from '@/theme/theme';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'glass' | 'mint' | 'danger';
  size?: 'md' | 'sm';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  /** Icône optionnelle affichée avant le label (handoff : `.pbtn` avec icône). */
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Bouton `.pbtn` — primary (dégradé crimson) ou glass. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  fullWidth,
  icon,
  style,
}: Props) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const height = size === 'sm' ? 38 : 48;
  const br = size === 'sm' ? radius.sm : radius.md;
  const dim = disabled || loading;

  const onGradient = variant === 'primary' || variant === 'mint' || variant === 'danger';

  const content = loading ? (
    <ActivityIndicator color={onGradient ? '#fff' : colors.ink70} />
  ) : (
    <View style={styles.inner}>
      {icon}
      <Text style={[styles.label, variant === 'glass' && styles.labelGlass]}>{label}</Text>
    </View>
  );

  if (onGradient) {
    const palette =
      variant === 'mint'
        ? gradients.mint
        : variant === 'danger'
          ? (['#ff6b6b', '#b91c1c'] as const)
          : gradients.crimsonButton;
    return (
      <Pressable
        onPress={onPress}
        disabled={dim}
        style={[fullWidth && styles.fullWidth, dim && styles.dim, style]}>
        <LinearGradient
          colors={palette}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.base, { height, borderRadius: br }, variant === 'primary' && shadow.primary]}>
          {content}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={dim}
      style={[fullWidth && styles.fullWidth, dim && styles.dim, style]}>
      <View style={[styles.base, styles.glass, { height, borderRadius: br }]}>{content}</View>
    </Pressable>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    base: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
    inner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    glass: { backgroundColor: colors.glass2, borderWidth: 1, borderColor: colors.glassLine2 },
    fullWidth: { alignSelf: 'stretch' },
    dim: { opacity: 0.6 },
    label: { color: '#fff', fontSize: 14.5, fontWeight: '600' },
    labelGlass: { color: colors.ink70 },
  });
