import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { commentDispute, escalateDispute, fetchDisputeDetail } from '../api/dispute';
import type { DisputeDetail } from '../types/dispute';
import type { RootStackParamList } from '../types/navigation';
import { getPoiStatusMeta } from '../utils/poi';

type Props = NativeStackScreenProps<RootStackParamList, 'VerifierDisputeDetail'>;

const disputeStatusMeta = {
  DISPUTING: { label: '争议处理中', tint: '#C26122', bg: '#FFF3E8' },
  ARBITRATING: { label: '最终裁定中', tint: '#2759D8', bg: '#E8F4FF' },
  FINALIZED: { label: '已最终确认', tint: '#277C68', bg: '#EAF8F3' },
} as const;

export default function VerifierDisputeDetailScreen({ navigation, route }: Props) {
  const [detail, setDetail] = useState<DisputeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [content, setContent] = useState('');

  const loadDetail = async () => {
    try {
      setLoading(true);
      setErrorText('');
      const data = await fetchDisputeDetail(route.params.disputeId);
      setDetail(data);
      setContent('');
    } catch (_error) {
      setErrorText('获取争议详情失败，请稍后重试');
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
  }, [navigation, route.params.disputeId]);

  const latestRejectRecord = useMemo(() => {
    return detail?.poi.reviewRecords.find((item) => item.decision === 'REJECTED') ?? null;
  }, [detail]);

  const submitComment = async () => {
    const trimmed = content.trim();
    if (!trimmed) {
      Alert.alert('请先填写补充说明');
      return;
    }
    try {
      setSubmitting(true);
      await commentDispute(route.params.disputeId, { content: trimmed });
      await loadDetail();
      Alert.alert('提交成功', '补充说明已写入争议记录。');
    } catch (error: any) {
      Alert.alert('提交失败', error?.response?.data?.message || '请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const submitEscalation = async () => {
    const trimmed = content.trim();
    if (!trimmed) {
      Alert.alert('请先填写升级说明');
      return;
    }
    try {
      setSubmitting(true);
      await escalateDispute(route.params.disputeId, { content: trimmed });
      await loadDetail();
      Alert.alert('已升级', '争议单已提交到最终裁定。');
    } catch (error: any) {
      Alert.alert('升级失败', error?.response?.data?.message || '请稍后重试');
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

  if (!detail || errorText) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{errorText || '查询不到争议记录'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const disputeMeta = disputeStatusMeta[detail.summary.disputeStatus];
  const poiMeta = getPoiStatusMeta(detail.summary.poiStatus);

  return (
    <SafeAreaView style={styles.root}>
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerBadges}>
              <View style={[styles.badge, { backgroundColor: disputeMeta.bg }]}>
                <Text style={[styles.badgeText, { color: disputeMeta.tint }]}>{disputeMeta.label}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: poiMeta.badgeBg }]}>
                <Text style={[styles.badgeText, { color: poiMeta.badgeText }]}>{poiMeta.label}</Text>
              </View>
            </View>
            <Text style={styles.title}>{detail.summary.poiName}</Text>
            <Text style={styles.subtitle}>先看驳回依据和沟通记录，再决定是补充说明还是升级到最终裁定。</Text>
          </View>

          <Section title="争议概况">
            <InfoRow label="发起人" value={detail.summary.initiatorName} />
            <InfoRow label="创建时间" value={new Date(detail.summary.createdAt).toLocaleString()} />
            <InfoRow label="最新状态" value={disputeMeta.label} />
          </Section>

          {latestRejectRecord ? (
            <Section title="最近一次驳回依据">
              <Text style={styles.blockText}>{latestRejectRecord.issueLabels.join('、') || '未标记具体问题'}</Text>
              <Text style={[styles.blockText, { marginTop: 10 }]}>{latestRejectRecord.reviewComment || '未填写说明'}</Text>
            </Section>
          ) : null}

          <Section title="沟通记录">
            {detail.comments.length ? detail.comments.map((item, index) => (
              <View key={item.id} style={[styles.timelineCard, index === detail.comments.length - 1 && styles.timelineCardLast]}>
                <View style={styles.timelineTop}>
                  <Text style={styles.timelineName}>{item.senderName}</Text>
                  <Text style={styles.timelineTime}>{new Date(item.createdAt).toLocaleString()}</Text>
                </View>
                {item.senderRoles.length ? (
                  <Text style={styles.timelineRole}>{item.senderRoles.map(getRoleLabel).join(' / ')}</Text>
                ) : null}
                <Text style={styles.timelineContent}>{item.content}</Text>
              </View>
            )) : <Text style={styles.emptyText}>暂无沟通记录</Text>}
          </Section>

          {detail.summary.disputeStatus === 'DISPUTING' ? (
            <Section title="核验者处理">
              <Text style={styles.helperText}>说明为什么维持当前判断，或者写清楚为什么需要进入最终裁定。</Text>
              <TextInput
                style={styles.textArea}
                multiline
                textAlignVertical="top"
                value={content}
                onChangeText={setContent}
                placeholder="例如：补充现场核验依据、照片判断理由，或说明双方争议点和升级原因。"
                placeholderTextColor="#71717A"
              />
            </Section>
          ) : null}

          {detail.arbitration ? (
            <Section title="最终裁定结果">
              <Text style={styles.blockText}>
                {detail.arbitration.finalDecision === 'APPROVED' ? '支持采集方，记录通过' : '维持驳回，记录不通过'}
              </Text>
              <Text style={[styles.blockText, { marginTop: 10 }]}>{detail.arbitration.description}</Text>
            </Section>
          ) : null}
        </ScrollView>

        {detail.summary.disputeStatus === 'DISPUTING' ? (
          <View style={styles.footer}>
            <Pressable style={styles.secondaryButton} onPress={() => void submitComment()} disabled={submitting}>
              <Text style={styles.secondaryButtonText}>补充说明</Text>
            </Pressable>
            <Pressable style={styles.primaryButton} onPress={() => void submitEscalation()} disabled={submitting}>
              {submitting ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>升级裁定</Text>}
            </Pressable>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function getRoleLabel(role: string) {
  switch (role) {
    case 'COLLECTOR':
      return '采集者';
    case 'VERIFIER':
      return '核验者';
    case 'ADMIN':
      return '管理员';
    default:
      return role;
  }
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FBFCFD' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 32 },
  header: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 8 },
  headerBadges: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  title: { fontSize: 26, fontWeight: '700', color: '#3F3F46', letterSpacing: -0.5 },
  subtitle: { marginTop: 8, fontSize: 14, color: '#71717A', lineHeight: 20 },
  section: { marginTop: 22, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#71717A', marginBottom: 8, marginLeft: 4 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E5E9F2', padding: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F5F9' },
  infoLabel: { fontSize: 14, color: '#71717A' },
  infoValue: { flex: 1, textAlign: 'right', fontSize: 14, color: '#3F3F46' },
  blockText: { fontSize: 14, color: '#52525B', lineHeight: 21 },
  helperText: { fontSize: 13, color: '#71717A', lineHeight: 19, marginBottom: 12 },
  textArea: { minHeight: 150, borderWidth: 1, borderColor: '#E5E9F2', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15, color: '#3F3F46', backgroundColor: '#FBFCFD' },
  timelineCard: { paddingBottom: 14, marginBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F3F5F9' },
  timelineCardLast: { borderBottomWidth: 0, marginBottom: 0, paddingBottom: 0 },
  timelineTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  timelineName: { fontSize: 14, fontWeight: '600', color: '#3F3F46' },
  timelineTime: { fontSize: 12, color: '#71717A' },
  timelineRole: { marginTop: 6, fontSize: 12, color: '#71717A' },
  timelineContent: { marginTop: 8, fontSize: 14, color: '#52525B', lineHeight: 20 },
  emptyText: { fontSize: 14, color: '#71717A' },
  errorText: { fontSize: 14, color: '#E5484D' },
  footer: { flexDirection: 'row', gap: 12, borderTopWidth: 1, borderTopColor: '#E5E9F2', backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingVertical: 16 },
  secondaryButton: { flex: 1, minHeight: 48, borderRadius: 12, backgroundColor: '#F3F5F9', alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { fontSize: 15, fontWeight: '600', color: '#52525B' },
  primaryButton: { flex: 1, minHeight: 48, borderRadius: 12, backgroundColor: '#3B6FF5', alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
});
