export type TaskStatus = 'PENDING' | 'PROCESSING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'DECIDED' | 'OVERDUE' | 'CLOSED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskType = 'COLLECTION' | 'VERIFY' | 'DISPUTE' | 'ARBITRATION';

export interface TaskItem {
  id: number;
  taskType: TaskType;
  bizType: string;
  bizId: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: number | null;
  assigneeName: string | null;
  assigneeRoles: string[];
  createdById: number | null;
  createdByName: string | null;
  sourceEvent: string | null;
  dueAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  overdue: boolean;
}

export interface NoticeItem {
  noticeUserId: number | null;
  noticeId: number;
  noticeType: 'SYSTEM' | 'TASK' | 'CHAT' | 'BROADCAST' | 'WORKFLOW';
  templateCode: string | null;
  title: string;
  content: string;
  receiverScope: 'ALL' | 'ROLE' | 'USER';
  targetRoles: string[];
  readFlag: boolean;
  readAt: string | null;
  createdAt: string;
  createdByName: string;
  totalReceivers: number;
  readReceivers: number;
}

export interface MobileWorkbench {
  title: string;
  message: string;
  pendingTaskCount: number;
  urgentTaskCount: number;
  unreadNoticeCount: number;
  unreadChatCount: number;
}
