import { useQuery } from '@tanstack/react-query';
import { Button, Progress, Skeleton, Space, Table, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { downloadAdminReport, fetchDashboard } from '../api/operations';
import { useAuthStore } from '../store/authStore';
import { hasPermission } from '../utils/permission';

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const canExport = hasPermission(user?.permissions, 'report:export');
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
  });

  const handleExport = async (type: 'pois' | 'audit' | 'users', filename: string) => {
    try {
      const blob = await downloadAdminReport(type);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      message.success('报表导出已开始');
    } catch (_error) {
      message.error('报表导出失败');
    }
  };

  const metricColumns: ColumnsType<{ code: string; label: string; count: number }> = [
    { title: '代码', dataIndex: 'code', key: 'code' },
    { title: '标签', dataIndex: 'label', key: 'label' },
    { title: '数量', dataIndex: 'count', key: 'count' },
  ];

  return (
    <div>
      <div className="section-block">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
          <div>
            <Typography.Title level={3} style={{ margin: 0, fontWeight: 700, letterSpacing: '-0.02em' }}>
              阶段 8 完整版看板
            </Typography.Title>
            <Typography.Paragraph style={{ marginTop: 'var(--space-8)', margin: 0, color: 'var(--color-text-muted)' }}>
              当前看板已补上 OCR 覆盖、微信绑定、审计日志和导出入口，作为完整版本收尾页。
            </Typography.Paragraph>
          </div>
          {canExport ? (
            <Space wrap>
              <Button onClick={() => void handleExport('pois', 'poi-report.csv')}>导出 POI</Button>
              <Button onClick={() => void handleExport('users', 'user-report.csv')}>导出用户</Button>
              <Button type="primary" onClick={() => void handleExport('audit', 'audit-report.csv')}>导出审计</Button>
            </Space>
          ) : null}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '16px' }}>
        {[
          { label: 'POI 存量', value: data?.poiSummary.total ?? '-', hint: `待处理 ${data?.poiSummary.pending ?? 0} / 已闭环 ${data?.poiSummary.completed ?? 0}` },
          { label: '争议单', value: data?.disputeSummary.total ?? '-', hint: `处理中 ${data?.disputeSummary.pending ?? 0}` },
          { label: '任务池', value: data?.taskSummary.total ?? '-', hint: `待办 ${data?.taskSummary.pending ?? 0}` },
          { label: '通知触达', value: data?.noticeSummary.total ?? '-', hint: `未读 ${data?.noticeSummary.pending ?? 0}` },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              padding: '18px 20px',
              borderRadius: 14,
              backgroundColor: 'var(--color-bg-base)',
              border: '1px solid rgba(15, 23, 42, 0.08)',
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)',
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', letterSpacing: '0.04em' }}>{item.label}</div>
            <div style={{ marginTop: 10, fontSize: 28, fontWeight: 700, color: 'var(--color-text-base)', letterSpacing: '-0.03em' }}>{item.value}</div>
            <div style={{ marginTop: 8, fontSize: 13, color: 'var(--color-text-muted)' }}>{item.hint}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 'var(--space-32)', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
        <div style={{ border: '1px solid var(--color-border)', padding: 'var(--space-24)', backgroundColor: 'var(--color-bg-base)' }}>
          {isLoading ? <Skeleton active /> : (
            <>
              <Typography.Title level={5} style={{ marginTop: 0 }}>通知已读进度</Typography.Title>
              <Progress percent={data?.noticeSummary.total ? Math.round(((data.noticeSummary.completed ?? 0) / data.noticeSummary.total) * 100) : 0} strokeColor="#3F3F46" />
              <Typography.Paragraph style={{ marginBottom: 0, color: 'var(--color-text-muted)' }}>
                站内通知已从“口头提醒”变成可追踪的送达链路。
              </Typography.Paragraph>
            </>
          )}
        </div>
        <div style={{ border: '1px solid var(--color-border)', padding: 'var(--space-24)', backgroundColor: 'var(--color-bg-base)' }}>
          {isLoading ? <Skeleton active /> : (
            <>
              <Typography.Title level={5} style={{ marginTop: 0 }}>平台状态</Typography.Title>
              <Typography.Paragraph style={{ color: 'var(--color-text-muted)' }}>
                阶段 8 已补上 OCR 辅助、微信接入留痕、权限细化和统计导出。
              </Typography.Paragraph>
            </>
          )}
        </div>
      </div>

      <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '16px' }}>
        <div style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', padding: 'var(--space-24)' }}>
          <Typography.Title level={5} style={{ marginTop: 0 }}>POI 状态分布</Typography.Title>
          <Table rowKey="code" columns={metricColumns} dataSource={data?.poiStatusMetrics ?? []} pagination={false} size="small" />
        </div>
        <div style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', padding: 'var(--space-24)' }}>
          <Typography.Title level={5} style={{ marginTop: 0 }}>任务类型分布</Typography.Title>
          <Table rowKey="code" columns={metricColumns} dataSource={data?.taskTypeMetrics ?? []} pagination={false} size="small" />
        </div>
        <div style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', padding: 'var(--space-24)' }}>
          <Typography.Title level={5} style={{ marginTop: 0 }}>角色结构</Typography.Title>
          <Table rowKey="code" columns={metricColumns} dataSource={data?.userRoleMetrics ?? []} pagination={false} size="small" />
        </div>
      </div>

      <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' }}>
        <div style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', padding: 'var(--space-24)' }}>
          <Typography.Title level={5} style={{ marginTop: 0 }}>分类覆盖</Typography.Title>
          <Table rowKey="code" columns={metricColumns} dataSource={data?.categoryMetrics ?? []} pagination={false} size="small" />
        </div>
        <div style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', padding: 'var(--space-24)' }}>
          <Typography.Title level={5} style={{ marginTop: 0 }}>外部能力与留痕</Typography.Title>
          <Table rowKey="code" columns={metricColumns} dataSource={data?.integrationMetrics ?? []} pagination={false} size="small" />
        </div>
      </div>
    </div>
  );
}
