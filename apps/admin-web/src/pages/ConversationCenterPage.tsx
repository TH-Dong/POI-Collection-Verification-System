import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Empty, Input, List, Skeleton, Space, Tag, Typography, message as antdMessage } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { buildChatWebSocketUrl, fetchChatConversations, fetchConversationDetail, markConversationRead, sendConversationMessage } from '../api/chat';
import { useAuthStore } from '../store/authStore';
import type { ChatConversationSummary } from '../types/chat';

export default function ConversationCenterPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const token = useAuthStore((state) => state.token);
  const [draft, setDraft] = useState('');
  const selectedConversationId = Number(searchParams.get('conversationId') || 0) || null;

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['chat', 'conversations'],
    queryFn: fetchChatConversations,
  });

  const effectiveConversationId = useMemo(() => {
    if (selectedConversationId) {
      return selectedConversationId;
    }
    return conversations[0]?.id ?? null;
  }, [conversations, selectedConversationId]);

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['chat', 'conversation', effectiveConversationId],
    queryFn: () => fetchConversationDetail(effectiveConversationId!),
    enabled: Boolean(effectiveConversationId),
  });

  const readMutation = useMutation({
    mutationFn: (conversationId: number) => markConversationRead(conversationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    },
  });

  const sendMutation = useMutation({
    mutationFn: ({ conversationId, content }: { conversationId: number; content: string }) => sendConversationMessage(conversationId, content),
    onSuccess: async (_, variables) => {
      setDraft('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] }),
        queryClient.invalidateQueries({ queryKey: ['chat', 'conversation', variables.conversationId] }),
      ]);
      readMutation.mutate(variables.conversationId);
    },
    onError: (error: any) => {
      antdMessage.error(error?.response?.data?.message || '发送消息失败');
    },
  });

  useEffect(() => {
    if (!token) {
      return undefined;
    }
    const socket = new WebSocket(buildChatWebSocketUrl(token));

    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === 'CHAT_MESSAGE') {
        void Promise.all([
          queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] }),
          payload.conversation?.id
            ? queryClient.invalidateQueries({ queryKey: ['chat', 'conversation', payload.conversation.id] })
            : Promise.resolve(),
        ]);
        if (payload.message?.senderName) {
          antdMessage.info(`${payload.message.senderName} 发来一条新消息`);
        }
      }
      if (payload.type === 'CHAT_READ') {
        void queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
      }
    };

    const timer = window.setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'PING' }));
      }
    }, 30000);

    return () => {
      window.clearInterval(timer);
      socket.close();
    };
  }, [queryClient, token]);

  useEffect(() => {
    if (!effectiveConversationId || !detail?.summary.unreadCount) {
      return;
    }
    readMutation.mutate(effectiveConversationId);
  }, [detail?.summary.unreadCount, effectiveConversationId, readMutation]);

  useEffect(() => {
    if (!effectiveConversationId || selectedConversationId === effectiveConversationId) {
      return;
    }
    setSearchParams({ conversationId: String(effectiveConversationId) });
  }, [effectiveConversationId, selectedConversationId, setSearchParams]);

  const submitMessage = () => {
    if (!effectiveConversationId || !draft.trim()) {
      return;
    }
    sendMutation.mutate({ conversationId: effectiveConversationId, content: draft.trim() });
  };

  return (
    <div>
      <div className="section-block" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <Typography.Title level={3} style={{ margin: 0, fontWeight: 700 }}>协作会话</Typography.Title>
          <Typography.Paragraph style={{ margin: '8px 0 0', color: 'var(--color-text-muted)' }}>
            阶段 7 私聊、群聊和 POI 沟通留痕统一沉淀在这里。
          </Typography.Paragraph>
        </div>
        {detail?.summary.poiId ? (
          <Button onClick={() => navigate(`/pois/${detail.summary.poiId}`)}>查看关联 POI</Button>
        ) : null}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px minmax(0, 1fr)', gap: 'var(--space-24)', alignItems: 'start' }}>
        <div style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)' }}>
          {isLoading ? (
            <div style={{ padding: 'var(--space-20)' }}>
              <Skeleton active paragraph={{ rows: 6 }} />
            </div>
          ) : conversations.length ? (
            <List
              dataSource={conversations}
              renderItem={(item) => (
                <List.Item
                  style={{
                    padding: 'var(--space-16)',
                    cursor: 'pointer',
                    backgroundColor: item.id === effectiveConversationId ? 'var(--color-bg-subtle)' : 'transparent',
                    borderInlineStart: item.id === effectiveConversationId ? '3px solid var(--color-primary)' : '3px solid transparent',
                  }}
                  onClick={() => setSearchParams({ conversationId: String(item.id) })}
                >
                  <ConversationListItem conversation={item} />
                </List.Item>
              )}
            />
          ) : (
            <div style={{ padding: 'var(--space-24)' }}>
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无会话" />
            </div>
          )}
        </div>

        <div style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', minHeight: 640, display: 'flex', flexDirection: 'column' }}>
          {detailLoading || !detail ? (
            <div style={{ padding: 'var(--space-24)' }}>
              <Skeleton active paragraph={{ rows: 10 }} />
            </div>
          ) : (
            <>
              <div style={{ padding: 'var(--space-20)', borderBottom: '1px solid var(--color-border)' }}>
                <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }}>
                  <div>
                    <Typography.Title level={4} style={{ margin: 0 }}>{detail.summary.name}</Typography.Title>
                    <Typography.Paragraph style={{ margin: '6px 0 0', color: 'var(--color-text-muted)' }}>
                      {detail.summary.poiName ? `关联 POI：${detail.summary.poiName}` : '群聊协作会话'}
                    </Typography.Paragraph>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
                    {detail.summary.participants.map((participant) => (
                      <Tag key={participant.userId} color={participant.online ? 'green' : 'default'}>
                        {participant.realName}
                      </Tag>
                    ))}
                  </div>
                </Space>
              </div>

              <div style={{ flex: 1, padding: 'var(--space-20)', overflowY: 'auto', backgroundColor: 'var(--color-bg-subtle)' }}>
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  {detail.messages.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        maxWidth: '78%',
                        marginLeft: item.mine ? 'auto' : 0,
                        padding: '12px 14px',
                        backgroundColor: item.mine ? 'var(--color-primary)' : 'var(--color-bg-base)',
                        color: item.mine ? '#FFFFFF' : 'var(--color-text-base)',
                        border: item.mine ? 'none' : '1px solid var(--color-border)',
                      }}
                    >
                      <div style={{ fontSize: 12, opacity: item.mine ? 0.9 : 0.7, marginBottom: 6 }}>
                        {item.senderName} · {new Date(item.createdAt).toLocaleString()}
                      </div>
                      <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{item.content}</div>
                    </div>
                  ))}
                </Space>
              </div>

              <div style={{ padding: 'var(--space-20)', borderTop: '1px solid var(--color-border)' }}>
                <Space.Compact style={{ width: '100%' }}>
                  <Input.TextArea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    autoSize={{ minRows: 2, maxRows: 4 }}
                    placeholder="输入协作消息，发送后会实时推送给相关角色。"
                    onPressEnter={(event) => {
                      if (!event.shiftKey) {
                        event.preventDefault();
                        submitMessage();
                      }
                    }}
                  />
                  <Button type="primary" onClick={submitMessage} loading={sendMutation.isPending} style={{ height: 'auto' }}>
                    发送
                  </Button>
                </Space.Compact>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ConversationListItem({ conversation }: { conversation: ChatConversationSummary }) {
  const subtitle = conversation.lastMessagePreview || (conversation.conversationType === 'GROUP' ? '进入群聊，和同角色成员同步进展。' : '从 POI 详情发起后，沟通记录会留痕。');

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-12)' }}>
        <div style={{ minWidth: 0 }}>
          <Space size={8} wrap>
            <Typography.Text strong>{conversation.name}</Typography.Text>
            {conversation.poiName ? <Tag color="blue">{conversation.poiName}</Tag> : <Tag>{conversation.conversationType === 'GROUP' ? '群聊' : '私聊'}</Tag>}
          </Space>
          <Typography.Paragraph ellipsis={{ rows: 2 }} style={{ margin: '8px 0 0', color: 'var(--color-text-muted)' }}>
            {subtitle}
          </Typography.Paragraph>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            {conversation.lastMessageAt ? new Date(conversation.lastMessageAt).toLocaleString() : '-'}
          </div>
          {conversation.unreadCount > 0 ? <Badge count={conversation.unreadCount} style={{ marginTop: 8 }} /> : null}
        </div>
      </div>
    </div>
  );
}
