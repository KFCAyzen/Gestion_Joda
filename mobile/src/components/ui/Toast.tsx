import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, shadow } from '@/theme/tokens';
// Toast est monté à la racine (forcée sombre) : on garde la palette sombre statique.

type ToastFn = (message: string) => void;

const ToastContext = createContext<ToastFn>(() => {});

/** Toast léger en bas d'écran (port du `Toast` du handoff staff/admin). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const show = useCallback<ToastFn>(
    (message) => {
      setMsg(message);
      if (timer.current) clearTimeout(timer.current);
      Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() =>
          setMsg(null),
        );
      }, 2200);
    },
    [opacity],
  );

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {msg ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.toast, { opacity, bottom: insets.bottom + 96 }]}>
          <Text style={styles.text}>{msg}</Text>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastFn {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 40,
    right: 40,
    alignItems: 'center',
    backgroundColor: 'rgba(20,5,8,0.92)',
    borderWidth: 1,
    borderColor: colors.glassLine2,
    borderRadius: radius.pill,
    paddingVertical: 11,
    paddingHorizontal: 18,
    ...shadow.card,
  },
  text: { color: '#fff', fontSize: 13.5, fontWeight: '600', textAlign: 'center' },
});
