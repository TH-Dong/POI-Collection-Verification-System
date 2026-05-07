import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { buildChatWebSocketUrl, fetchChatConversations } from '../api/chat';
import { useAuthStore } from '../store/authStore';
import type { ChatConversationSummary } from '../types/chat';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'ConversationList'>;

export default function ConversationListScreen({ navigation }: Props) {
  const token = useAuthStore((state) => state.token);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [conversations, setConversations] = useState<ChatConversationSummary[]>([]);

  const loadConversations = async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setErrorText('');
      const data = await fetchChatConversations();
      setConversations(data);
    } catch (_error) {
      setErrorText('获取会话列表失败，请稍后重试');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      void loadConversations();
    });
    void loadConversations();
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (!token) {
      return undefined;
    }
    const socket = new WebSocket(buildChatWebSocketUrl(token));
    socket.onmessage = () => {
      void loadConversations(true);
    };
    const timer = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'PING' }));
      }
    }, 30000);
    return () => {
      clearInterval(timer);
      socket.close();
    };
  }, [token]);

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.centered}>
          <ActivityIndicator size="small" color="#3F3F46" />
        </View>
      </SafeAreaView>
    );
  }

  if (errorText && !conversations.length) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{errorText}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>协作会话</Text>
        <Text style={styles.subtitle}>阶段 7 私聊、群聊和 POI 协作消息都集中在这里。</Text>
      </View>
      <FlatList
        data={conversations}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadConversations(true)} />}
        contentContainerStyle={conversations.length ? styles.listContent : styles.emptyContent}
        renderItem={({ item }) => (
          <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={() => navigation.navigate('ConversationDetail', { conversationId: item.id })}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <View style={styles.titleRow}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  {item.unreadCount > 0 ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.unreadCount}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.cardMeta}>{item.poiName ? `关联 POI：${item.poiName}` : item.conversationType === 'GROUP' ? '角色群聊' : '私聊会话'}</Text>
              </View>
              <Text style={styles.timeText}>{item.lastMessageAt ? new Date(item.lastMessageAt).toLocaleDateString() : '-'}</Text>
            </View>
            <Text style={styles.previewText}>{item.lastMessagePreview || '暂无消息，点击进入会话。'}</Text>
            <View style={styles.participantRow}>
              {item.participants.slice(0, 4).map((participant) => (
                <View key={participant.userId} style={[styles.participantChip, participant.online && styles.participantChipOnline]}>
                  <Text style={[styles.participantText, participant.online && styles.participantTextOnline]}>{participant.realName}</Text>
                </View>
              ))}
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>暂无会话，先从 POI 详情发起一次私聊或进入角色群聊。</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FBFCFD',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#3F3F46',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#71717A',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  emptyContent: {
    flexGrow: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E9F2',
    padding: 16,
    marginBottom: 14,
  },
  cardPressed: {
    backgroundColor: '#FBFCFD',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3F3F46',
    flexShrink: 1,
  },
  badge: {
    minWidth: 22,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#3B6FF5',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  cardMeta: {
    marginTop: 6,
    fontSize: 13,
    color: '#71717A',
  },
  timeText: {
    fontSize: 12,
    color: '#71717A',
  },
  previewText: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 21,
    color: '#52525B',
  },
  participantRow: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  participantChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#F3F5F9',
  },
  participantChipOnline: {
    backgroundColor: '#EAF8F3',
  },
  participantText: {
    fontSize: 12,
    color: '#52525B',
    fontWeight: '600',
  },
  participantTextOnline: {
    color: '#277C68',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 14,
    color: '#E5484D',
  },
  emptyText: {
    fontSize: 14,
    color: '#71717A',
    textAlign: 'center',
    lineHeight: 22,
  },
});
