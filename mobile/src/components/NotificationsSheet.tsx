import { router } from 'expo-router';
import { BellOff, CheckCheck } from 'lucide-react-native';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth-context';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  type AppNotification,
} from '@/lib/hooks/use-notifications';
import { notificationTarget } from '@/lib/notification-visual';
import { NotificationCard } from './NotificationCard';

const PREVIEW = 6;

/** Feuille basse ouverte depuis la cloche : aperçu + lien vers l'écran complet. */
export function NotificationsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { data, isLoading } = useNotifications(user?.id);
  const markRead = useMarkNotificationRead(user?.id);
  const markAll = useMarkAllNotificationsRead(user?.id);

  const items = (data ?? []).slice(0, PREVIEW);
  const hasUnread = (data ?? []).some((n) => !n.read);

  const handleTap = (n: AppNotification) => {
    if (!n.read) markRead.mutate(n.id);
    onClose();
    const target = notificationTarget(n.type);
    if (target) router.navigate(target as never);
  };

  const seeAll = () => {
    onClose();
    // Route générée par expo-router au démarrage (src/app/notifications.tsx).
    router.navigate('/notifications' as never);
  };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 justify-end bg-black/60">
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="max-h-[80%] rounded-t-[28px] border-t border-white/10 bg-[#160409] pt-3">
          <View className="mb-3 h-[5px] w-10 self-center rounded-full bg-white/15" />
          <View className="flex-row items-center justify-between px-5 pb-3">
            <Text className="text-[21px] font-bold text-white">Notifications</Text>
            {hasUnread ? (
              <Pressable
                onPress={() => markAll.mutate()}
                className="flex-row items-center gap-1.5 px-2 py-1.5 active:opacity-70">
                <CheckCheck size={15} color="#ff5a5f" />
                <Text className="text-[13px] font-semibold text-crimson-vivid">Tout lire</Text>
              </Pressable>
            ) : null}
          </View>

          {isLoading ? (
            <View className="items-center py-12">
              <ActivityIndicator color="#ff5a5f" />
            </View>
          ) : items.length === 0 ? (
            <View className="items-center gap-2 py-12">
              <BellOff size={34} color="rgba(255,255,255,0.35)" />
              <Text className="text-[14px] text-white/50">Aucune notification</Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={{
                paddingHorizontal: 20,
                paddingBottom: Math.max(insets.bottom, 20) + 8,
                gap: 10,
              }}
              showsVerticalScrollIndicator={false}>
              {items.map((n) => (
                <NotificationCard key={n.id} notification={n} onPress={() => handleTap(n)} />
              ))}
              <Pressable onPress={seeAll} className="mt-1 items-center py-3 active:opacity-70">
                <Text className="text-[13px] font-semibold text-crimson-vivid">
                  Voir toutes les notifications
                </Text>
              </Pressable>
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
