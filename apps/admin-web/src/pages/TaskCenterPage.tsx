import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, DatePicker, Form, Input, Modal, Select, Segmented, Space, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { createTask, fetchMyTasks, fetchTasks, fetchUsers, updateTask, updateTaskStatus } from '../api/operations';
import { useAuthStore } from '../store/authStore';
import type { AdminUser, TaskItem, TaskPriority, TaskStatus, TaskType } from '../types/operations';
import { hasRole } from '../utils/role';

const TASK_TYPE_LABEL: Record<TaskType, string> = {
  COLLECTION: '采集任务',
  VERIFY: '核验任务',
  DISPUTE: '争议处理',
  ARBITRATION: '最终裁定',
};

const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  PENDING: '待处理',
  PROCESSING: '处理中',
  SUBMITTED: '已提交',
  APPROVED: '已通过',
  REJECTED: '已驳回',
  DECIDED: '已裁定',
  OVERDUE: '已逾期',
  CLOSED: '已关闭',
};

const TASK_PRIORITY_COLOR: Record<TaskPriority, string> = {
  LOW: '#71717A',
  MEDIUM: '#3B6FF5',
  HIGH: '#B56A19',
  URGENT: '#E5484D',
};

export default function TaskCenterPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const isAdmin = hasRole(user?.roles, 'ADMIN');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TaskStatus>('ALL');
  const [keyword, setKeyword] = useState('');
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', isAdmin ? 'admin' : 'mine'],
    queryFn: isAdmin ? fetchTasks : fetchMyTasks,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users', 'task-options'],
    queryFn: fetchUsers,
    enabled: isAdmin,
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['tasks', 'admin'] }),
      queryClient.invalidateQueries({ queryKey: ['tasks', 'mine'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    ]);
  };

  const saveMutation = useMutation({
    mutationFn: async (values: any) => {
      const payload = {
        taskType: values.taskType,
        bizType: values.bizType,
        bizId: Number(values.bizId),
        title: values.title,
        description: values.description ?? null,
        assigneeId: values.assigneeId ?? null,
        priority: values.priority,
        status: values.status,
        dueAt: values.dueAt ? values.dueAt.toISOString() : null,
      };
      return editingTask ? updateTask(editingTask.id, payload) : createTask(payload);
    },
    onSuccess: async () => {
      message.success(editingTask ? '任务已更新' : '任务已创建');
      setOpen(false);
      setEditingTask(null);
      form.resetFields();
      await invalidate();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '保存任务失败');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: number; status: TaskStatus }) => updateTaskStatus(taskId, status),
    onSuccess: async () => {
      await invalidate();
    },
  });

  const filteredTasks = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    return tasks.filter((item) => {
      const matchesKeyword =
        !normalized ||
        item.title.toLowerCase().includes(normalized) ||
        item.description?.toLowerCase().includes(normalized) ||
        item.assigneeName?.toLowerCase().includes(normalized) ||
        item.bizType.toLowerCase().includes(normalized);
      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
      return matchesKeyword && matchesStatus;
    });
  }, [keyword, statusFilter, tasks]);

  const taskStats = useMemo(() => ({
    total: tasks.length,
    pending: tasks.filter((item) => item.status === 'PENDING' || item.status === 'PROCESSING' || item.status === 'OVERDUE').length,
    overdue: tasks.filter((item) => item.overdue || item.status === 'OVERDUE').length,
    urgent: tasks.filter((item) => item.priority === 'HIGH' || item.priority === 'URGENT').length,
  }), [tasks]);

  const userOptions = useMemo(() => users.map((item) => ({
    label: `${item.realName} (${item.roles.join('/')})`,
    value: item.id,
  })), [users]);

  const openCreateModal = () => {
    setEditingTask(null);
    form.resetFields();
    form.setFieldsValue({ taskType: 'VERIFY', bizType: 'POI', priority: 'MEDIUM', status: 'PENDING' });
    setOpen(true);
  };

  const openEditModal = (task: TaskItem) => {
    setEditingTask(task);
    form.setFieldsValue({
      taskType: task.taskType,
      bizType: task.bizType,
      bizId: task.bizId,
      title: task.title,
      description: task.description,
      assigneeId: task.assigneeId,
      priority: task.priority,
      status: task.status,
      dueAt: task.dueAt ? new Date(task.dueAt) : null,
    });
    setOpen(true);
  };

  const columns: ColumnsType<TaskItem> = [
    {
      title: '任务',
      dataIndex: 'title',
      key: 'title',
      render: (_, record) => (
        <div>
          <Typography.Text strong>{record.title}</Typography.Text>
          <div style={{ marginTop: 4, fontSize: 12, color: 'var(--color-text-muted)' }}>
            {TASK_TYPE_LABEL[record.taskType]} · {record.bizType}#{record.bizId}
          </div>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (value: TaskStatus, record) => (
        <Tag color={record.overdue ? 'red' : 'blue'}>{TASK_STATUS_LABEL[value]}</Tag>
      ),
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      render: (value: TaskPriority) => <span style={{ color: TASK_PRIORITY_COLOR[value], fontWeight: 600 }}>{value}</span>,
    },
    {
      title: '负责人',
      dataIndex: 'assigneeName',
      key: 'assigneeName',
      render: (_, record) => record.assigneeName ? `${record.assigneeName} · ${record.assigneeRoles.join('/')}` : '未分配',
    },
    {
      title: '截止时间',
      dataIndex: 'dueAt',
      key: 'dueAt',
      render: (value: string | null) => value ? new Date(value).toLocaleString() : '未设置',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          {isAdmin ? <Button size="small" onClick={() => openEditModal(record)}>编辑</Button> : null}
          {record.status !== 'PROCESSING' && record.status !== 'CLOSED' ? (
            <Button size="small" onClick={() => statusMutation.mutate({ taskId: record.id, status: 'PROCESSING' })}>
              开始处理
            </Button>
          ) : null}
          {record.status !== 'CLOSED' && record.status !== 'APPROVED' && record.status !== 'REJECTED' && record.status !== 'DECIDED' ? (
            <Button size="small" type="primary" onClick={() => statusMutation.mutate({ taskId: record.id, status: 'CLOSED' })}>
              关闭
            </Button>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="section-block" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <Typography.Title level={3} style={{ margin: 0, fontWeight: 700 }}>任务中心</Typography.Title>
          <Typography.Paragraph style={{ margin: '8px 0 0', color: 'var(--color-text-muted)' }}>
            {isAdmin ? '管理员负责分配采集、核验和裁定任务，并监控积压与逾期。' : '核验者从这里接收系统分发的待办任务。'}
          </Typography.Paragraph>
        </div>
        <Space>
          <Input.Search placeholder="搜索任务" value={keyword} onChange={(event) => setKeyword(event.target.value)} style={{ width: 280 }} />
          {isAdmin ? <Button type="primary" onClick={openCreateModal}>新建任务</Button> : null}
        </Space>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: '任务总量', value: taskStats.total, hint: '系统内当前已登记的任务。', tone: '#3F3F46' },
          { label: '待处理', value: taskStats.pending, hint: '尚未形成终态的任务。', tone: '#3B6FF5' },
          { label: '高优先级', value: taskStats.urgent, hint: '优先级为 HIGH / URGENT。', tone: '#B56A19' },
          { label: '逾期风险', value: taskStats.overdue, hint: '已逾期或接近超时的任务。', tone: '#E5484D' },
        ].map((item) => (
          <div key={item.label} style={{ borderRadius: 16, padding: '18px 20px', backgroundColor: 'var(--color-bg-base)', border: '1px solid rgba(15, 23, 42, 0.08)' }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{item.label}</div>
            <div style={{ marginTop: 10, fontSize: 34, fontWeight: 700, color: item.tone }}>{item.value}</div>
            <div style={{ marginTop: 8, fontSize: 13, color: 'var(--color-text-muted)' }}>{item.hint}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography.Text style={{ color: 'var(--color-text-muted)' }}>状态筛选</Typography.Text>
        <Segmented
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as 'ALL' | TaskStatus)}
          options={[
            { label: '全部', value: 'ALL' },
            { label: '待处理', value: 'PENDING' },
            { label: '处理中', value: 'PROCESSING' },
            { label: '逾期', value: 'OVERDUE' },
            { label: '已关闭', value: 'CLOSED' },
          ]}
        />
      </div>

      <Table rowKey="id" loading={isLoading} dataSource={filteredTasks} columns={columns} pagination={{ pageSize: 10 }} />

      <Modal
        open={open}
        title={editingTask ? '编辑任务' : '新建任务'}
        onCancel={() => {
          setOpen(false);
          setEditingTask(null);
          form.resetFields();
        }}
        onOk={() => void form.submit()}
        confirmLoading={saveMutation.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={(values) => saveMutation.mutate(values)}>
          <Form.Item name="taskType" label="任务类型" rules={[{ required: true }]}>
            <Select options={Object.entries(TASK_TYPE_LABEL).map(([value, label]) => ({ value, label }))} />
          </Form.Item>
          <Form.Item name="bizType" label="业务类型" rules={[{ required: true }]}>
            <Select options={[{ value: 'POI', label: 'POI' }, { value: 'DISPUTE', label: 'DISPUTE' }]} />
          </Form.Item>
          <Form.Item name="bizId" label="业务 ID" rules={[{ required: true }]}>
            <Input type="number" />
          </Form.Item>
          <Form.Item name="title" label="任务标题" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="任务说明">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="assigneeId" label="负责人">
            <Select allowClear options={userOptions} />
          </Form.Item>
          <Form.Item name="priority" label="优先级" rules={[{ required: true }]}>
            <Select options={Object.keys(TASK_PRIORITY_COLOR).map((value) => ({ value, label: value }))} />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}>
            <Select options={Object.entries(TASK_STATUS_LABEL).map(([value, label]) => ({ value, label }))} />
          </Form.Item>
          <Form.Item name="dueAt" label="截止时间">
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
