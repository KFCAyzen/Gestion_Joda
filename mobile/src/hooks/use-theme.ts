/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useTheme() {
  const scheme = useColorScheme();
  // useColorScheme() renvoie 'light' | 'dark' | null | undefined : on retombe sur 'light'.
  const theme = scheme ?? 'light';

  return Colors[theme];
}
