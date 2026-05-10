import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchMyNotices, markNoticeRead } from '../api/operations';
import { useAuthStore } from '../store/authStore';
import type { RootStackParamList } from '../types/navigation';
import type { NoticeItem } from '../types/operations';

type Props = NativeStackScreenProps<RootStackParamList, 'NoticeCenter'>;

export default function NoticeCenterScreen({ navigation }: Props) {
  const user = useAuthStore((state) => state.user);
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotices = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const data = await fetchMyNotices();
      setNotices(data);
    } catch {
      Alert.alert('加载失败', '通知列表获取失败，请稍后重试。');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      void loadNotices(true);
    });
    void loadNotices();
    return unsubscribe;
  }, [navigation]);

  const unreadCount = useMemo(() => notices.filter((item) => !item.readFlag).length, [notices]);
  const systemGuide = useMemo(() => buildRoleSystemGuide(user?.roles ?? []), [user?.roles]);

  const markRead = async (notice: NoticeItem) => {
    if (!notice.noticeUserId) {
      return;
    }
    try {
      await markNoticeRead(notice.noticeUserId);
      await loadNotices(true);
    } catch (error: any) {
      Alert.alert('操作失败', error?.response?.data?.message || '标记已读失败');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.centered}><ActivityIndicator size="small" color="#3F3F46" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void loadNotices(true); }} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>通知中心</Text>
          <Text style={styles.subtitle}>当前还有 {unreadCount} 条未读通知，任务派发、核验结论和争议裁定都会沉淀到这里。</Text>
        </View>

        <View style={styles.guideCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.guideTitle}>{systemGuide.title}</Text>
            <View style={styles.guideBadge}>
              <Text style={styles.guideBadgeText}>系统公告</Text>
            </View>
          </View>
          <Text style={styles.guideContent}>{systemGuide.content}</Text>
        </View>

        {notices.map((notice) => (
          <View key={`${notice.noticeId}-${notice.noticeUserId ?? 'notice'}`} style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>{notice.title}</Text>
              <View style={[styles.badge, notice.readFlag ? styles.badgeRead : styles.badgeUnread]}>
                <Text style={[styles.badgeText, notice.readFlag ? styles.badgeTextRead : styles.badgeTextUnread]}>{notice.readFlag ? '已读' : '未读'}</Text>
              </View>
            </View>
            <Text style={styles.meta}>{notice.noticeType} · {new Date(notice.createdAt).toLocaleString()}</Text>
            <Text style={styles.contentText}>{notice.content}</Text>
            {!notice.readFlag && notice.noticeUserId ? (
              <Pressable style={styles.actionButton} onPress={() => void markRead(notice)}>
                <Text style={styles.actionButtonText}>标记已读</Text>
              </Pressable>
            ) : null}
          </View>
        ))}

        {!notices.length ? (
          <View style={styles.emptyCard}><Text style={styles.emptyText}>当前没有通知</Text></View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function buildRoleSystemGuide(roles: string[]) {
  if (roles.includes('VERIFIER')) {
    return {
      title: '核验端使用说明',
      content:
        '你当前使用的是核验者工作台。请优先处理任务中心中的高优先级任务，进入待核验队列核对点位信息、图片证据与定位准确性；如发现不符合要求的记录，需明确填写驳回意见；遇到争议记录时，请在争议处理入口补充说明并按流程升级裁定。',
    };
  }

  if (roles.includes('COLLECTOR')) {
    return {
      title: '采集端使用说明',
      content:
        '你当前使用的是采集者工作台。请按规范完成 POI 新建、拍照、定位、分类与描述填写，提交前确认信息完整；被驳回的记录请根据整改意见修改后重新提交；通知中心用于接收流程提醒，协作会话用于和核验人员沟通点位问题。',
    };
  }

  return {
    title: '系统使用说明',
    content: '该系统用于 POI 采集、核验、整改、通知与协作闭环处理，请根据当前角色进入对应的任务、通知和会话入口完成工作。',
  };
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FBFCFD' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 40 },
  header: { paddingHorizontal: 20, paddingTop: 36, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: '700', color: '#3F3F46' },
  subtitle: { marginTop: 8, fontSize: 14, color: '#71717A', lineHeight: 22 },
  guideCard: { marginTop: 8, marginHorizontal: 20, padding: 16, backgroundColor: '#EEF4FF', borderRadius: 14, borderWidth: 1, borderColor: '#D9E5FA' },
  guideTitle: { fontSize: 16, fontWeight: '700', color: '#2446A6', flex: 1, marginRight: 12 },
  guideBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#DCE8FB' },
  guideBadgeText: { fontSize: 12, fontWeight: '700', color: '#2E6FE9' },
  guideContent: { marginTop: 10, color: '#44516D', fontSize: 14, lineHeight: 22 },
  card: { marginTop: 16, marginHorizontal: 20, padding: 16, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E5E9F2' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#3F3F46', flex: 1, marginRight: 12 },
  meta: { marginTop: 6, color: '#71717A', fontSize: 12 },
  contentText: { marginTop: 10, color: '#52525B', fontSize: 14, lineHeight: 21 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeUnread: { backgroundColor: '#FFF4D8' },
  badgeRead: { backgroundColor: '#EAF8F3' },
  badgeText: { fontSize: 12, fontWeight: '600' },
  badgeTextUnread: { color: '#B56A19' },
  badgeTextRead: { color: '#277C68' },
  actionButton: { marginTop: 12, alignSelf: 'flex-start', backgroundColor: '#3B6FF5', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  actionButtonText: { color: '#FFFFFF', fontWeight: '600' },
  emptyCard: { marginTop: 16, marginHorizontal: 20, padding: 20, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E9F2' },
  emptyText: { color: '#71717A', textAlign: 'center' },
});
