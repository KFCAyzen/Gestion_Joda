import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Bell, CheckCheck, CreditCard, FileText, TriangleAlert } from 'lucide-react-native';

import { useAuth } from '@/lib/auth-context';
import { useAdminNotifications, useMarkAllNotificationsRead, type AppNotification } from '@/lib/hooks/use-admin';
import { Button, GlassCard, IconBox, ScreenBackground, ScreenHeader, iconTint, text as T, useToast, type IconTone } from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';
import { relTime } from '@/lib/format';

function groupByDay(list: AppNotification[]) {
  const groups: Record<string, AppNotification[]> = {};
  for (const n of list) {
    const d = new Date(n.created_at);
    const today = new Date();
    const key = d.toDateString() === today.toDateString() ? "AUJOURD'HUI" : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' }).toUpperCase();
    (groups[key] ||= []).push(n);
  }
  return groups;
}

function toneFor(type: string): { tone: IconTone; icon: typeof Bell } {
  if (type.includes('paiement') || type.includes('payment')) return { tone: 'amber', icon: CreditCard };
  if (type.includes('alert') || type.includes('manquant')) return { tone: 'red', icon: TriangleAlert };
  if (type.includes('doc')) return { tone: 'mint', icon: FileText };
  return { tone: 'blue', icon: Bell };
}

export default function AdminNotifications() {
  const { user } = useAuth();
  const { data, isLoading } = useAdminNotifications(user?.id);
  const markAll = useMarkAllNotificationsRead(user?.id);
  const toast = useToast();
  const groups = groupByDay(data ?? []);

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScreenHeader eyebrow="Centre d'alertes" title="Notifications" sm onBack={() => router.back()} />
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 60, gap: spacing.cardGap }} showsVerticalScrollIndicator={false}>
            <Button
              label="Tout marquer comme lu"
              variant="glass"
              size="sm"
              icon={<CheckCheck size={16} color={colors.ink70} />}
              onPress={async () => {
                await markAll.mutateAsync();
                toast('Notifications marquées comme lues');
              }}
            />
            {Object.entries(groups).map(([day, items]) => (
              <View key={day} style={{ gap: 8 }}>
                <Text style={styles.dayLabel}>{day}</Text>
                <GlassCard>
                  {items.map((n, i) => {
                    const { tone, icon: Icon } = toneFor(n.type);
                    return (
                      <View key={n.id} style={[styles.row, i < items.length - 1 && styles.rowBorder]}>
                        <IconBox tone={tone} size={38}>
                          <Icon size={17} color={iconTint[tone]} />
                        </IconBox>
                        <View style={{ flex: 1 }}>
                          <Text style={[T.t1, { fontSize: 14 }, !n.read && { color: '#fff' }]}>{n.titre}</Text>
                          <Text style={T.t2}>{n.message}</Text>
                          <Text style={T.t3}>{relTime(n.created_at)}</Text>
                        </View>
                        {!n.read ? <View style={styles.dot} /> : null}
                      </View>
                    );
                  })}
                </GlassCard>
              </View>
            ))}
            {!data?.length ? <Text style={styles.empty}>Aucune notification.</Text> : null}
          </ScrollView>
        )}
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.screenX },
  dayLabel: { color: colors.ink35, fontSize: 10.5, fontWeight: '700', letterSpacing: 1.4 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 11 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.crimsonVivid, marginTop: 6 },
  empty: { color: colors.ink35, fontSize: 13, textAlign: 'center', paddingVertical: 40 },
});
