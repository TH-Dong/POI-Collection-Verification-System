import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Input, Segmented, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import { fetchAdminPois, fetchVerifierPendingPois } from '../api/poi';
import { useAuthStore } from '../store/authStore';
import type { PoiSummary } from '../types/poi';
import { getPoiStatusMeta } from '../utils/poi';
import { hasRole } from '../utils/role';

function renderStatus(status: PoiSummary['status']) {
  const meta = getPoiStatusMeta(status);
  return (
    <Tag
      bordered={false}
      style={{ color: meta.color, backgroundColor: meta.background, fontWeight: 600, paddingInline: 10, lineHeight: '24px', borderRadius: 999 }}
    >
      {meta.label}
    </Tag>
  );
}

export default function PoiListPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isAdmin = hasRole(user?.roles, 'ADMIN');
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | PoiSummary['status']>('ALL');
  const { data = [], isLoading } = useQuery({
    queryKey: ['poi-list', isAdmin ? 'admin' : 'verifier'],
    queryFn: isAdmin ? fetchAdminPois : fetchVerifierPendingPois,
  });

  const filteredData = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    return data.filter((item) => {
      const matchesKeyword =
        !normalized ||
        item.poiName.toLowerCase().includes(normalized) ||
        item.collectorName.toLowerCase().includes(normalized) ||
        item.categoryName?.toLowerCase().includes(normalized) ||
        item.addressText?.toLowerCase().includes(normalized) ||
        item.latestReviewComment?.toLowerCase().includes(normalized);

      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
      return matchesKeyword && matchesStatus;
    });
  }, [data, keyword, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: data.length,
      pending: data.filter((item) => item.status === 'SUBMITTED' || item.status === 'RESUBMITTED').length,
      rejected: data.filter((item) => item.status === 'REJECTED').length,
      approved: data.filter((item) => item.status === 'APPROVED').length,
      firstReview: data.filter((item) => item.status === 'SUBMITTED').length,
      resubmitted: data.filter((item) => item.status === 'RESUBMITTED').length,
    };
  }, [data]);

  const summaryCards = isAdmin
    ? [
        { label: '全量记录', value: stats.total, hint: '管理员看的不是队列，而是全链路存量。', tone: '#3F3F46' },
        { label: '待核验', value: stats.pending, hint: '仍未形成核验结论的记录。', tone: '#3B6FF5' },
        { label: '待整改', value: stats.rejected, hint: '采集者需要根据意见修改。', tone: '#B56A19' },
        { label: '已通过', value: stats.approved, hint: '已完成当前核验闭环。', tone: '#277C68' },
      ]
    : [
        { label: '当前待处理', value: stats.pending, hint: '这是核验者真正的工作量。', tone: '#3F3F46' },
        { label: '首次核验', value: stats.firstReview, hint: '首次进入核验队列的记录。', tone: '#3B6FF5' },
        { label: '整改复核', value: stats.resubmitted, hint: '采集者已整改，需要再次判断。', tone: '#3B6FF5' },
        { label: '已处理轮次', value: data.reduce((total, item) => total + item.reviewCount, 0), hint: '反映核验动作的累计次数。', tone: '#277C68' },
      ];

  const columns: ColumnsType<PoiSummary> = [
    {
      title: <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)' }}>节点名称 (NAME)</span>,
      dataIndex: 'poiName',
      key: 'poiName',
      render: (text) => <Typography.Text strong>{text}</Typography.Text>
    },
    {
      title: <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)' }}>分类 (CATEGORY)</span>,
      dataIndex: 'categoryName',
      key: 'categoryName',
      render: (_, record) => <span>{record.categoryName ?? '-'}</span>,
    },
    {
      title: <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)' }}>采集者 (COLLECTOR)</span>,
      dataIndex: 'collectorName',
      key: 'collectorName',
    },
    {
      title: <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)' }}>状态 (STATUS)</span>,
      dataIndex: 'status',
      key: 'status',
      render: renderStatus,
    },
    {
      title: <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)' }}>最新进展 (LATEST)</span>,
      key: 'latestProgress',
      render: (_, record) => (
        <div style={{ minWidth: 220 }}>
          <div style={{ fontSize: 13, color: 'var(--color-text-base)', fontWeight: 500 }}>
            {record.latestReviewComment ?? (record.status === 'RESUBMITTED' ? '采集者已按意见重新提交，等待复核。' : '等待核验动作。')}
          </div>
          <div style={{ marginTop: 4, fontSize: 12, color: 'var(--color-text-muted)' }}>
            {record.latestReviewerName ? `最近处理人：${record.latestReviewerName}` : '尚无核验记录'}
          </div>
        </div>
      ),
    },
    {
      title: <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)' }}>更新时间 (UPDATED)</span>,
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (value: string) => <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{new Date(value).toLocaleString()}</span>,
    },
    {
      title: <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)' }}>操作 (ACTION)</span>,
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button size="small" style={{ padding: '0 12px' }} onClick={() => navigate(`/pois/${record.id}`)}>
            {isAdmin ? '查看进展' : '进入审核'}
          </Button>
          <Button size="small" onClick={() => navigate(`/map?poi=${record.id}`)} disabled={record.longitude == null || record.latitude == null}>
            地图定位
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="section-block" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <Typography.Title level={3} style={{ margin: 0, fontWeight: 700, letterSpacing: '-0.02em' }}>
            {isAdmin ? '处理进展' : '待核验列表'}
          </Typography.Title>
          <Typography.Paragraph style={{ marginTop: 'var(--space-8)', margin: 0, color: 'var(--color-text-muted)' }}>
            {isAdmin ? '管理员查看全链路进展、状态分布和处理瓶颈。' : '核验者只处理等待我给出结论的记录。'}
          </Typography.Paragraph>
        </div>
        <div style={{ textAlign: 'right' }}>
           <Typography.Text style={{ display: 'block', marginBottom: 'var(--space-8)', fontSize: 12, color: 'var(--color-text-muted)' }}>当前列表条目: {filteredData.length}</Typography.Text>
           <Space>
             <Input.Search
                placeholder="搜索数据..."
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                style={{ width: 300 }}
              />
             <Button onClick={() => navigate('/app/map')}>进入地图</Button>
           </Space>
        </div>
      </div>

      <div
        style={{
          marginBottom: 'var(--space-24)',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: '16px',
        }}
      >
        {summaryCards.map((item) => (
          <div
            key={item.label}
            style={{
              borderRadius: 16,
              padding: '18px 20px',
              backgroundColor: 'var(--color-bg-base)',
              border: '1px solid rgba(15, 23, 42, 0.08)',
              boxShadow: '0 10px 22px rgba(15, 23, 42, 0.04)',
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', letterSpacing: '0.04em' }}>{item.label}</div>
            <div style={{ marginTop: 10, fontSize: 34, lineHeight: 1, fontWeight: 700, color: item.tone, letterSpacing: '-0.05em' }}>{item.value}</div>
            <div style={{ marginTop: 10, fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.45 }}>{item.hint}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 'var(--space-16)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography.Text style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>状态筛选</Typography.Text>
        <Segmented
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as 'ALL' | PoiSummary['status'])}
          options={
            isAdmin
              ? [
                  { label: '全部', value: 'ALL' },
                  { label: '草稿', value: 'DRAFT' },
                  { label: '待核验', value: 'SUBMITTED' },
                  { label: '待整改', value: 'REJECTED' },
                  { label: '待复核', value: 'RESUBMITTED' },
                  { label: '已通过', value: 'APPROVED' },
                ]
              : [
                  { label: '全部', value: 'ALL' },
                  { label: '首次核验', value: 'SUBMITTED' },
                  { label: '整改复核', value: 'RESUBMITTED' },
                ]
          }
        />
      </div>

      <div style={{ borderTop: '1px solid var(--color-primary)', borderBottom: '1px solid var(--color-primary)', paddingTop: 'var(--space-8)' }}>
        <Table rowKey="id" loading={isLoading} columns={columns} dataSource={filteredData} pagination={{ pageSize: 12, position: ['bottomCenter'] }} size="middle" />
      </div>
    </div>
  );
}
