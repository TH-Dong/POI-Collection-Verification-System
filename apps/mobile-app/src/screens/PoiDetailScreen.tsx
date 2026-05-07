import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View, SafeAreaView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchPoiCommunicationMessages, openPoiPrivateConversation } from '../api/chat';
import { fetchMyPoiDetail } from '../api/poi';
import type { ChatMessage } from '../types/chat';
import type { PoiDetail } from '../types/poi';
import type { RootStackParamList } from '../types/navigation';
import { canEditPoi, getPoiStatusMeta, getPoiStatusStep, getReviewDecisionLabel } from '../utils/poi';

type Props = NativeStackScreenProps<RootStackParamList, 'PoiDetail'>;

const flowLabels = ['草稿', '待核验', '核验结论', '争议 / 复核', '最终确认'];

export default function PoiDetailScreen({ navigation, route }: Props) {
  const [poi, setPoi] = useState<PoiDetail | null>(null);
  const [communicationMessages, setCommunicationMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatOpening, setChatOpening] = useState(false);
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    let active = true;

    const loadDetail = async () => {
      try {
        setLoading(true);
        setErrorText('');
        const [data, messages] = await Promise.all([
          fetchMyPoiDetail(route.params.poiId),
          fetchPoiCommunicationMessages(route.params.poiId),
        ]);
        if (active) {
          setPoi(data);
          setCommunicationMessages(messages);
        }
      } catch (_error) {
        if (active) {
          setErrorText('获取详情失败，请重试');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    const unsubscribe = navigation.addListener('focus', () => {
      void loadDetail();
    });
    void loadDetail();

    return () => {
      active = false;
      unsubscribe();
    };
  }, [navigation, route.params.poiId]);

  const latestRejectRecord = useMemo(() => {
    return poi?.reviewRecords.find((item) => item.decision === 'REJECTED') ?? null;
  }, [poi]);

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.centered}>
          <ActivityIndicator size="small" color="#3F3F46" />
        </View>
      </SafeAreaView>
    );
  }

  if (errorText || !poi) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{errorText || '查询不到该记录'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusMeta = getPoiStatusMeta(poi.status);
  const currentStep = getPoiStatusStep(poi.status, poi.reviewCount);

  const openConversation = async () => {
    try {
      setChatOpening(true);
      const conversation = await openPoiPrivateConversation(poi.id);
      navigation.navigate('ConversationDetail', { conversationId: conversation.id });
    } catch (error: any) {
      Alert.alert('打开失败', error?.response?.data?.message || '暂时无法打开协作会话');
    } finally {
      setChatOpening(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.headerArea}>
            <View style={styles.headerTop}>
              <View style={[styles.statusBadge, { backgroundColor: statusMeta.badgeBg }]}>
                <Text style={[styles.statusText, { color: statusMeta.badgeText }]}>{statusMeta.label}</Text>
              </View>
              <Text style={styles.metaTime}>{new Date(poi.updatedAt).toLocaleDateString()}</Text>
            </View>
            <Text style={styles.title}>{poi.poiName}</Text>
            <Text style={styles.subtitle}>当前状态清晰显示，整改意见可直接查看。</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>状态流转</Text>
            <View style={styles.card}>
              {flowLabels.map((label, index) => {
                const active = index <= currentStep;
                const current = index === currentStep;
                return (
                  <View key={label} style={[styles.flowRow, index === flowLabels.length - 1 && styles.flowRowLast]}>
                    <View style={[styles.flowDot, active && styles.flowDotActive, current && styles.flowDotCurrent]} />
                    <View style={styles.flowContent}>
                      <Text style={[styles.flowLabel, active && styles.flowLabelActive]}>{label}</Text>
                      <Text style={styles.flowDesc}>
                        {index === 0 && '可继续编辑基础信息'}
                        {index === 1 && '已进入核验队列'}
                        {index === 2 && (poi.status === 'APPROVED' ? '本轮核验已通过' : '本轮核验要求整改')}
                        {index === 3 && (poi.status === 'DISPUTING' ? '异议处理中，等待双方补充说明' : poi.status === 'ARBITRATING' ? '已升级到最终裁定' : '整改后重新提交，等待复核')}
                        {index === 4 && '管理员已给出最终裁定并完成确认'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {latestRejectRecord ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>整改意见</Text>
              <View style={styles.warnCard}>
                <Text style={styles.warnTitle}>最近一次驳回意见</Text>
                <View style={styles.issueWrap}>
                  {latestRejectRecord.issueLabels.length ? latestRejectRecord.issueLabels.map((label) => (
                    <View key={label} style={styles.issueChip}>
                      <Text style={styles.issueChipText}>{label}</Text>
                    </View>
                  )) : <Text style={styles.warnText}>未标记具体问题</Text>}
                </View>
                <Text style={styles.warnText}>{latestRejectRecord.reviewComment || '未填写说明'}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>基本信息</Text>
            <View style={styles.card}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>所属分类</Text>
                <Text style={styles.infoValue}>{poi.categoryName || '未分类'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>采集人员</Text>
                <Text style={styles.infoValue}>{poi.collectorName}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>最近核验</Text>
                <Text style={styles.infoValue}>{poi.latestReviewerName || '暂无'}</Text>
              </View>
              <View style={[styles.infoRow, styles.infoRowLast, { flexDirection: 'column', alignItems: 'flex-start' }]}>
                <Text style={[styles.infoLabel, { marginBottom: 8 }]}>位置信息</Text>
                <View style={styles.locationBox}>
                  <Text style={styles.locationCoords}>
                    {poi.longitude != null && poi.latitude != null ? `${poi.longitude.toFixed(6)}, ${poi.latitude.toFixed(6)}` : '缺失坐标数据'}
                  </Text>
                  <Text style={styles.locationAddress}>{poi.addressText || '无详细地址'}</Text>
                  <Pressable
                    style={[styles.mapButton, (poi.longitude == null || poi.latitude == null) && styles.mapButtonDisabled]}
                    disabled={poi.longitude == null || poi.latitude == null}
                    onPress={() => navigation.navigate('PoiMap', { scope: 'mine', poiId: poi.id })}
                  >
                    <Text style={styles.mapButtonText}>地图查看</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>详细描述</Text>
            <View style={styles.card}>
              <Text style={[styles.descText, !poi.description && styles.descTextEmpty]}>
                {poi.description || '暂无详细描述...'}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>实景照片</Text>
            {poi.coverImageUrl ? (
              <View style={styles.imageCard}>
                <Image source={{ uri: poi.coverImageUrl }} style={styles.heroImage} />
              </View>
            ) : (
              <View style={styles.cardEmpty}>
                <Text style={styles.emptyText}>暂无照片</Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>核验历史</Text>
            <View style={styles.card}>
              {poi.reviewRecords.length ? poi.reviewRecords.map((item, index) => (
                <View key={item.id} style={[styles.historyRow, index === poi.reviewRecords.length - 1 && styles.historyRowLast]}>
                  <Text style={styles.historyTitle}>第 {item.round} 轮 · {getReviewDecisionLabel(item.decision)}</Text>
                  <Text style={styles.historyMeta}>{item.reviewerName} · {new Date(item.createdAt).toLocaleString()}</Text>
                  {item.issueLabels.length ? <Text style={styles.historyIssues}>{item.issueLabels.join(' / ')}</Text> : null}
                  {item.reviewComment ? <Text style={styles.historyComment}>{item.reviewComment}</Text> : null}
                </View>
              )) : (
                <Text style={styles.emptyText}>暂无核验记录</Text>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>沟通记录</Text>
              <Pressable style={[styles.chatEntryButton, chatOpening && styles.chatEntryButtonDisabled]} onPress={() => void openConversation()} disabled={chatOpening}>
                <Text style={styles.chatEntryButtonText}>{chatOpening ? '打开中' : '联系核验者'}</Text>
              </Pressable>
            </View>
            <View style={styles.card}>
              {communicationMessages.length ? communicationMessages.map((item, index) => (
                <View key={item.id} style={[styles.chatRow, index === communicationMessages.length - 1 && styles.chatRowLast]}>
                  <Text style={styles.chatMeta}>{item.senderName} · {new Date(item.createdAt).toLocaleString()}</Text>
                  <Text style={styles.chatContent}>{item.content}</Text>
                </View>
              )) : (
                <Text style={styles.emptyText}>还没有协作消息，发起私聊后会自动留痕。</Text>
              )}
            </View>
          </View>
        </ScrollView>

        {canEditPoi(poi.status) ? (
          <View style={styles.footer}>
            {canEditPoi(poi.status) ? (
              <Pressable
                style={[styles.primaryButton, poi.status === 'REJECTED' && styles.footerHalfButton]}
                onPress={() => navigation.navigate('PoiForm', { poiId: poi.id })}
              >
                <Text style={styles.primaryButtonText}>{poi.status === 'REJECTED' ? '根据意见整改' : '继续编辑'}</Text>
              </Pressable>
            ) : null}
            {poi.status === 'REJECTED' ? (
              <Pressable style={[styles.secondaryButton, styles.footerHalfButton]} onPress={() => navigation.navigate('DisputeSubmit', { poiId: poi.id })}>
                <Text style={styles.secondaryButtonText}>发起异议</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
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
  container: {
    paddingBottom: 40,
  },
  headerArea: {
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  metaTime: {
    fontSize: 13,
    color: '#71717A',
    fontFamily: 'Courier',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#3F3F46',
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#71717A',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#71717A',
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E9F2',
    padding: 16,
  },
  chatEntryButton: {
    backgroundColor: '#3B6FF5',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chatEntryButtonDisabled: {
    opacity: 0.7,
  },
  chatEntryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  warnCard: {
    backgroundColor: '#FFF8E8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE3A3',
    padding: 16,
  },
  warnTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#B56A19',
  },
  warnText: {
    marginTop: 10,
    fontSize: 14,
    color: '#B56A19',
    lineHeight: 22,
  },
  issueWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  issueChip: {
    backgroundColor: '#FFF4D8',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  issueChipText: {
    fontSize: 12,
    color: '#B56A19',
    fontWeight: '600',
  },
  flowRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingBottom: 16,
  },
  flowRowLast: {
    paddingBottom: 0,
  },
  flowDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: '#E5E9F2',
    marginTop: 4,
    marginRight: 12,
  },
  flowDotActive: {
    backgroundColor: '#3B6FF5',
  },
  flowDotCurrent: {
    backgroundColor: '#3B6FF5',
  },
  flowContent: {
    flex: 1,
  },
  flowLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#71717A',
  },
  flowLabelActive: {
    color: '#3F3F46',
  },
  flowDesc: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: '#71717A',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F5F9',
  },
  infoRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  infoLabel: {
    fontSize: 14,
    color: '#71717A',
  },
  infoValue: {
    fontSize: 15,
    color: '#3F3F46',
    fontWeight: '500',
  },
  locationBox: {
    backgroundColor: '#FBFCFD',
    width: '100%',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F3F5F9',
  },
  locationCoords: {
    fontSize: 13,
    color: '#52525B',
    fontFamily: 'Courier',
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
    color: '#71717A',
    lineHeight: 20,
  },
  mapButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E9F2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  mapButtonDisabled: {
    opacity: 0.45,
  },
  mapButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3F3F46',
  },
  descText: {
    fontSize: 15,
    color: '#3F3F46',
    lineHeight: 24,
  },
  descTextEmpty: {
    color: '#71717A',
    fontStyle: 'italic',
  },
  imageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E9F2',
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: 240,
    resizeMode: 'cover',
  },
  cardEmpty: {
    backgroundColor: '#FBFCFD',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E9F2',
    borderStyle: 'dashed',
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#71717A',
    fontSize: 14,
    fontWeight: '500',
  },
  historyRow: {
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F5F9',
  },
  historyRowLast: {
    marginBottom: 0,
    paddingBottom: 0,
    borderBottomWidth: 0,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3F3F46',
  },
  historyMeta: {
    marginTop: 4,
    fontSize: 13,
    color: '#71717A',
  },
  historyIssues: {
    marginTop: 8,
    fontSize: 13,
    color: '#B56A19',
    fontWeight: '600',
  },
  historyComment: {
    marginTop: 8,
    fontSize: 14,
    color: '#52525B',
    lineHeight: 20,
  },
  chatRow: {
    paddingBottom: 14,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F5F9',
  },
  chatRowLast: {
    marginBottom: 0,
    paddingBottom: 0,
    borderBottomWidth: 0,
  },
  chatMeta: {
    fontSize: 12,
    color: '#71717A',
    marginBottom: 6,
  },
  chatContent: {
    fontSize: 14,
    color: '#3F3F46',
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E9F2',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    gap: 12,
  },
  footerHalfButton: {
    flex: 1,
  },
  secondaryButton: {
    backgroundColor: '#F3F5F9',
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 8,
  },
  secondaryButtonText: {
    color: '#52525B',
    fontWeight: '600',
    fontSize: 16,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#3B6FF5',
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  errorText: {
    color: '#E5484D',
    fontSize: 15,
    fontWeight: '500',
  },
});
