export type ConversationType = 'PRIVATE' | 'GROUP';
export type MessageType = 'TEXT' | 'SYSTEM';

export interface ChatParticipant {
  userId: number;
  username: string;
  realName: string;
  roles: string[];
  online: boolean;
}

export interface ChatMessage {
  id: number;
  conversationId: number;
  senderId: number | null;
  senderName: string;
  senderRoles: string[];
  messageType: MessageType;
  content: string;
  createdAt: string;
  mine: boolean;
}

export interface ChatConversationSummary {
  id: number;
  conversationType: ConversationType;
  name: string;
  groupCode: string | null;
  poiId: number | null;
  poiName: string | null;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  participants: ChatParticipant[];
}

export interface ChatConversationDetail {
  summary: ChatConversationSummary;
  messages: ChatMessage[];
}

export interface ChatUnreadSummary {
  unreadCount: number;
  unreadConversationCount: number;
}
