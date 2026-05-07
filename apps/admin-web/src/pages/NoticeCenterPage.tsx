import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Form, Input, Modal, Select, Space, Table, Tabs, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  broadcastNotice,
  createNoticeTemplate,
  fetchMyNotices,
  fetchNoticeHistory,
  fetchNoticeTemplates,
  fetchUsers,
  markNoticeRead,
  updateNoticeTemplate,
} from '../api/operations';
import { useAuthStore } from '../store/authStore';
import type { NoticeItem, NoticeTemplate } from '../types/operations';
import { hasRole } from '../utils/role';

export default function NoticeCenterPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const isAdmin = hasRole(user?.roles, 'ADMIN');
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NoticeTemplate | null>(null);
  const [broadcastForm] = Form.useForm();
  const [templateForm] = Form.useForm();

  const { data: myNotices = [], isLoading } = useQuery({
    queryKey: ['notices', 'mine'],
    queryFn: fetchMyNotices,
  });
  const { data: history = [] } = useQuery({
    queryKey: ['notices', 'history'],
    queryFn: fetchNoticeHistory,
    enabled: isAdmin,
  });
  const { data: templates = [] } = useQuery({
    queryKey: ['notice-templates'],
    queryFn: fetchNoticeTemplates,
    enabled: isAdmin,
  });
  const { data: users = [] } = useQuery({
    queryKey: ['admin-users', 'notice-options'],
    queryFn: fetchUsers,
    enabled: isAdmin,
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['notices', 'mine'] }),
      queryClient.invalidateQueries({ queryKey: ['notices', 'history'] }),
      queryClient.invalidateQueries({ queryKey: ['notice-templates'] }),
    ]);
  };

  const readMutation = useMutation({
    mutationFn: (noticeUserId: number) => markNoticeRead(noticeUserId),
    onSuccess: invalidate,
  });

  const broadcastMutation = useMutation({
    mutationFn: (values: any) => broadcastNotice({
      title: values.title,
      content: values.content,
      receiverScope: values.receiverScope,
      roleCodes: values.roleCodes ?? [],
      userIds: values.userIds ?? [],
    }),
    onSuccess: async () => {
      message.success('通知已群发');
      setBroadcastOpen(false);
      broadcastForm.resetFields();
      await invalidate();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '群发通知失败');
    },
  });

  const templateMutation = useMutation({
    mutationFn: (values: any) => {
      const payload = {
        templateCode: values.templateCode,
        name: values.name,
        titleTemplate: values.titleTemplate,
        contentTemplate: values.contentTemplate,
        enabled: values.enabled,
      };
      return editingTemplate ? updateNoticeTemplate(editingTemplate.id, payload) : createNoticeTemplate(payload);
    },
    onSuccess: async () => {
      message.success(editingTemplate ? '模板已更新' : '模板已创建');
      setTemplateOpen(false);
      setEditingTemplate(null);
      templateForm.resetFields();
      await invalidate();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '保存模板失败');
    },
  });

  const myNoticeColumns: ColumnsType<NoticeItem> = [
    {
      title: '通知',
      dataIndex: 'title',
      key: 'title',
      render: (_, record) => (
        <div>
          <Typography.Text strong>{record.title}</Typography.Text>
          <div style={{ marginTop: 4, color: 'var(--color-text-muted)', fontSize: 12 }}>{record.content}</div>
        </div>
      ),
    },
    {
      title: '类型',
      dataIndex: 'noticeType',
      key: 'noticeType',
      render: (value) => <Tag>{value}</Tag>,
    },
    {
      title: '状态',
      key: 'readFlag',
      render: (_, record) => record.readFlag ? <Tag color="green">已读</Tag> : <Tag color="gold">未读</Tag>,
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value: string) => new Date(value).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => record.noticeUserId && !record.readFlag ? (
        <Button size="small" onClick={() => readMutation.mutate(record.noticeUserId!)}>标记已读</Button>
      ) : null,
    },
  ];

  const historyColumns: ColumnsType<NoticeItem> = [
    { title: '标题', dataIndex: 'title', key: 'title' },
    { title: '范围', dataIndex: 'receiverScope', key: 'receiverScope' },
    {
      title: '触达情况',
      key: 'progress',
      render: (_, record) => `${record.readReceivers} / ${record.totalReceivers} 已读`,
    },
    {
      title: '创建人',
      dataIndex: 'createdByName',
      key: 'createdByName',
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value: string) => new Date(value).toLocaleString(),
    },
  ];

  const templateColumns: ColumnsType<NoticeTemplate> = [
    { title: '模板编码', dataIndex: 'templateCode', key: 'templateCode' },
    { title: '模板名称', dataIndex: 'name', key: 'name' },
    { title: '标题模板', dataIndex: 'titleTemplate', key: 'titleTemplate' },
    {
      title: '启用',
      dataIndex: 'enabled',
      key: 'enabled',
      render: (value: boolean) => value ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button
          size="small"
          onClick={() => {
            setEditingTemplate(record);
            templateForm.setFieldsValue(record);
            setTemplateOpen(true);
          }}
        >
          编辑
        </Button>
      ),
    },
  ];

  const userOptions = useMemo(() => users.map((item) => ({ value: item.id, label: `${item.realName} (${item.roles.join('/')})` })), [users]);

  return (
    <div>
      <div className="section-block" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <Typography.Title level={3} style={{ margin: 0, fontWeight: 700 }}>通知中心</Typography.Title>
          <Typography.Paragraph style={{ margin: '8px 0 0', color: 'var(--color-text-muted)' }}>
            {isAdmin ? '管理员可以群发通知、管理模板，并查看送达与已读情况。' : '角色变更、任务派发和流程结果都会沉淀为站内通知。'}
          </Typography.Paragraph>
        </div>
        {isAdmin ? (
          <Space>
            <Button onClick={() => { setEditingTemplate(null); templateForm.resetFields(); templateForm.setFieldsValue({ enabled: true }); setTemplateOpen(true); }}>新建模板</Button>
            <Button type="primary" onClick={() => { broadcastForm.resetFields(); broadcastForm.setFieldsValue({ receiverScope: 'ROLE', roleCodes: ['COLLECTOR'] }); setBroadcastOpen(true); }}>群发通知</Button>
          </Space>
        ) : null}
      </div>

      <Tabs
        items={[
          {
            key: 'mine',
            label: `我的通知 (${myNotices.filter((item) => !item.readFlag).length} 未读)`,
            children: <Table rowKey={(record) => `${record.noticeId}-${record.noticeUserId ?? 'mine'}`} loading={isLoading} columns={myNoticeColumns} dataSource={myNotices} pagination={{ pageSize: 8 }} />,
          },
          ...(isAdmin ? [
            {
              key: 'history',
              label: '群发记录',
              children: <Table rowKey="noticeId" columns={historyColumns} dataSource={history} pagination={{ pageSize: 8 }} />,
            },
            {
              key: 'templates',
              label: '通知模板',
              children: <Table rowKey="id" columns={templateColumns} dataSource={templates} pagination={{ pageSize: 8 }} />,
            },
          ] : []),
        ]}
      />

      <Modal
        open={broadcastOpen}
        title="群发通知"
        onCancel={() => setBroadcastOpen(false)}
        onOk={() => void broadcastForm.submit()}
        confirmLoading={broadcastMutation.isPending}
        destroyOnClose
      >
        <Form form={broadcastForm} layout="vertical" onFinish={(values) => broadcastMutation.mutate(values)}>
          <Form.Item name="title" label="标题" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="content" label="内容" rules={[{ required: true }]}>
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="receiverScope" label="接收范围" rules={[{ required: true }]}>
            <Select options={[{ value: 'ALL', label: '所有人' }, { value: 'ROLE', label: '按角色' }, { value: 'USER', label: '指定用户' }]} />
          </Form.Item>
          <Form.Item shouldUpdate noStyle>
            {() => {
              const scope = broadcastForm.getFieldValue('receiverScope');
              return (
                <>
                  {scope === 'ROLE' ? (
                    <Form.Item name="roleCodes" label="角色" rules={[{ required: true }]}>
                      <Select mode="multiple" options={[{ value: 'COLLECTOR', label: '采集者' }, { value: 'VERIFIER', label: '核验者' }, { value: 'ADMIN', label: '管理员' }]} />
                    </Form.Item>
                  ) : null}
                  {scope === 'USER' ? (
                    <Form.Item name="userIds" label="指定用户" rules={[{ required: true }]}>
                      <Select mode="multiple" options={userOptions} />
                    </Form.Item>
                  ) : null}
                </>
              );
            }}
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={templateOpen}
        title={editingTemplate ? '编辑模板' : '新建模板'}
        onCancel={() => {
          setTemplateOpen(false);
          setEditingTemplate(null);
        }}
        onOk={() => void templateForm.submit()}
        confirmLoading={templateMutation.isPending}
        destroyOnClose
      >
        <Form form={templateForm} layout="vertical" onFinish={(values) => templateMutation.mutate(values)}>
          <Form.Item name="templateCode" label="模板编码" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name" label="模板名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="titleTemplate" label="标题模板" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="contentTemplate" label="内容模板" rules={[{ required: true }]}>
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="enabled" label="启用状态" rules={[{ required: true }]}>
            <Select options={[{ value: true, label: '启用' }, { value: false, label: '停用' }]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
