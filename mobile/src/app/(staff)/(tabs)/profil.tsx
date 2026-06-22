import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, type Href } from 'expo-router';
import { Bell, ChevronRight, ClipboardList, Globe, Lock, LogOut, Moon, Shield, WalletCards } from 'lucide-react-native';

import { useAuth } from '@/lib/auth-context';
import { useStaffBadges, useStaffDossiers } from '@/lib/hooks/use-staff';
import {
  Avatar,
  Chip,
  CountBadge,
  GlassCard,
  IconBox,
  ListCard,
  ListRow,
  ScreenBackground,
  ScreenHeader,
  SectionLabel,
  StatTile,
  Toggle,
  useIconTint,
  useText,
  useToast,
  type IconTone,
} from '@/components/ui';
import { spacing, type Palette } from '@/theme/tokens';
import { useColors, useThemePref } from '@/theme/theme';

const ROLE_LABEL: Record<string, string> = {
  agent: 'Conseiller / Agent',
  user: 'Membre de l’équipe',
  supervisor: 'Superviseur',
  admin: 'Administrateur',
  super_admin: 'Super administrateur',
};

export default function StaffProfil() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const T = useText();
  const iconTint = useIconTint();
  const { mode, setPref } = useThemePref();
  const { user, logout } = useAuth();
  const { data: badges } = useStaffBadges(user?.id);
  const { data: dossiers } = useStaffDossiers();
  const toast = useToast();
  const [notif, setNotif] = useState(true);

  const stats = useMemo(() => {
    const list = dossiers ?? [];
    const followed = list.length;
    const done = list.filter((d) => d.bucket === 'done').length;
    const rate = followed ? Math.round((done / followed) * 100) : 0;
    return { followed, rate };
  }, [dossiers]);

  function confirmLogout() {
    Alert.alert('Se déconnecter', 'Veux-tu te déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnexion', style: 'destructive', onPress: () => logout() },
    ]);
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScreenHeader eyebrow="Mon espace" title="Profil" />

        <ScrollView contentContainerStyle={{ paddingBottom: 130, gap: spacing.cardGap }} showsVerticalScrollIndicator={false}>
          {/* Identité */}
          <GlassCard variant="strong" style={styles.identity}>
            <Avatar name={user?.name || 'Agent'} kind="staff" size={62} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.name} numberOfLines={1}>{user?.name || user?.username}</Text>
              <Text style={T.t2}>{ROLE_LABEL[user?.role ?? ''] ?? 'Agent'}</Text>
              <View style={{ marginTop: 7 }}>
                <Chip variant="live" label="Joda Company" />
              </View>
            </View>
          </GlassCard>

          {/* Stats */}
          <View style={styles.kgrid}>
            <StatTile value={String(stats.followed)} label="Dossiers suivis" />
            <StatTile value={`${stats.rate}%`} label="Taux d'aboutissement" valueColor={colors.mint} />
          </View>

          {/* Validation & équipe */}
          <SectionLabel title="Validation & équipe" />
          <ListCard>
            <Row
              tone="red"
              icon={<ClipboardList size={17} color={iconTint.red} />}
              label="Valider les rapports"
              sub={`${badges?.payments != null ? '' : ''}rapports d'équipe`}
              right={<ChevronRight size={17} color={colors.ink35} />}
              onPress={() => router.navigate('/(staff)/rapports' as Href)}
            />
            <Row
              tone="amber"
              icon={<WalletCards size={17} color={iconTint.amber} />}
              label="Paiements à valider"
              sub={`${badges?.payments ?? 0} déclaration(s)`}
              right={badges?.payments ? <CountBadge count={badges.payments} color={colors.amber} /> : <ChevronRight size={17} color={colors.ink35} />}
              onPress={() => router.navigate('/(staff)/(tabs)/paiements' as Href)}
              last
            />
          </ListCard>

          {/* Préférences */}
          <SectionLabel title="Préférences" />
          <ListCard>
            <Row tone="ghost" icon={<Bell size={17} color={colors.ink70} />} label="Notifications" right={<Toggle on={notif} onPress={() => setNotif((v) => !v)} />} />
            <Row tone="ghost" icon={<Moon size={17} color={colors.ink70} />} label="Thème sombre" right={<Toggle on={mode === 'dark'} onPress={() => setPref(mode === 'dark' ? 'light' : 'dark')} />} />
            <Row tone="ghost" icon={<Globe size={17} color={colors.ink70} />} label="Langue" right={<Text style={T.t2}>Français</Text>} onPress={() => toast('Choix de langue à venir')} last />
          </ListCard>

          {/* Compte */}
          <SectionLabel title="Compte" />
          <ListCard>
            <Row tone="ghost" icon={<Lock size={17} color={colors.ink70} />} label="Sécurité & mot de passe" right={<ChevronRight size={17} color={colors.ink35} />} onPress={() => toast('Sécurité à venir')} />
            <Row tone="ghost" icon={<Shield size={17} color={colors.ink70} />} label="Confidentialité" right={<ChevronRight size={17} color={colors.ink35} />} onPress={() => toast('Confidentialité à venir')} />
            <Row tone="red" icon={<LogOut size={17} color={iconTint.red} />} label="Se déconnecter" danger right={<View />} onPress={confirmLogout} last />
          </ListCard>

          <Text style={styles.version}>Joda Company · Staff v1.0</Text>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

function Row({
  tone,
  icon,
  label,
  sub,
  right,
  onPress,
  danger,
  last,
}: {
  tone: IconTone;
  icon: React.ReactNode;
  label: string;
  sub?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  const colors = useColors();
  const T = useText();
  return (
    <ListRow onPress={onPress} last={last}>
      <IconBox tone={tone} size={38}>
        {icon}
      </IconBox>
      <View style={{ flex: 1 }}>
        <Text style={[T.t1, { fontSize: 14 }, danger && { color: colors.crimsonVivid }]}>{label}</Text>
        {sub ? <Text style={T.t3}>{sub}</Text> : null}
      </View>
      {right}
    </ListRow>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, paddingHorizontal: spacing.screenX },
    identity: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    name: { color: colors.text, fontSize: 18, fontWeight: '600' },
    kgrid: { flexDirection: 'row', gap: 10 },
    version: { color: colors.ink35, fontSize: 11, textAlign: 'center', paddingVertical: 8 },
  });
