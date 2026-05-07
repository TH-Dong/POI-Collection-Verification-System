import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchDisputes } from '../api/dispute';
import type { RootStackParamList } from '../types/navigation';
import type { DisputeSummary } from '../types/dispute';
import { getPoiStatusMeta } from '../utils/poi';

type Props = NativeStackScreenProps<RootStackParamList, 'VerifierDisputeList'>;

const statusMeta: Record<DisputeSummary['disputeStatus'], { label: string; accent: string; soft: string }> = {
  DISPUTING: { label: '争议处理中', accent: '#C26122', soft: '#FFF3E8' },
  ARBITRATING: { label: '最终裁定中', accent: '#2759D8', soft: '#E8F4FF' },
  FINALIZED: { label: '已最终确认', accent: '#277C68', soft: '#EAF8F3' },
};

export default function VerifierDisputeListScreen({ navigation }: Props) {
  const [items, setItems] = useState<DisputeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorText, setErrorText] = useState('');

  const stats = useMemo(() => ({
    total: items.length,
    disputing: items.filter((item) => item.disputeStatus === 'DISPUTING').length,
    arbitrating: items.filter((item) => item.disputeStatus === 'ARBITRATING').length,
  }), [items]);

  const loadItems = async (refresh = false) => {
    try {
      setErrorText('');
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const data = await fetchDisputes();
      setItems(data.filter((item) => item.disputeStatus !== 'FINALIZED'));
    } catch (_error) {
      setErrorText('获取争议列表失败，请稍后重试');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      void loadItems();
    });
    void loadItems();
    return unsubscribe;
  }, [navigation]);

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.centered}>
          <ActivityIndicator size="small" color="#3F3F46" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id.toString()}
        refreshing={refreshing}
        onRefresh={() => void loadItems(true)}
        contentContainerStyle={styles.content}
        ListHeaderComponent={(
          <View style={styles.header}>
            <Text style={styles.title}>争议处理</Text>
            <Text style={styles.subtitle}>先补充事实依据，确实无法达成一致时再升级到最终裁定。</Text>

            <View style={styles.metricRow}>
              <MetricCard label="当前待跟进" value={String(stats.total)} />
              <MetricCard label="待补充说明" value={String(stats.disputing)} />
              <MetricCard label="已升级裁定" value={String(stats.arbitrating)} />
            </View>

            {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
          </View>
        )}
        ListEmptyComponent={(
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>当前没有待处理争议</Text>
            <Text style={styles.emptyDesc}>采集者发起异议后，会在这里展示。</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const meta = statusMeta[item.disputeStatus];
          const poiMeta = getPoiStatusMeta(item.poiStatus);
          return (
            <Pressable
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => navigation.navigate('VerifierDisputeDetail', { disputeId: item.id })}
            >
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.poiName}</Text>
                <View style={[styles.badge, { backgroundColor: meta.soft }]}>
                  <Text style={[styles.badgeText, { color: meta.accent }]}>{meta.label}</Text>
                </View>
              </View>

              <View style={styles.inlineMetaRow}>
                <Text style={styles.cardMeta}>发起人 {item.initiatorName}</Text>
                <Text style={[styles.poiBadge, { color: poiMeta.badgeText }]}>{poiMeta.label}</Text>
              </View>

              <Text style={styles.cardDesc} numberOfLines={2}>{item.latestComment || '暂无最新说明'}</Text>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FBFCFD' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 32 },
  header: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: '700', color: '#3F3F46', letterSpacing: -0.5 },
  subtitle: { marginTop: 8, fontSize: 14, color: '#71717A', lineHeight: 20 },
  metricRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  metricCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E5E9F2', padding: 14 },
  metricLabel: { fontSize: 12, color: '#71717A' },
  metricValue: { marginTop: 8, fontSize: 26, fontWeight: '700', color: '#3F3F46' },
  errorText: { color: '#E5484D', fontSize: 14, marginTop: 14 },
  emptyBox: { marginHorizontal: 20, marginTop: 20, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E5E9F2', padding: 24, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#3F3F46' },
  emptyDesc: { marginTop: 8, fontSize: 13, color: '#71717A' },
  card: { marginHorizontal: 20, marginBottom: 12, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E5E9F2', padding: 16 },
  cardPressed: { backgroundColor: '#FBFCFD' },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  cardTitle: { flex: 1, fontSize: 17, fontWeight: '600', color: '#3F3F46' },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  inlineMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, gap: 12 },
  cardMeta: { fontSize: 13, color: '#71717A' },
  poiBadge: { fontSize: 12, fontWeight: '600' },
  cardDesc: { marginTop: 10, fontSize: 14, color: '#52525B', lineHeight: 20 },
});
