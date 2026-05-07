import { Button, Space, Table, Tag, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { fetchDisputes } from '../api/dispute';
import { useAuthStore } from '../store/authStore';
import type { DisputeSummary } from '../types/dispute';
import { hasRole } from '../utils/role';

const disputeStatusMeta: Record<DisputeSummary['disputeStatus'], { label: string; color: string }> = {
  DISPUTING: { label: '争议处理中', color: 'orange' },
  ARBITRATING: { label: '最终裁定中', color: 'blue' },
  FINALIZED: { label: '已最终确认', color: 'green' },
};

export default function DisputeListPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isVerifier = hasRole(user?.roles, 'VERIFIER');
  const isAdmin = hasRole(user?.roles, 'ADMIN');

  const { data = [], isLoading } = useQuery({
    queryKey: ['disputes'],
    queryFn: fetchDisputes,
  });

  return (
    <div>
      <div className="section-block" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <Typography.Title level={3} style={{ margin: 0, fontWeight: 700, letterSpacing: '-0.02em' }}>
            争议处理中心
          </Typography.Title>
          <Typography.Paragraph style={{ marginTop: 'var(--space-8)', marginBottom: 0, color: 'var(--color-text-muted)' }}>
            先看清流程状态和处理历史，再决定是补充说明还是进入最终裁定。
          </Typography.Paragraph>
        </div>
      </div>

      <div style={{ border: '1px solid var(--color-border)', borderRadius: 16, background: 'var(--color-bg-base)', padding: 'var(--space-8) var(--space-12)' }}>
        <Table
          rowKey="id"
          loading={isLoading}
          dataSource={data}
          pagination={{ pageSize: 10, position: ['bottomCenter'] }}
          columns={[
            {
              title: '争议单',
              key: 'dispute',
              render: (_, record) => (
                <div>
                  <div style={{ fontWeight: 600 }}>{record.poiName}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>争议单 #{record.id}</div>
                </div>
              ),
            },
            {
              title: '流程状态',
              key: 'status',
              render: (_, record) => <Tag color={disputeStatusMeta[record.disputeStatus].color}>{disputeStatusMeta[record.disputeStatus].label}</Tag>,
            },
            {
              title: '发起人',
              dataIndex: 'initiatorName',
            },
            {
              title: '最新动态',
              dataIndex: 'latestComment',
              render: (value: string | null) => <span style={{ color: 'var(--color-text-muted)' }}>{value || '暂无动态'}</span>,
            },
            {
              title: '更新时间',
              dataIndex: 'updatedAt',
              render: (value: string) => new Date(value).toLocaleString(),
            },
            {
              title: '操作',
              key: 'actions',
              render: (_, record) => (
                <Space wrap>
                  <Button size="small" onClick={() => navigate(`/disputes/${record.id}`)}>查看详情</Button>
                  {(isVerifier || isAdmin) && record.disputeStatus === 'DISPUTING' ? (
                    <Button size="small" onClick={() => navigate(`/disputes/${record.id}/respond`)}>补充说明</Button>
                  ) : null}
                  {isAdmin && record.disputeStatus === 'ARBITRATING' ? (
                    <Button size="small" type="primary" onClick={() => navigate(`/disputes/${record.id}/arbitrate`)}>进入裁定</Button>
                  ) : null}
                </Space>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
