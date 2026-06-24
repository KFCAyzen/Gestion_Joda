import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowDownLeft, ArrowUpRight, TriangleAlert } from 'lucide-react-native';

import { useAccountingLedger } from '@/lib/hooks/use-admin';
import {
  GlassCard,
  IconBox,
  ScreenBackground,
  ScreenHeader,
  SegFilter,
  useIconTint,
  useText,
} from '@/components/ui';
import { spacing, type Palette } from '@/theme/tokens';
import { useColors } from '@/theme/theme';
import { fmtCompact, fmtFCFA, shortDate } from '@/lib/format';

const VIEWS = [
  { id: 'jour', label: 'Jour' },
  { id: 'semaine', label: 'Sem.' },
  { id: 'mois', label: 'Mois' },
  { id: 'trimestre', label: 'Trim.' },
  { id: 'annee', label: 'Année' },
];

export default function AdminCompta() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const T = useText();
  const iconTint = useIconTint();
  const { data, isLoading } = useAccountingLedger();
  const [view, setView] = useState('mois');
  const [filter, setFilter] = useState('tout');

  const rows = (data?.rows ?? []).filter((r) => filter === 'tout' || (filter === 'entrees' ? r.kind === 'in' : r.kind === 'out'));

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScreenHeader eyebrow="Livre comptable" title="Comptabilité" />

        {isLoading || !data ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 130, gap: spacing.cardGap }} showsVerticalScrollIndicator={false}>
            <SegFilter options={VIEWS} value={view} onChange={setView} />

            {/* Solde */}
            <GlassCard variant="strong">
              <Text style={T.eyebrow}>Solde</Text>
              <Text style={[styles.solde, { color: data.solde >= 0 ? colors.mint : colors.crimsonVivid }]}>
                {data.solde >= 0 ? '+' : '−'}
                {fmtFCFA(Math.abs(data.solde))} <Text style={styles.cur}>FCFA</Text>
              </Text>
              <View style={styles.flowRow}>
                <View style={[styles.flowBox, styles.flowIn]}>
                  <View style={styles.flowHead}>
                    <ArrowDownLeft size={12} color={colors.mint} />
                    <Text style={[T.t3, { color: colors.mint }]}>Entrées</Text>
                  </View>
                  <Text style={[styles.flowAmt, { color: colors.mint }]}>{fmtCompact(data.entrees)}</Text>
                </View>
                <View style={[styles.flowBox, styles.flowOut]}>
                  <View style={styles.flowHead}>
                    <ArrowUpRight size={12} color={colors.crimsonVivid} />
                    <Text style={[T.t3, { color: colors.crimsonVivid }]}>Sorties</Text>
                  </View>
                  <Text style={[styles.flowAmt, { color: colors.crimsonVivid }]}>{fmtCompact(data.sorties)}</Text>
                </View>
              </View>
            </GlassCard>

            {data.toValidate > 0 ? (
              <GlassCard style={styles.alertCard}>
                <IconBox tone="amber" size={40}>
                  <TriangleAlert size={18} color={iconTint.amber} />
                </IconBox>
                <View style={{ flex: 1 }}>
                  <Text style={T.t1}>{data.toValidate} sortie{data.toValidate > 1 ? 's' : ''} à valider</Text>
                  <Text style={T.t2}>Dépenses en attente de validation</Text>
                </View>
              </GlassCard>
            ) : null}

            <SegFilter
              options={[
                { id: 'tout', label: 'Tout' },
                { id: 'entrees', label: 'Entrées' },
                { id: 'sorties', label: 'Sorties' },
              ]}
              value={filter}
              onChange={setFilter}
            />

            <GlassCard>
              {rows.map((r, i) => (
                <View key={r.id} style={[styles.lrow, i < rows.length - 1 && styles.lrowBorder]}>
                  <View style={[styles.lk, r.kind === 'in' ? styles.lkIn : styles.lkOut]}>
                    {r.kind === 'in' ? <ArrowDownLeft size={15} color={colors.mint} /> : <ArrowUpRight size={15} color={colors.crimsonVivid} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[T.t1, { fontSize: 13.5 }]} numberOfLines={1}>{r.desc}</Text>
                    <Text style={T.t3}>
                      {shortDate(r.date)} · {r.cat}
                      {r.needsValidation ? ' · à valider' : ''}
                    </Text>
                  </View>
                  <Text style={[styles.la, { color: r.kind === 'in' ? colors.mint : colors.crimsonVivid }]}>
                    {r.kind === 'in' ? '+' : '−'}
                    {fmtFCFA(r.montant)}
                  </Text>
                </View>
              ))}
              {!rows.length ? <Text style={styles.empty}>Aucune écriture.</Text> : null}
            </GlassCard>
          </ScrollView>
        )}
      </SafeAreaView>
    </ScreenBackground>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, paddingHorizontal: spacing.screenX },
    solde: { fontSize: 32, fontWeight: '700', letterSpacing: -1, marginTop: 8 },
    cur: { fontSize: 13, color: colors.ink50, fontWeight: '400' },
    flowRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
    flowBox: { flex: 1, borderRadius: 12, padding: 10, borderWidth: 1 },
    flowIn: { backgroundColor: 'rgba(52,217,168,0.10)', borderColor: 'rgba(52,217,168,0.25)' },
    flowOut: { backgroundColor: colors.redGlass, borderColor: colors.redLine },
    flowHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    flowAmt: { fontSize: 15, fontWeight: '700', marginTop: 4 },
    alertCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: 'rgba(251,191,36,0.32)' },
    lrow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
    lrowBorder: { borderBottomWidth: 1, borderBottomColor: colors.glassLine },
    lk: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    lkIn: { backgroundColor: 'rgba(52,217,168,0.13)' },
    lkOut: { backgroundColor: colors.redGlass },
    la: { fontSize: 14, fontWeight: '700' },
    empty: { color: colors.ink35, fontSize: 13, textAlign: 'center', paddingVertical: 30 },
  });
