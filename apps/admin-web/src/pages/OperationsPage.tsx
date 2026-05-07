import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Form, Input, Modal, Select, Table, Tabs, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  createDictionary,
  fetchDictionaries,
  fetchLoginLogs,
  fetchOperationLogs,
  fetchUsers,
  fetchWorkflowRules,
  updateDictionary,
  updateUser,
  updateWorkflowRule,
} from '../api/operations';
import type { AdminUser, DictItem, DictType, LoginLogItem, OperationLogItem, WorkflowRule } from '../types/operations';

export default function OperationsPage() {
  const queryClient = useQueryClient();
  const [dictOpen, setDictOpen] = useState(false);
  const [ruleOpen, setRuleOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [activeDictType, setActiveDictType] = useState<DictType>('POI_CATEGORY');
  const [editingDict, setEditingDict] = useState<DictItem | null>(null);
  const [editingRule, setEditingRule] = useState<WorkflowRule | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [dictForm] = Form.useForm();
  const [ruleForm] = Form.useForm();
  const [userForm] = Form.useForm();

  const { data: categories = [] } = useQuery({ queryKey: ['dicts', 'POI_CATEGORY'], queryFn: () => fetchDictionaries('POI_CATEGORY') });
  const { data: issues = [] } = useQuery({ queryKey: ['dicts', 'REVIEW_ISSUE'], queryFn: () => fetchDictionaries('REVIEW_ISSUE') });
  const { data: rules = [] } = useQuery({ queryKey: ['workflow-rules'], queryFn: fetchWorkflowRules });
  const { data: users = [] } = useQuery({ queryKey: ['admin-users'], queryFn: fetchUsers });
  const { data: operationLogs = [] } = useQuery({ queryKey: ['operation-logs'], queryFn: fetchOperationLogs });
  const { data: loginLogs = [] } = useQuery({ queryKey: ['login-logs'], queryFn: fetchLoginLogs });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['dicts', 'POI_CATEGORY'] }),
      queryClient.invalidateQueries({ queryKey: ['dicts', 'REVIEW_ISSUE'] }),
      queryClient.invalidateQueries({ queryKey: ['workflow-rules'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
      queryClient.invalidateQueries({ queryKey: ['operation-logs'] }),
      queryClient.invalidateQueries({ queryKey: ['login-logs'] }),
    ]);
  };

  const dictMutation = useMutation({
    mutationFn: (values: { itemCode: string; itemName: string; description?: string; sortOrder: number; active: boolean }) => {
      const payload = {
        type: activeDictType,
        itemCode: values.itemCode,
        itemName: values.itemName,
        description: values.description ?? null,
        sortOrder: Number(values.sortOrder ?? 0),
        active: values.active,
      };
      return editingDict ? updateDictionary(editingDict.id, payload) : createDictionary(payload);
    },
    onSuccess: async () => {
      message.success(editingDict ? '字典项已更新' : '字典项已创建');
      setDictOpen(false);
      setEditingDict(null);
      await invalidate();
    },
  });

  const ruleMutation = useMutation({
    mutationFn: (values: { configValue: string; active: boolean }) => updateWorkflowRule(editingRule!.id, { configValue: values.configValue, active: values.active }),
    onSuccess: async () => {
      message.success('规则已更新');
      setRuleOpen(false);
      setEditingRule(null);
      await invalidate();
    },
  });

  const userMutation = useMutation({
    mutationFn: (values: { status: 'ACTIVE' | 'INACTIVE'; roles: string[] }) => updateUser(editingUser!.id, { status: values.status, roles: values.roles }),
    onSuccess: async () => {
      message.success('用户配置已更新');
      setUserOpen(false);
      setEditingUser(null);
      await invalidate();
    },
  });

  const dictColumns: ColumnsType<DictItem> = [
    { title: '编码', dataIndex: 'itemCode', key: 'itemCode' },
    { title: '名称', dataIndex: 'itemName', key: 'itemName' },
    { title: '排序', dataIndex: 'sortOrder', key: 'sortOrder' },
    {
      title: '启用',
      dataIndex: 'active',
      key: 'active',
      render: (value: boolean) => (value ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>),
    },
    {
      title: '系统默认',
      dataIndex: 'systemDefault',
      key: 'systemDefault',
      render: (value: boolean) => (value ? <Tag color="blue">内置</Tag> : <Tag>自定义</Tag>),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button
          size="small"
          onClick={() => {
            setEditingDict(record);
            dictForm.setFieldsValue(record);
            setDictOpen(true);
          }}
        >
          编辑
        </Button>
      ),
    },
  ];

  const ruleColumns: ColumnsType<WorkflowRule> = [
    { title: '规则编码', dataIndex: 'code', key: 'code' },
    { title: '规则名称', dataIndex: 'name', key: 'name' },
    { title: '配置值', dataIndex: 'configValue', key: 'configValue' },
    { title: '说明', dataIndex: 'description', key: 'description' },
    {
      title: '状态',
      dataIndex: 'active',
      key: 'active',
      render: (value: boolean) => (value ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button
          size="small"
          onClick={() => {
            setEditingRule(record);
            ruleForm.setFieldsValue(record);
            setRuleOpen(true);
          }}
        >
          编辑
        </Button>
      ),
    },
  ];

  const userColumns: ColumnsType<AdminUser> = [
    { title: '用户名', dataIndex: 'username', key: 'username' },
    { title: '姓名', dataIndex: 'realName', key: 'realName' },
    { title: '手机号', dataIndex: 'phone', key: 'phone' },
    { title: '角色', key: 'roles', render: (_, record) => record.roles.join(' / ') },
    {
      title: '微信绑定',
      key: 'wechatBound',
      render: (_, record) => record.wechatBound ? <Tag color="green">{record.wechatNickname ?? '已绑定'}</Tag> : <Tag>未绑定</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (value: string) => value === 'ACTIVE' ? <Tag color="green">启用</Tag> : <Tag color="red">停用</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button
          size="small"
          onClick={() => {
            setEditingUser(record);
            userForm.setFieldsValue(record);
            setUserOpen(true);
          }}
        >
          编辑
        </Button>
      ),
    },
  ];

  const operationColumns: ColumnsType<OperationLogItem> = [
    { title: '时间', dataIndex: 'createdAt', key: 'createdAt', width: 180 },
    { title: '操作人', dataIndex: 'operatorName', key: 'operatorName', width: 120 },
    { title: '业务', dataIndex: 'bizType', key: 'bizType', width: 100 },
    { title: '业务 ID', dataIndex: 'bizId', key: 'bizId', width: 100 },
    { title: '动作', dataIndex: 'actionCode', key: 'actionCode', width: 160 },
    { title: '内容', dataIndex: 'content', key: 'content' },
  ];

  const loginColumns: ColumnsType<LoginLogItem> = [
    { title: '时间', dataIndex: 'createdAt', key: 'createdAt', width: 180 },
    { title: '账号', dataIndex: 'username', key: 'username', width: 140 },
    { title: 'IP', dataIndex: 'loginIp', key: 'loginIp', width: 150 },
    {
      title: '结果',
      dataIndex: 'loginResult',
      key: 'loginResult',
      width: 100,
      render: (value: string) => value === 'SUCCESS' ? <Tag color="green">成功</Tag> : <Tag color="red">失败</Tag>,
    },
    { title: '说明', dataIndex: 'resultMessage', key: 'resultMessage' },
  ];

  return (
    <div>
      <div className="section-block" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <Typography.Title level={3} style={{ margin: 0, fontWeight: 700 }}>后台运营配置</Typography.Title>
          <Typography.Paragraph style={{ margin: '8px 0 0', color: 'var(--color-text-muted)' }}>
            阶段 8 在原有运营配置基础上补齐微信绑定视图、审计日志和登录留痕。
          </Typography.Paragraph>
        </div>
        <Button
          type="primary"
          onClick={() => {
            setEditingDict(null);
            dictForm.resetFields();
            dictForm.setFieldsValue({ active: true, sortOrder: 0 });
            setDictOpen(true);
          }}
        >
          新建字典项
        </Button>
      </div>

      <Tabs
        items={[
          {
            key: 'categories',
            label: 'POI 分类管理',
            children: <Table rowKey="id" columns={dictColumns} dataSource={categories} pagination={{ pageSize: 8 }} />,
          },
          {
            key: 'issues',
            label: '错误类型管理',
            children: <Table rowKey="id" columns={dictColumns} dataSource={issues} pagination={{ pageSize: 8 }} />,
          },
          {
            key: 'rules',
            label: '流程规则',
            children: <Table rowKey="id" columns={ruleColumns} dataSource={rules} pagination={{ pageSize: 8 }} />,
          },
          {
            key: 'users',
            label: '用户角色管理',
            children: <Table rowKey="id" columns={userColumns} dataSource={users} pagination={{ pageSize: 8 }} />,
          },
          {
            key: 'operations',
            label: '操作审计',
            children: <Table rowKey="id" columns={operationColumns} dataSource={operationLogs} pagination={{ pageSize: 8 }} scroll={{ x: 960 }} />,
          },
          {
            key: 'logins',
            label: '登录留痕',
            children: <Table rowKey="id" columns={loginColumns} dataSource={loginLogs} pagination={{ pageSize: 8 }} scroll={{ x: 840 }} />,
          },
        ]}
        onChange={(key) => {
          if (key === 'categories') {
            setActiveDictType('POI_CATEGORY');
          } else if (key === 'issues') {
            setActiveDictType('REVIEW_ISSUE');
          }
        }}
      />

      <Modal open={dictOpen} title={editingDict ? '编辑字典项' : '新建字典项'} onCancel={() => setDictOpen(false)} onOk={() => void dictForm.submit()} confirmLoading={dictMutation.isPending} destroyOnClose>
        <Form form={dictForm} layout="vertical" onFinish={(values) => dictMutation.mutate(values)}>
          <Form.Item label="编码" name="itemCode" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="名称" name="itemName" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="说明" name="description"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item label="排序" name="sortOrder" rules={[{ required: true }]}><Input type="number" /></Form.Item>
          <Form.Item label="启用状态" name="active" rules={[{ required: true }]}><Select options={[{ value: true, label: '启用' }, { value: false, label: '停用' }]} /></Form.Item>
        </Form>
      </Modal>

      <Modal open={ruleOpen} title="编辑流程规则" onCancel={() => setRuleOpen(false)} onOk={() => void ruleForm.submit()} confirmLoading={ruleMutation.isPending} destroyOnClose>
        <Form form={ruleForm} layout="vertical" onFinish={(values) => ruleMutation.mutate(values)}>
          <Form.Item label="规则名称" name="name"><Input disabled /></Form.Item>
          <Form.Item label="配置值" name="configValue" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="启用状态" name="active" rules={[{ required: true }]}><Select options={[{ value: true, label: '启用' }, { value: false, label: '停用' }]} /></Form.Item>
        </Form>
      </Modal>

      <Modal open={userOpen} title="编辑用户角色" onCancel={() => setUserOpen(false)} onOk={() => void userForm.submit()} confirmLoading={userMutation.isPending} destroyOnClose>
        <Form form={userForm} layout="vertical" onFinish={(values) => userMutation.mutate(values)}>
          <Form.Item label="账号" name="username"><Input disabled /></Form.Item>
          <Form.Item label="状态" name="status" rules={[{ required: true }]}><Select options={[{ value: 'ACTIVE', label: '启用' }, { value: 'INACTIVE', label: '停用' }]} /></Form.Item>
          <Form.Item label="角色" name="roles" rules={[{ required: true }]}><Select mode="multiple" options={[{ value: 'COLLECTOR', label: '采集者' }, { value: 'VERIFIER', label: '核验者' }, { value: 'ADMIN', label: '管理员' }]} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
