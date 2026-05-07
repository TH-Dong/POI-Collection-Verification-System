import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchVerifierPendingPois } from '../api/poi';
import type { PoiSummary } from '../types/poi';
import type { RootStackParamList } from '../types/navigation';
import { getPoiStatusMeta } from '../utils/poi';

type Props = NativeStackScreenProps<RootStackParamList, 'VerifierPoiList'>;

export default function VerifierPoiListScreen({ navigation }: Props) {
  const [pois, setPois] = useState<PoiSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorText, setErrorText] = useState('');

  const stats = useMemo(() => {
    return {
      total: pois.length,
      submitted: pois.filter((item) => item.status === 'SUBMITTED').length,
      resubmitted: pois.filter((item) => item.status === 'RESUBMITTED').length,
    };
  }, [pois]);

  const loadPois = async (refresh = false) => {
    try {
      setErrorText('');
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const data = await fetchVerifierPendingPois();
      setPois(data);
    } catch (_error) {
      setErrorText('获取待核验列表失败，请重试');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      void loadPois();
    });
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
        data={pois}
        keyExtractor={(item) => item.id.toString()}
        refreshing={refreshing}
        onRefresh={() => void loadPois(true)}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>待核验队列</Text>
                <Text style={styles.subtitle}>优先处理首次提交，再处理整改复核。</Text>
              </View>
              <Pressable style={styles.mapButton} onPress={() => navigation.navigate('PoiMap', { scope: 'verifier' })}>
                <Text style={styles.mapButtonText}>地图</Text>
              </Pressable>
            </View>

            <View style={styles.metricRow}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>当前待处理</Text>
                <Text style={styles.metricValue}>{stats.total}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>首次核验</Text>
                <Text style={styles.metricValue}>{stats.submitted}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>整改复核</Text>
                <Text style={styles.metricValue}>{stats.resubmitted}</Text>
              </View>
            </View>

            {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>当前没有待核验记录</Text>
            <Text style={styles.emptyDesc}>新的提交或整改重提会出现在这里。</Text>
          </View>
        }
        renderItem={({ item }) => {
          const statusMeta = getPoiStatusMeta(item.status);
          return (
            <Pressable
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => navigation.navigate('VerifierPoiDetail', { poiId: item.id })}
            >
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.poiName}</Text>
                <View style={[styles.badge, { backgroundColor: statusMeta.badgeBg }]}>
                  <Text style={[styles.badgeText, { color: statusMeta.badgeText }]}>{statusMeta.label}</Text>
                </View>
              </View>
              <Text style={styles.cardMeta}>{item.categoryName || '未分类'} · {item.collectorName}</Text>
              <Text style={styles.cardDesc} numberOfLines={2}>
                {item.latestReviewComment ?? (item.status === 'RESUBMITTED' ? '采集者已根据意见重新提交，请复核。' : '等待首次核验。')}
              </Text>
              <View style={styles.cardFooter}>
                <Pressable
                  style={[styles.inlineButton, (item.longitude == null || item.latitude == null) && styles.inlineButtonDisabled]}
                  disabled={item.longitude == null || item.latitude == null}
                  onPress={() => navigation.navigate('PoiMap', { scope: 'verifier', poiId: item.id })}
                >
                  <Text style={styles.inlineButtonText}>地图定位</Text>
                </Pressable>
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FBFCFD',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingBottom: 36,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  mapButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E9F2',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  mapButtonText: {
    color: '#3F3F46',
    fontWeight: '600',
    fontSize: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#3F3F46',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#71717A',
    marginTop: 6,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E9F2',
    padding: 14,
  },
  metricLabel: {
    fontSize: 12,
    color: '#71717A',
  },
  metricValue: {
    marginTop: 10,
    fontSize: 28,
    fontWeight: '700',
    color: '#3F3F46',
  },
  errorText: {
    color: '#E5484D',
    fontSize: 14,
    marginTop: 14,
  },
  emptyBox: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E9F2',
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3F3F46',
  },
  emptyDesc: {
    marginTop: 8,
    fontSize: 13,
    color: '#71717A',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E9F2',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
  },
  cardPressed: {
    backgroundColor: '#FBFCFD',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  cardTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: '#3F3F46',
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardMeta: {
    marginTop: 10,
    fontSize: 13,
    color: '#71717A',
  },
  cardDesc: {
    marginTop: 10,
    fontSize: 14,
    color: '#52525B',
    lineHeight: 20,
  },
  cardFooter: {
    marginTop: 12,
    flexDirection: 'row',
  },
  inlineButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E9F2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  inlineButtonDisabled: {
    opacity: 0.45,
  },
  inlineButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3F3F46',
  },
});
