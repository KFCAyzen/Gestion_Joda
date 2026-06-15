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

import { colors, gradients, radius, shadow } from '@/theme/tokens';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'glass';
  size?: 'md' | 'sm';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
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
  style,
}: Props) {
  const height = size === 'sm' ? 38 : 48;
  const br = size === 'sm' ? radius.sm : radius.md;
  const dim = disabled || loading;

  const content = loading ? (
    <ActivityIndicator color={variant === 'primary' ? '#fff' : colors.ink70} />
  ) : (
    <Text style={[styles.label, variant === 'glass' && styles.labelGlass]}>{label}</Text>
  );

  if (variant === 'primary') {
    return (
      <Pressable
        onPress={onPress}
        disabled={dim}
        style={[fullWidth && styles.fullWidth, dim && styles.dim, style]}>
        <LinearGradient
          colors={gradients.crimsonButton}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.base, { height, borderRadius: br }, shadow.primary]}>
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

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  glass: { backgroundColor: colors.glass2, borderWidth: 1, borderColor: colors.glassLine2 },
  fullWidth: { alignSelf: 'stretch' },
  dim: { opacity: 0.6 },
  label: { color: '#fff', fontSize: 14.5, fontWeight: '600' },
  labelGlass: { color: colors.ink70 },
});
