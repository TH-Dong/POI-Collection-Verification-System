import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { buildChatWebSocketUrl, fetchConversationDetail, markConversationRead, sendConversationMessage } from '../api/chat';
import { useAuthStore } from '../store/authStore';
import type { ChatConversationDetail } from '../types/chat';
import type { RootStackParamList } from '../types/navigation';
import { resolveMobileFileUrl } from '../utils/fileUrl';

type Props = NativeStackScreenProps<RootStackParamList, 'ConversationDetail'>;

export default function ConversationDetailScreen({ navigation, route }: Props) {
  const token = useAuthStore((state) => state.token);
  const [detail, setDetail] = useState<ChatConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [draft, setDraft] = useState('');
  const [errorText, setErrorText] = useState('');

  const loadDetail = async () => {
    try {
      setLoading(true);
      setErrorText('');
      const data = await fetchConversationDetail(route.params.conversationId);
      setDetail(data);
      if (data.summary.unreadCount > 0) {
        await markConversationRead(route.params.conversationId);
      }
    } catch (_error) {
      setErrorText('获取会话详情失败，请稍后重试');
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
  }, [navigation, route.params.conversationId]);

  useEffect(() => {
    if (!token) {
      return undefined;
    }
    const socket = new WebSocket(buildChatWebSocketUrl(token));
    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === 'CHAT_MESSAGE' && payload.conversation?.id === route.params.conversationId) {
        void loadDetail();
      }
      if (payload.type === 'CHAT_READ' && payload.conversationId === route.params.conversationId) {
        void loadDetail();
      }
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
  }, [route.params.conversationId, token]);

  const participantsText = useMemo(() => {
    return detail?.summary.participants.map((item) => `${item.displayName || item.realName}${item.online ? ' · 在线' : ''}`).join('、') || '';
  }, [detail]);

  const submitMessage = async () => {
    if (!draft.trim()) {
      return;
    }
    try {
      setSubmitting(true);
      await sendConversationMessage(route.params.conversationId, draft.trim());
      setDraft('');
      await loadDetail();
    } catch (error: any) {
      Alert.alert('发送失败', error?.response?.data?.message || '请稍后重试');
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

  if (errorText || !detail) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{errorText || '无法打开会话'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Text style={styles.title}>{detail.summary.name}</Text>
          <Text style={styles.subtitle}>{detail.summary.poiName ? `关联 POI：${detail.summary.poiName}` : participantsText}</Text>
        </View>

        <FlatList
          data={detail.messages}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.messageList}
          renderItem={({ item }) => (
            <View style={[styles.messageRow, item.mine ? styles.messageRowMine : styles.messageRowOther]}>
              {!item.mine ? <ChatAvatar name={item.senderName} avatarUrl={item.senderAvatarUrl} /> : null}
              <View style={[styles.messageBubble, item.mine ? styles.messageMine : styles.messageOther]}>
                <Text style={[styles.messageMeta, item.mine && styles.messageMetaMine]}>
                  {item.senderName} · {new Date(item.createdAt).toLocaleString()}
                </Text>
                <Text style={[styles.messageText, item.mine && styles.messageTextMine]}>{item.content}</Text>
              </View>
              {item.mine ? <ChatAvatar name={item.senderName} avatarUrl={item.senderAvatarUrl} /> : null}
            </View>
          )}
        />

        <View style={styles.footer}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            multiline
            textAlignVertical="top"
            placeholder="输入协作消息..."
            placeholderTextColor="#71717A"
          />
          <Pressable style={({ pressed }) => [styles.sendButton, pressed && styles.sendButtonPressed, submitting && styles.sendButtonDisabled]} onPress={() => void submitMessage()} disabled={submitting}>
            <Text style={styles.sendButtonText}>{submitting ? '发送中' : '发送'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ChatAvatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  return (
    <View style={styles.avatarWrap}>
      {avatarUrl ? (
        <Image source={{ uri: resolveMobileFileUrl(avatarUrl) ?? undefined }} style={styles.avatarImage} />
      ) : (
        <Text style={styles.avatarFallback}>{name.slice(0, 1).toUpperCase()}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FBFCFD',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3F3F46',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#71717A',
  },
  messageList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginBottom: 12,
  },
  messageRowMine: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
  },
  messageMine: {
    alignSelf: 'flex-end',
    backgroundColor: '#3B6FF5',
  },
  messageOther: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E9F2',
  },
  messageMeta: {
    fontSize: 11,
    color: '#71717A',
    marginBottom: 6,
  },
  messageMetaMine: {
    color: '#DCEAFF',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#3F3F46',
  },
  messageTextMine: {
    color: '#FFFFFF',
  },
  avatarWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E4ECFB',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    fontSize: 14,
    fontWeight: '800',
    color: '#315FD8',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E9F2',
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  input: {
    minHeight: 84,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E9F2',
    backgroundColor: '#FBFCFD',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#3F3F46',
  },
  sendButton: {
    borderRadius: 14,
    backgroundColor: '#3B6FF5',
    paddingVertical: 14,
    alignItems: 'center',
  },
  sendButtonPressed: {
    backgroundColor: '#2759D8',
  },
  sendButtonDisabled: {
    opacity: 0.7,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#E5484D',
  },
});
