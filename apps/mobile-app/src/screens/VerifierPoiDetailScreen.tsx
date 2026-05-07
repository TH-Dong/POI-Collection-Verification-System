import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchPoiCommunicationMessages, openPoiPrivateConversation } from '../api/chat';
import { fetchReviewIssues, fetchVerifierPoiDetail, submitVerifierPoiReview } from '../api/poi';
import type { ChatMessage } from '../types/chat';
import type { PoiDetail } from '../types/poi';
import type { RootStackParamList } from '../types/navigation';
import { getPoiStatusMeta, getReviewDecisionLabel } from '../utils/poi';

type Props = NativeStackScreenProps<RootStackParamList, 'VerifierPoiDetail'>;

export default function VerifierPoiDetailScreen({ navigation, route }: Props) {
  const [poi, setPoi] = useState<PoiDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [communicationMessages, setCommunicationMessages] = useState<ChatMessage[]>([]);
  const [chatOpening, setChatOpening] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const [issueCodes, setIssueCodes] = useState<string[]>([]);
  const [reviewIssues, setReviewIssues] = useState<Array<{ code: string; name: string }>>([]);

  const loadDetail = async () => {
    try {
      setLoading(true);
      setErrorText('');
      const [data, issues, messages] = await Promise.all([
        fetchVerifierPoiDetail(route.params.poiId),
        fetchReviewIssues(),
        fetchPoiCommunicationMessages(route.params.poiId),
      ]);
      setPoi(data);
      setReviewIssues(issues);
      setCommunicationMessages(messages);
      setReviewComment('');
      setIssueCodes([]);
    } catch (_error) {
      setErrorText('获取核验详情失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      void loadDetail();
    });
    void loadDetail();
    return unsubscribe;
  }, [navigation, route.params.poiId]);

  const latestRejectRecord = useMemo(() => {
    return poi?.reviewRecords.find((item) => item.decision === 'REJECTED') ?? null;
  }, [poi]);

  const toggleIssue = (code: string) => {
    setIssueCodes((current) => current.includes(code) ? current.filter((item) => item !== code) : [...current, code]);
  };

  const openConversation = async () => {
    if (!poi) {
      return;
    }
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

  const submitReview = async (decision: 'APPROVED' | 'REJECTED') => {
    if (!poi) {
      return;
    }

    const trimmedComment = reviewComment.trim();
    if (decision === 'REJECTED') {
      if (!issueCodes.length) {
        Alert.alert('请至少选择一个错误标记');
        return;
      }
      if (!trimmedComment) {
        Alert.alert('驳回时必须填写整改说明');
        return;
      }
    }

    try {
      setSubmitting(true);
      await submitVerifierPoiReview(poi.id, {
        decision,
        issueCodes: decision === 'REJECTED' ? issueCodes : [],
        reviewComment: trimmedComment || null,
      });
      Alert.alert('提交成功', decision === 'APPROVED' ? '该记录已核验通过。' : '整改意见已发送给采集者。', [
        { text: '确定', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('提交失败', error?.response?.data?.message || '请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

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

  return (
    <SafeAreaView style={styles.root}>
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={[styles.badge, { backgroundColor: statusMeta.badgeBg }]}>
                <Text style={[styles.badgeText, { color: statusMeta.badgeText }]}>{statusMeta.label}</Text>
              </View>
              <Text style={styles.metaTime}>轮次 {poi.reviewCount + 1}</Text>
            </View>
            <Text style={styles.title}>{poi.poiName}</Text>
            <Text style={styles.subtitle}>核验者关心的是是否合格、错在哪里、是否可直接通过。</Text>
          </View>

          {latestRejectRecord ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>上一轮整改意见</Text>
              <View style={styles.warnCard}>
                <Text style={styles.warnText}>{latestRejectRecord.issueLabels.join(' / ') || '未标记具体问题'}</Text>
                <Text style={styles.warnDesc}>{latestRejectRecord.reviewComment || '未填写说明'}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>基础信息</Text>
            <View style={styles.card}>
              <InfoRow label="分类" value={poi.categoryName || '未分类'} />
              <InfoRow label="采集者" value={poi.collectorName} />
              <InfoRow label="地址" value={poi.addressText || '无地址'} />
              <InfoRow
                label="坐标"
                value={poi.longitude != null && poi.latitude != null ? `${poi.longitude.toFixed(6)}, ${poi.latitude.toFixed(6)}` : '无坐标'}
                last
              />
              <View style={styles.inlineActionRow}>
                <Pressable
                  style={[styles.inlineButton, (poi.longitude == null || poi.latitude == null) && styles.inlineButtonDisabled]}
                  disabled={poi.longitude == null || poi.latitude == null}
                  onPress={() => navigation.navigate('PoiMap', { scope: 'verifier', poiId: poi.id })}
                >
                  <Text style={styles.inlineButtonText}>地图查看</Text>
                </Pressable>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>描述</Text>
            <View style={styles.card}>
              <Text style={styles.bodyText}>{poi.description || '暂无描述'}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>现场照片</Text>
            {poi.coverImageUrl ? (
              <View style={styles.imageCard}>
                <Image source={{ uri: poi.coverImageUrl }} style={styles.heroImage} />
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>暂无照片</Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>错误标记</Text>
            <View style={styles.issueWrap}>
              {reviewIssues.map((item) => {
                const active = issueCodes.includes(item.code);
                return (
                  <Pressable key={item.code} style={[styles.issueChip, active && styles.issueChipActive]} onPress={() => toggleIssue(item.code)}>
                    <Text style={[styles.issueChipText, active && styles.issueChipTextActive]}>{item.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>核验说明</Text>
            <TextInput
              style={styles.textArea}
              multiline
              textAlignVertical="top"
              value={reviewComment}
              onChangeText={setReviewComment}
              placeholder="通过时可写结论；驳回时必须写清整改要求。"
              placeholderTextColor="#71717A"
            />
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
                <Text style={styles.chatEntryButtonText}>{chatOpening ? '打开中' : '联系采集者'}</Text>
              </Pressable>
            </View>
            <View style={styles.card}>
              {communicationMessages.length ? communicationMessages.map((item, index) => (
                <View key={item.id} style={[styles.chatRow, index === communicationMessages.length - 1 && styles.chatRowLast]}>
                  <Text style={styles.chatMeta}>{item.senderName} · {new Date(item.createdAt).toLocaleString()}</Text>
                  <Text style={styles.chatContent}>{item.content}</Text>
                </View>
              )) : (
                <Text style={styles.emptyText}>还没有协作消息，点上方按钮可以直接发起私聊。</Text>
              )}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable style={styles.secondaryButton} onPress={() => void submitReview('REJECTED')} disabled={submitting}>
            <Text style={styles.secondaryButtonText}>驳回整改</Text>
          </Pressable>
          <Pressable style={styles.primaryButton} onPress={() => void submitReview('APPROVED')} disabled={submitting}>
            {submitting ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>核验通过</Text>}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function InfoRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.infoRow, last && styles.infoRowLast]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
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
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  metaTime: {
    fontSize: 13,
    color: '#71717A',
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
    marginTop: 22,
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
  warnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B56A19',
  },
  warnDesc: {
    marginTop: 8,
    fontSize: 14,
    color: '#B56A19',
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F5F9',
    gap: 12,
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
    flex: 1,
    textAlign: 'right',
    fontSize: 15,
    color: '#3F3F46',
    fontWeight: '500',
  },
  inlineActionRow: {
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
  bodyText: {
    fontSize: 15,
    lineHeight: 23,
    color: '#3F3F46',
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
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E9F2',
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#71717A',
  },
  issueWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  issueChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E9F2',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  issueChipActive: {
    backgroundColor: '#FFF4D8',
    borderColor: '#B56A19',
  },
  issueChipText: {
    fontSize: 13,
    color: '#52525B',
    fontWeight: '500',
  },
  issueChipTextActive: {
    color: '#B56A19',
  },
  textArea: {
    minHeight: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E9F2',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#3F3F46',
    lineHeight: 22,
  },
  historyRow: {
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F5F9',
  },
  historyRowLast: {
    paddingBottom: 0,
    marginBottom: 0,
    borderBottomWidth: 0,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3F3F46',
  },
  historyMeta: {
    marginTop: 5,
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
    lineHeight: 20,
    color: '#52525B',
  },
  chatRow: {
    paddingBottom: 14,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F5F9',
  },
  chatRowLast: {
    paddingBottom: 0,
    marginBottom: 0,
    borderBottomWidth: 0,
  },
  chatMeta: {
    fontSize: 12,
    color: '#71717A',
    marginBottom: 6,
  },
  chatContent: {
    fontSize: 14,
    lineHeight: 22,
    color: '#3F3F46',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E9F2',
    backgroundColor: '#FFFFFF',
  },
  secondaryButton: {
    flex: 1,
    height: 50,
    backgroundColor: '#FFF0F0',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#B4232A',
    fontSize: 15,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 1,
    height: 50,
    backgroundColor: '#3B6FF5',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  errorText: {
    color: '#E5484D',
    fontSize: 15,
    fontWeight: '500',
  },
});
