import { Pressable, StyleSheet, View } from 'react-native';
import { Bell } from 'lucide-react-native';

import { colors } from '@/theme/tokens';

/** Cloche `BellBtn` — bouton verre 44×44 avec point rouge si non-lu (handoff §Composants). */
export function BellBtn({ hasUnread = false, onPress }: { hasUnread?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={6} style={styles.btn}>
      <Bell size={19} color={colors.text} strokeWidth={1.8} />
      {hasUnread ? <View style={styles.dot} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: colors.glassLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.crimsonVivid,
    borderWidth: 1.5,
    borderColor: '#1a0509',
  },
});
