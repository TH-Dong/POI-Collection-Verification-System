export type TaskType = 'COLLECTION' | 'VERIFY' | 'DISPUTE' | 'ARBITRATION';
export type TaskStatus = 'PENDING' | 'PROCESSING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'DECIDED' | 'OVERDUE' | 'CLOSED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type NoticeType = 'SYSTEM' | 'TASK' | 'CHAT' | 'BROADCAST' | 'WORKFLOW';
export type NoticeReceiverScope = 'ALL' | 'ROLE' | 'USER';
export type DictType = 'POI_CATEGORY' | 'REVIEW_ISSUE';
export type UserStatus = 'ACTIVE' | 'INACTIVE';

export interface DashboardSummaryCard {
  total: number;
  pending: number;
  completed: number;
}

export interface DashboardMetricItem {
  code: string;
  label: string;
  count: number;
}

export interface AdminDashboard {
  poiSummary: DashboardSummaryCard;
  disputeSummary: DashboardSummaryCard;
  taskSummary: DashboardSummaryCard;
  noticeSummary: DashboardSummaryCard;
  poiStatusMetrics: DashboardMetricItem[];
  categoryMetrics: DashboardMetricItem[];
  taskTypeMetrics: DashboardMetricItem[];
  userRoleMetrics: DashboardMetricItem[];
  integrationMetrics: DashboardMetricItem[];
}

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

export interface TaskUpsertPayload {
  taskType: TaskType;
  bizType: string;
  bizId: number;
  title: string;
  description: string | null;
  assigneeId: number | null;
  priority: TaskPriority;
  status?: TaskStatus;
  dueAt: string | null;
}

export interface NoticeItem {
  noticeUserId: number | null;
  noticeId: number;
  noticeType: NoticeType;
  templateCode: string | null;
  title: string;
  content: string;
  receiverScope: NoticeReceiverScope;
  targetRoles: string[];
  readFlag: boolean;
  readAt: string | null;
  createdAt: string;
  createdByName: string;
  totalReceivers: number;
  readReceivers: number;
}

export interface NoticeTemplate {
  id: number;
  templateCode: string;
  name: string;
  titleTemplate: string;
  contentTemplate: string;
  enabled: boolean;
}

export interface BroadcastPayload {
  title: string;
  content: string;
  receiverScope: NoticeReceiverScope;
  roleCodes: string[];
  userIds: number[];
}

export interface DictItem {
  id: number;
  type: DictType;
  itemCode: string;
  itemName: string;
  description: string | null;
  sortOrder: number;
  active: boolean;
  systemDefault: boolean;
}

export interface DictUpsertPayload {
  type: DictType;
  itemCode: string;
  itemName: string;
  description: string | null;
  sortOrder: number;
  active: boolean;
}

export interface WorkflowRule {
  id: number;
  code: string;
  name: string;
  configValue: string;
  description: string | null;
  active: boolean;
}

export interface WorkflowRuleUpdatePayload {
  configValue: string;
  active: boolean;
}

export interface AdminUser {
  id: number;
  username: string;
  realName: string;
  phone: string | null;
  status: UserStatus;
  roles: string[];
  wechatBound: boolean;
  wechatNickname: string | null;
  wechatBoundAt: string | null;
}

export interface UserUpdatePayload {
  status: UserStatus;
  roles: string[];
}

export interface OperationLogItem {
  id: number;
  operatorId: number | null;
  operatorName: string;
  bizType: string;
  bizId: number | null;
  actionCode: string;
  content: string;
  requestId: string | null;
  createdAt: string;
}

export interface LoginLogItem {
  id: number;
  userId: number | null;
  username: string;
  loginIp: string;
  loginResult: string;
  resultMessage: string;
  createdAt: string;
}
