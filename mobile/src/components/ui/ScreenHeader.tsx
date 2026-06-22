import { useMemo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';

import { fontSize, type Palette } from '@/theme/tokens';
import { useColors } from '@/theme/theme';

/** En-tête d'écran `PHeader` — eyebrow muted + titre, action à droite. `onBack` ajoute le chevron retour, `sm` réduit le titre (écrans de détail). */
export function ScreenHeader({
  eyebrow,
  title,
  right,
  onBack,
  sm,
}: {
  eyebrow: string;
  title: string;
  right?: ReactNode;
  onBack?: () => void;
  sm?: boolean;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.row}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={8} style={styles.back}>
          <ChevronLeft size={20} color={colors.text} />
        </Pressable>
      ) : null}
      <View style={styles.left}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={[styles.title, sm && styles.titleSm]} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {right}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 6, paddingBottom: 16 },
    back: {
      width: 38,
      height: 38,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.glassLine,
      backgroundColor: colors.glass2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    left: { flex: 1 },
    eyebrow: {
      fontSize: fontSize.eyebrow,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1.6,
      color: colors.ink50,
    },
    title: { color: colors.text, fontSize: fontSize.screenTitle, fontWeight: '600', marginTop: 3, letterSpacing: -0.5 },
    titleSm: { fontSize: 20 },
  });
