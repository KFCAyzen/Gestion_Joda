import { useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, type Href } from 'expo-router';
import {
  Building2,
  ChevronRight,
  ClipboardList,
  Database,
  FileText,
  FolderOpen,
  GraduationCap,
  LogOut,
  Mail,
  MessageSquare,
  Settings2,
  Users,
  WalletCards,
  type LucideIcon,
} from 'lucide-react-native';

import { useAuth } from '@/lib/auth-context';
import { canAccess, roleLabel, type AdminModule } from '@/lib/access';
import {
  Avatar,
  Chip,
  GlassCard,
  IconBox,
  ListCard,
  ListRow,
  ScreenBackground,
  ScreenHeader,
  SectionLabel,
  ThemeToggle,
  useIconTint,
  useText,
  type IconTone,
} from '@/components/ui';
import { spacing, type Palette } from '@/theme/tokens';
import { useColors } from '@/theme/theme';

type Item = { module: AdminModule; label: string; sub: string; icon: LucideIcon; tone: IconTone; route: string };
type Group = { title: string; items: Item[] };

const GROUPS: Group[] = [
  {
    title: 'Opérations',
    items: [
      { module: 'candidatures', label: 'Candidatures', sub: 'Nouveaux dossiers à traiter', icon: FileText, tone: 'amber', route: '/(admin)/candidatures' },
      { module: 'etudiants', label: 'Étudiants', sub: 'Fiches & suivi', icon: GraduationCap, tone: 'blue', route: '/(admin)/etudiants' },
      { module: 'dossiers', label: 'Dossiers', sub: 'Workflow par étape', icon: FolderOpen, tone: 'mint', route: '/(admin)/dossiers' },
    ],
  },
  {
    title: 'Communication',
    items: [
      { module: 'messagerie', label: 'Messagerie', sub: 'Conversations étudiants', icon: MessageSquare, tone: 'red', route: '/(admin)/messagerie' },
      { module: 'newsletter', label: 'Newsletter', sub: 'Campagnes & audiences', icon: Mail, tone: 'purple', route: '/(admin)/newsletter' },
    ],
  },
  {
    title: 'Ressources',
    items: [
      { module: 'universites', label: 'Universités', sub: 'Partenaires par pays', icon: Building2, tone: 'blue', route: '/(admin)/universites' },
      { module: 'frais', label: 'Frais', sub: 'Tranches & échéances', icon: WalletCards, tone: 'amber', route: '/(admin)/frais' },
      { module: 'cours', label: 'Cours de langues', sub: 'Mandarin & anglais', icon: GraduationCap, tone: 'mint', route: '/(admin)/cours' },
    ],
  },
  {
    title: 'Ressources humaines',
    items: [{ module: 'rh', label: 'RH', sub: 'Employés, congés, paie, rapports', icon: ClipboardList, tone: 'red', route: '/(admin)/rh' }],
  },
  {
    title: 'Administration',
    items: [
      { module: 'utilisateurs', label: 'Utilisateurs', sub: 'Comptes & permissions', icon: Users, tone: 'blue', route: '/(admin)/utilisateurs' },
      { module: 'logs', label: "Logs d'activités", sub: 'Flux audité', icon: ClipboardList, tone: 'ghost', route: '/(admin)/logs' },
      { module: 'config_frais', label: 'Config. frais', sub: 'Montants, tranches, pénalités', icon: Settings2, tone: 'amber', route: '/(admin)/config-frais' },
    ],
  },
  {
    title: 'Système',
    items: [{ module: 'stockage', label: 'Stockage', sub: 'Usage & buckets', icon: Database, tone: 'purple', route: '/(admin)/stockage' }],
  },
];

export default function AdminPlus() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const T = useText();
  const iconTint = useIconTint();
  const { user, logout } = useAuth();
  const role = user?.role;

  function confirmLogout() {
    Alert.alert('Se déconnecter', 'Veux-tu te déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnexion', style: 'destructive', onPress: () => logout() },
    ]);
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScreenHeader eyebrow="Tous les modules" title="Plus" />

        <ScrollView contentContainerStyle={{ paddingBottom: 130, gap: spacing.cardGap }} showsVerticalScrollIndicator={false}>
          {/* Identité */}
          <GlassCard variant="strong" style={styles.identity}>
            <Avatar name={user?.name || 'Admin'} kind="staff" size={56} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.name} numberOfLines={1}>{user?.name || user?.username}</Text>
              <View style={{ marginTop: 6 }}>
                <Chip variant="live" label={roleLabel(role)} />
              </View>
            </View>
            <ThemeToggle />
          </GlassCard>

          {GROUPS.map((g) => {
            const items = g.items.filter((it) => canAccess(role, it.module));
            if (!items.length) return null;
            return (
              <View key={g.title} style={{ gap: 8 }}>
                <SectionLabel title={g.title} />
                <ListCard>
                  {items.map((it, i) => {
                    const Icon = it.icon;
                    return (
                      <ListRow key={it.module} last={i === items.length - 1} onPress={() => router.navigate(it.route as Href)}>
                        <IconBox tone={it.tone} size={40}>
                          <Icon size={18} color={iconTint[it.tone]} />
                        </IconBox>
                        <View style={{ flex: 1 }}>
                          <Text style={[T.t1, { fontSize: 14 }]}>{it.label}</Text>
                          <Text style={T.t3}>{it.sub}</Text>
                        </View>
                        <ChevronRight size={17} color={colors.ink35} />
                      </ListRow>
                    );
                  })}
                </ListCard>
              </View>
            );
          })}

          <ListCard>
            <ListRow onPress={confirmLogout} last>
              <IconBox tone="red" size={40}>
                <LogOut size={18} color={iconTint.red} />
              </IconBox>
              <View style={{ flex: 1 }}>
                <Text style={[T.t1, { fontSize: 14, color: colors.crimsonVivid }]}>Se déconnecter</Text>
              </View>
            </ListRow>
          </ListCard>
          <Text style={styles.version}>Joda Company · Admin v1.0</Text>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, paddingHorizontal: spacing.screenX },
    identity: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    name: { color: colors.text, fontSize: 18, fontWeight: '600' },
    version: { color: colors.ink35, fontSize: 11, textAlign: 'center', paddingVertical: 8 },
  });
