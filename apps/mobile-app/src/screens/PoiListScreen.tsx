import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View, SafeAreaView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchMyPois } from '../api/poi';
import type { PoiSummary } from '../types/poi';
import type { RootStackParamList } from '../types/navigation';
import { getPoiStatusMeta } from '../utils/poi';

type Props = NativeStackScreenProps<RootStackParamList, 'PoiList'>;

export default function PoiListScreen({ navigation }: Props) {
  const [pois, setPois] = useState<PoiSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorText, setErrorText] = useState('');

  const loadPois = async (refresh = false) => {
    try {
      setErrorText('');
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const data = await fetchMyPois();
      setPois(data);
    } catch (error) {
      setErrorText('获取数据失败，请重试');
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
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.title}>我的记录</Text>
                <Text style={styles.subtitle}>当前账号共 {pois.length} 条记录</Text>
              </View>
              <View style={styles.headerActions}>
                <Pressable style={styles.mapButton} onPress={() => navigation.navigate('PoiMap', { scope: 'mine' })}>
                  <Text style={styles.mapButtonText}>地图</Text>
                </Pressable>
                <Pressable style={styles.newButton} onPress={() => navigation.navigate('PoiForm')}>
                  <Text style={styles.newButtonText}>+ 新建</Text>
                </Pressable>
              </View>
            </View>
            {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>还没有任何记录</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable 
            style={({ pressed }) => [styles.rowCard, !!pressed && styles.rowCardPressed]} 
            onPress={() => navigation.navigate('PoiDetail', { poiId: item.id })}
          >
            {(() => {
              const statusMeta = getPoiStatusMeta(item.status);
              return (
                <>
            <View style={styles.rowHeader}>
              <Text style={styles.rowTitle} numberOfLines={1}>{item.poiName}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusMeta.badgeBg }]}>
                 <Text style={[styles.statusText, { color: statusMeta.badgeText }]}>
                   {statusMeta.label}
                 </Text>
              </View>
            </View>
            <View style={styles.rowMeta}>
              <Text style={styles.rowCategory}>{item.categoryName || '未分类'}</Text>
              <Text style={styles.rowTime}>{new Date(item.updatedAt).toLocaleDateString()}</Text>
            </View>
            {item.latestReviewComment ? (
              <Text style={styles.rowHint} numberOfLines={2}>{item.latestReviewComment}</Text>
            ) : null}
            <View style={styles.cardFooter}>
              <Pressable
                style={[styles.inlineButton, (item.longitude == null || item.latitude == null) && styles.inlineButtonDisabled]}
                disabled={item.longitude == null || item.latitude == null}
                onPress={() => navigation.navigate('PoiMap', { scope: 'mine', poiId: item.id })}
              >
                <Text style={styles.inlineButtonText}>地图查看</Text>
              </Pressable>
            </View>
                </>
              );
            })()}
          </Pressable>
        )}
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
  listContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mapButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E9F2',
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
  newButton: {
    backgroundColor: '#3B6FF5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  newButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  errorText: {
    color: '#E5484D',
    fontSize: 14,
    marginTop: 16,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#71717A',
  },
  rowCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E9F2',
  },
  rowCardPressed: {
    backgroundColor: '#FBFCFD',
    borderColor: '#E5E9F2',
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rowTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#3F3F46',
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeDraft: {
    backgroundColor: '#F3F5F9',
  },
  statusBadgeSubmitted: {
    backgroundColor: '#E8F4FF',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextDraft: {
    color: '#52525B',
  },
  statusTextSubmitted: {
    color: '#3B6FF5',
  },
  rowMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowHint: {
    marginTop: 10,
    fontSize: 13,
    color: '#71717A',
    lineHeight: 18,
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
  },
  inlineButtonDisabled: {
    opacity: 0.45,
  },
  inlineButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3F3F46',
  },
  rowCategory: {
    fontSize: 14,
    color: '#71717A',
  },
  rowTime: {
    fontSize: 13,
    color: '#71717A',
    fontFamily: 'Courier',
  }
});
