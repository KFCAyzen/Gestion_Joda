import { Pressable, Text, View } from 'react-native';

import type { AppNotification } from '@/lib/hooks/use-notifications';
import { notificationVisual, relativeTime } from '@/lib/notification-visual';

/** Ligne de notification réutilisée par la feuille et l'écran complet. */
export function NotificationCard({
  notification,
  onPress,
  onLongPress,
}: {
  notification: AppNotification;
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  const { Icon, color, bg } = notificationVisual(notification.type);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      className={`flex-row gap-3 rounded-2xl border border-white/10 p-3.5 active:opacity-80 ${
        notification.read ? 'bg-white/[0.04]' : 'bg-crimson/[0.08]'
      }`}>
      <View className={`h-[38px] w-[38px] items-center justify-center rounded-xl ${bg}`}>
        <Icon size={19} color={color} strokeWidth={1.9} />
      </View>
      <View className="flex-1">
        <View className="flex-row items-center justify-between gap-2">
          <Text numberOfLines={1} className="flex-1 text-[14px] font-semibold text-white">
            {notification.titre}
          </Text>
          <View className="flex-row items-center gap-1.5">
            {notification.read ? null : <View className="h-2 w-2 rounded-full bg-crimson-vivid" />}
            <Text className="text-[11px] text-white/40">{relativeTime(notification.created_at)}</Text>
          </View>
        </View>
        <Text numberOfLines={2} className="mt-0.5 text-[12.5px] leading-[18px] text-white/55">
          {notification.message}
        </Text>
      </View>
    </Pressable>
  );
}
