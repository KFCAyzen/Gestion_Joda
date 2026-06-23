import { router } from 'expo-router';
import { BellOff, CheckCheck, ChevronLeft } from 'lucide-react-native';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenBackground } from '@/components/ui';
import { NotificationCard } from '@/components/NotificationCard';
import { useAuth } from '@/lib/auth-context';
import {
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useNotificationsRealtime,
  type AppNotification,
} from '@/lib/hooks/use-notifications';
import { notificationTarget } from '@/lib/notification-visual';

/** Écran complet des notifications (pull-to-refresh, tout marquer lu, appui long = supprimer). */
export default function NotificationsScreen() {
  const { user } = useAuth();
  const userId = user?.id;
  useNotificationsRealtime(userId);

  const { data, isLoading, isRefetching, refetch } = useNotifications(userId);
  const markRead = useMarkNotificationRead(userId);
  const markAll = useMarkAllNotificationsRead(userId);
  const remove = useDeleteNotification(userId);

  const items = data ?? [];
  const hasUnread = items.some((n) => !n.read);

  const handleTap = (n: AppNotification) => {
    if (!n.read) markRead.mutate(n.id);
    const target = notificationTarget(n.type);
    if (target) router.navigate(target as never);
  };

  const handleLongPress = (n: AppNotification) => {
    Alert.alert('Supprimer', 'Supprimer cette notification ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => remove.mutate(n.id) },
    ]);
  };

  return (
    <ScreenBackground>
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, paddingHorizontal: 18 }}>
        <View className="flex-row items-center gap-3 py-2.5">
          <Pressable
            onPress={() => router.back()}
            hitSlop={6}
            className="h-10 w-10 items-center justify-center rounded-[13px] border border-white/10 bg-white/[0.07]">
            <ChevronLeft size={20} color="#fff" />
          </Pressable>
          <Text className="flex-1 text-[21px] font-semibold text-white">Notifications</Text>
          {hasUnread ? (
            <Pressable
              onPress={() => markAll.mutate()}
              hitSlop={6}
              className="flex-row items-center gap-1.5 px-2 py-1.5 active:opacity-70">
              <CheckCheck size={16} color="#ff5a5f" />
              <Text className="text-[13px] font-semibold text-crimson-vivid">Tout lire</Text>
            </Pressable>
          ) : null}
        </View>

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 48 }} color="#ff5a5f" />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(n) => n.id}
            renderItem={({ item }) => (
              <NotificationCard
                notification={item}
                onPress={() => handleTap(item)}
                onLongPress={() => handleLongPress(item)}
              />
            )}
            contentContainerStyle={{ paddingVertical: 12, paddingBottom: 120, gap: 10 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View className="items-center gap-2 py-24">
                <BellOff size={36} color="rgba(255,255,255,0.35)" />
                <Text className="text-[14px] text-white/50">Aucune notification</Text>
                <Text className="text-[12px] text-white/35">
                  Tu seras prévenu ici dès qu&apos;il y a du nouveau.
                </Text>
              </View>
            }
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={() => void refetch()}
                tintColor="#ff5a5f"
              />
            }
          />
        )}
      </SafeAreaView>
    </ScreenBackground>
  );
}
