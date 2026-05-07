import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchMyTasks, updateTaskStatus } from '../api/operations';
import type { TaskItem, TaskStatus } from '../types/operations';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'TaskCenter'>;

export default function TaskCenterScreen({ navigation }: Props) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTasks = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const data = await fetchMyTasks();
      setTasks(data);
    } catch {
      Alert.alert('加载失败', '任务列表获取失败，请稍后重试。');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      void loadTasks(true);
    });
    void loadTasks();
    return unsubscribe;
  }, [navigation]);

  const pendingCount = useMemo(() => tasks.filter((item) => ['PENDING', 'PROCESSING', 'OVERDUE'].includes(item.status)).length, [tasks]);

  const updateStatus = async (taskId: number, status: TaskStatus) => {
    try {
      await updateTaskStatus(taskId, status);
      await loadTasks(true);
    } catch (error: any) {
      Alert.alert('更新失败', error?.response?.data?.message || '任务状态更新失败');
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void loadTasks(true); }} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>任务中心</Text>
          <Text style={styles.subtitle}>当前还有 {pendingCount} 个待处理任务，任务来源已与 POI、争议流程联动。</Text>
        </View>

        {tasks.map((task) => (
          <View key={task.id} style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>{task.title}</Text>
              <View style={[styles.badge, task.overdue && styles.badgeDanger]}>
                <Text style={[styles.badgeText, task.overdue && styles.badgeTextDanger]}>{task.status}</Text>
              </View>
            </View>
            <Text style={styles.cardMeta}>{task.taskType} · {task.bizType}#{task.bizId}</Text>
            <Text style={styles.cardDesc}>{task.description || '暂无任务说明'}</Text>
            <Text style={styles.cardMeta}>截止时间：{task.dueAt ? new Date(task.dueAt).toLocaleString() : '未设置'}</Text>
            <View style={styles.actionRow}>
              {task.status !== 'PROCESSING' && task.status !== 'CLOSED' ? (
                <Pressable style={styles.secondaryButton} onPress={() => void updateStatus(task.id, 'PROCESSING')}>
                  <Text style={styles.secondaryButtonText}>开始处理</Text>
                </Pressable>
              ) : null}
              {task.status !== 'CLOSED' && task.status !== 'APPROVED' && task.status !== 'REJECTED' && task.status !== 'DECIDED' ? (
                <Pressable style={styles.primaryButton} onPress={() => void updateStatus(task.id, 'CLOSED')}>
                  <Text style={styles.primaryButtonText}>关闭任务</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ))}

        {!tasks.length ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>当前没有任务</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FBFCFD' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 40 },
  header: { paddingHorizontal: 20, paddingTop: 36, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: '700', color: '#3F3F46' },
  subtitle: { marginTop: 8, fontSize: 14, color: '#71717A', lineHeight: 22 },
  card: { marginTop: 16, marginHorizontal: 20, padding: 16, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E5E9F2' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#3F3F46', flex: 1, marginRight: 12 },
  cardMeta: { marginTop: 6, fontSize: 12, color: '#71717A' },
  cardDesc: { marginTop: 10, fontSize: 14, color: '#52525B', lineHeight: 21 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: '#E8F4FF' },
  badgeDanger: { backgroundColor: '#FFF0F0' },
  badgeText: { fontSize: 12, color: '#3B6FF5', fontWeight: '600' },
  badgeTextDanger: { color: '#E5484D' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  primaryButton: { backgroundColor: '#3B6FF5', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '600' },
  secondaryButton: { backgroundColor: '#F3F5F9', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  secondaryButtonText: { color: '#3F3F46', fontWeight: '600' },
  emptyCard: { marginTop: 16, marginHorizontal: 20, padding: 20, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E9F2' },
  emptyText: { color: '#71717A', textAlign: 'center' },
});
