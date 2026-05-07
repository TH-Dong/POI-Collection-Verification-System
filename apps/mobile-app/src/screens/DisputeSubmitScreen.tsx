import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createDispute } from '../api/dispute';
import { fetchMyPoiDetail } from '../api/poi';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'DisputeSubmit'>;

export default function DisputeSubmitScreen({ navigation, route }: Props) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [poiName, setPoiName] = useState('');
  const [latestRejectComment, setLatestRejectComment] = useState('');
  const [latestIssues, setLatestIssues] = useState<string[]>([]);
  const [content, setContent] = useState('');
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    let active = true;
    fetchMyPoiDetail(route.params.poiId)
      .then((data) => {
        if (!active) {
          return;
        }
        setPoiName(data.poiName);
        const latestReject = data.reviewRecords.find((item) => item.decision === 'REJECTED');
        setLatestRejectComment(latestReject?.reviewComment ?? '');
        setLatestIssues(latestReject?.issueLabels ?? []);
      })
      .catch(() => {
        if (active) {
          setErrorText('加载异议上下文失败，请返回重试。');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [route.params.poiId]);

  const helperText = useMemo(() => {
    if (!latestIssues.length && !latestRejectComment) {
      return '请说明你不认可当前驳回结论的原因，以及需要核验者进一步核对的内容。';
    }
    return '请针对本次驳回意见逐条说明你的异议理由，必要时补充现场情况、坐标、图片和描述依据。';
  }, [latestIssues, latestRejectComment]);

  const submit = async () => {
    const trimmed = content.trim();
    if (!trimmed) {
      setErrorText('请填写异议说明。');
      return;
    }
    try {
      setSubmitting(true);
      setErrorText('');
      await createDispute({
        poiId: route.params.poiId,
        content: trimmed,
      });
      Alert.alert('提交成功', '异议单已创建，记录已进入争议处理中。', [
        {
          text: '查看记录',
          onPress: () => navigation.replace('PoiDetail', { poiId: route.params.poiId }),
        },
      ]);
    } catch (error: any) {
      setErrorText(error?.response?.data?.message || '提交异议失败');
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

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>异议提交</Text>
          <Text style={styles.subtitle}>{poiName || '当前记录'} 将进入“争议处理中”，核验者可继续补充说明，必要时会转入最终裁定。</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>当前驳回背景</Text>
          <View style={styles.card}>
            <Text style={styles.label}>点位名称</Text>
            <Text style={styles.value}>{poiName || '-'}</Text>
            {latestIssues.length ? (
              <>
                <Text style={[styles.label, { marginTop: 16 }]}>问题标记</Text>
                <View style={styles.issueWrap}>
                  {latestIssues.map((item) => (
                    <View key={item} style={styles.issueChip}>
                      <Text style={styles.issueChipText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}
            <Text style={[styles.label, { marginTop: 16 }]}>驳回说明</Text>
            <Text style={styles.desc}>{latestRejectComment || '暂无详细驳回说明。'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>异议说明</Text>
          <View style={styles.card}>
            <Text style={styles.helperText}>{helperText}</Text>
            <TextInput
              style={styles.inputArea}
              multiline
              textAlignVertical="top"
              placeholder="例如：现场点位名称与营业执照一致，照片拍摄时间和位置均可佐证，建议重新核对分类与门头信息。"
              placeholderTextColor="#71717A"
              value={content}
              onChangeText={setContent}
            />
          </View>
        </View>

        {errorText ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorText}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.secondaryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryButtonText}>返回</Text>
        </Pressable>
        <Pressable style={styles.primaryButton} onPress={() => void submit()} disabled={submitting}>
          {submitting ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>提交异议</Text>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FBFCFD' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { paddingBottom: 32 },
  header: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '700', color: '#3F3F46', letterSpacing: -0.5 },
  subtitle: { marginTop: 8, fontSize: 14, color: '#71717A', lineHeight: 20 },
  section: { marginTop: 24, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#71717A', marginBottom: 8, marginLeft: 4 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E9F2', padding: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#71717A' },
  value: { marginTop: 8, fontSize: 17, fontWeight: '600', color: '#3F3F46' },
  desc: { marginTop: 8, fontSize: 14, color: '#52525B', lineHeight: 22 },
  helperText: { fontSize: 13, color: '#71717A', lineHeight: 20, marginBottom: 12 },
  inputArea: {
    minHeight: 180,
    borderWidth: 1,
    borderColor: '#E5E9F2',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: '#3F3F46',
    backgroundColor: '#FBFCFD',
  },
  issueWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  issueChip: { backgroundColor: '#FFF4D8', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  issueChipText: { fontSize: 12, fontWeight: '600', color: '#B56A19' },
  errorBox: { marginHorizontal: 20, marginTop: 20, padding: 12, borderWidth: 1, borderColor: '#FFDADA', backgroundColor: '#FFF0F0', borderRadius: 10 },
  errorText: { color: '#E5484D', fontSize: 14, textAlign: 'center' },
  footer: {
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E9F2',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  secondaryButton: { flex: 1, backgroundColor: '#F3F5F9', borderRadius: 10, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  secondaryButtonText: { color: '#52525B', fontSize: 15, fontWeight: '600' },
  primaryButton: { flex: 2, backgroundColor: '#3B6FF5', borderRadius: 10, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
