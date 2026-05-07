import { Alert, Button, Descriptions, List, Skeleton, Space, Tag, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchDisputeDetail } from '../api/dispute';
import { useAuthStore } from '../store/authStore';
import { hasRole } from '../utils/role';

const steps = [
  { title: '异议提交', description: '采集者发起异议并说明理由。' },
  { title: '补充说明', description: '核验者继续补充证据或处理意见。' },
  { title: '最终裁定', description: '必要时升级到管理员最终裁定。' },
  { title: '最终确认', description: '形成最终裁定并结束闭环。' },
];

export default function DisputeDetailPage() {
  const navigate = useNavigate();
  const { disputeId = '' } = useParams();
  const user = useAuthStore((state) => state.user);
  const isVerifier = hasRole(user?.roles, 'VERIFIER');
  const isAdmin = hasRole(user?.roles, 'ADMIN');

  const { data, isLoading } = useQuery({
    queryKey: ['dispute-detail', disputeId],
    queryFn: () => fetchDisputeDetail(disputeId),
    enabled: Boolean(disputeId),
  });

  const currentStep = data?.summary.disputeStatus === 'DISPUTING' ? 1 : data?.summary.disputeStatus === 'ARBITRATING' ? 2 : 3;

  return (
    <div>
      <div className="section-block" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Button type="link" style={{ padding: 0, marginBottom: 'var(--space-16)', color: 'var(--color-text-muted)' }} onClick={() => navigate('/disputes')}>
            &larr; 返回争议处理列表
          </Button>
          <Typography.Title level={3} style={{ margin: 0, fontWeight: 700, letterSpacing: '-0.02em' }}>
            争议单详情
          </Typography.Title>
          <Typography.Paragraph style={{ marginTop: 'var(--space-8)', marginBottom: 0, color: 'var(--color-text-muted)' }}>
            优先看清流程、历史记录和当前可执行动作。
          </Typography.Paragraph>
        </div>
        <Space>
          {data && (isVerifier || isAdmin) && data.summary.disputeStatus === 'DISPUTING' ? (
            <Button onClick={() => navigate(`/disputes/${data.summary.id}/respond`)}>核验者补充说明</Button>
          ) : null}
          {data && isAdmin && data.summary.disputeStatus === 'ARBITRATING' ? (
            <Button type="primary" onClick={() => navigate(`/disputes/${data.summary.id}/arbitrate`)}>进入最终裁定</Button>
          ) : null}
        </Space>
      </div>

      {isLoading || !data ? (
        <Skeleton active />
      ) : (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
            {steps.map((step, index) => {
              const state = index < currentStep ? 'done' : index === currentStep ? 'current' : 'todo';
              const palette = state === 'done'
                ? { bg: '#EDF6F3', border: '#B9DDCF', number: '#277C68', text: '#31594E', line: '#8ECDBA' }
                : state === 'current'
                  ? { bg: '#EEF5FF', border: '#C6DAF7', number: '#2759D8', text: '#2446A6', line: '#BFD8FF' }
                  : { bg: '#FAFBFC', border: '#E4EAF2', number: '#71717A', text: '#71717A', line: '#E5E9F2' };
              return (
                <div
                  key={step.title}
                  style={{
                    position: 'relative',
                    border: `1px solid ${palette.border}`,
                    borderRadius: 18,
                    background: palette.bg,
                    padding: '18px 18px 16px',
                    minHeight: 132,
                  }}
                >
                  {index < steps.length - 1 ? (
                    <div
                      style={{
                        position: 'absolute',
                        top: 28,
                        right: -18,
                        width: 24,
                        height: 2,
                        background: palette.line,
                        zIndex: 1,
                      }}
                    />
                  ) : null}
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 999,
                      background: state === 'todo' ? '#FFFFFF' : palette.number,
                      color: state === 'todo' ? palette.number : '#FFFFFF',
                      border: state === 'todo' ? `1px solid ${palette.border}` : 'none',
                      display: 'grid',
                      placeItems: 'center',
                      fontWeight: 700,
                      fontSize: 16,
                      marginBottom: 14,
                    }}
                  >
                    {index + 1}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: palette.text, marginBottom: 10 }}>{step.title}</div>
                  <div style={{ fontSize: 14, lineHeight: 1.65, color: state === 'todo' ? '#71717A' : '#52525B' }}>{step.description}</div>
                </div>
              );
            })}
          </div>

          <Alert
            showIcon
            type={data.summary.disputeStatus === 'FINALIZED' ? 'success' : data.summary.disputeStatus === 'ARBITRATING' ? 'info' : 'warning'}
            message={data.summary.disputeStatus === 'FINALIZED' ? '争议单已最终确认' : data.summary.disputeStatus === 'ARBITRATING' ? '等待管理员最终裁定' : '等待核验者补充或升级'}
            description={data.summary.latestComment || '暂无最新说明'}
          />

          <Descriptions column={2} bordered size="small" style={{ borderRadius: 16, overflow: 'hidden' }} labelStyle={{ backgroundColor: '#FBFCFD', fontWeight: 600, color: 'var(--color-text-muted)' }}>
            <Descriptions.Item label="争议单编号">#{data.summary.id}</Descriptions.Item>
            <Descriptions.Item label="点位名称">{data.summary.poiName}</Descriptions.Item>
            <Descriptions.Item label="当前 POI 状态">{getPoiStatusLabel(data.summary.poiStatus)}</Descriptions.Item>
            <Descriptions.Item label="争议流程状态">{getDisputeStatusLabel(data.summary.disputeStatus)}</Descriptions.Item>
            <Descriptions.Item label="发起人">{data.summary.initiatorName}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{new Date(data.summary.createdAt).toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="升级时间">{data.summary.escalatedAt ? new Date(data.summary.escalatedAt).toLocaleString() : '-'}</Descriptions.Item>
            <Descriptions.Item label="最终确认时间">{data.summary.finalizedAt ? new Date(data.summary.finalizedAt).toLocaleString() : '-'}</Descriptions.Item>
          </Descriptions>

          <div>
            <div style={{ marginBottom: 'var(--space-16)' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)' }}>点位快照</span>
            </div>
            <Descriptions column={2} bordered size="small" style={{ borderRadius: 16, overflow: 'hidden' }} labelStyle={{ backgroundColor: 'var(--color-bg-subtle)', fontWeight: 600, color: 'var(--color-text-muted)' }}>
              <Descriptions.Item label="分类">{data.poi.categoryName ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="采集者">{data.poi.collectorName}</Descriptions.Item>
              <Descriptions.Item label="坐标">
                {data.poi.longitude != null && data.poi.latitude != null ? `${data.poi.longitude.toFixed(6)}, ${data.poi.latitude.toFixed(6)}` : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="最近核验人">{data.poi.latestReviewerName ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="地址" span={2}>{data.poi.addressText ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="描述" span={2}>{data.poi.description ?? '-'}</Descriptions.Item>
            </Descriptions>
          </div>

          <div>
            <div style={{ marginBottom: 'var(--space-16)' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)' }}>沟通记录</span>
            </div>
            <div style={{ border: '1px solid var(--color-border)', borderRadius: 18, overflow: 'hidden', backgroundColor: 'var(--color-bg-base)', padding: 8 }}>
              <List
                locale={{ emptyText: '暂无沟通记录' }}
                dataSource={data.comments}
                renderItem={(item) => (
                  <List.Item style={{ display: 'block', padding: '14px 16px', marginBottom: 8, borderRadius: 14, background: item.senderName === '系统' ? '#FBFCFD' : '#FFFFFF', border: '1px solid #E5E9F2' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-16)', alignItems: 'flex-start' }}>
                      <div>
                        <Typography.Text strong style={{ fontSize: 16 }}>{item.senderName}</Typography.Text>
                        {item.senderRoles.length ? (
                          <div style={{ marginTop: 8 }}>
                            {item.senderRoles.map((role) => (
                              <Tag key={`${item.id}-${role}`} style={{ borderRadius: 999, paddingInline: 10, background: '#F3F5F9', color: '#52525B', borderColor: '#E5E9F2' }}>
                                {getRoleLabel(role)}
                              </Tag>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <Typography.Text type="secondary" style={{ whiteSpace: 'nowrap' }}>{new Date(item.createdAt).toLocaleString()}</Typography.Text>
                    </div>
                    <Typography.Paragraph style={{ margin: '12px 0 0', fontSize: 15, lineHeight: 1.75, color: '#52525B' }}>{item.content}</Typography.Paragraph>
                  </List.Item>
                )}
              />
            </div>
          </div>

          <div>
            <div style={{ marginBottom: 'var(--space-16)' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)' }}>核验历史</span>
            </div>
            <div style={{ border: '1px solid var(--color-border)', borderRadius: 18, overflow: 'hidden', backgroundColor: 'var(--color-bg-base)', padding: 8 }}>
              <List
                locale={{ emptyText: '暂无核验记录' }}
                dataSource={data.poi.reviewRecords}
                renderItem={(item) => (
                  <List.Item style={{ display: 'block', padding: '14px 16px', marginBottom: 8, borderRadius: 14, background: '#FFFFFF', border: '1px solid #E5E9F2' }}>
                    <Typography.Text strong>第 {item.round} 轮 · {item.decision === 'APPROVED' ? '核验通过' : '驳回整改'}</Typography.Text>
                    <div style={{ marginTop: 6, color: 'var(--color-text-muted)' }}>{item.reviewerName} · {new Date(item.createdAt).toLocaleString()}</div>
                    {item.issueLabels.length ? <div style={{ marginTop: 10 }}>{item.issueLabels.map((label) => <Tag key={`${item.id}-${label}`} style={{ borderRadius: 999, paddingInline: 10, background: '#FFF3E8', color: '#B56A19', borderColor: '#FFE3C2' }}>{label}</Tag>)}</div> : null}
                    {item.reviewComment ? <Typography.Paragraph style={{ margin: '10px 0 0', fontSize: 15, lineHeight: 1.75, color: '#52525B' }}>{item.reviewComment}</Typography.Paragraph> : null}
                  </List.Item>
                )}
              />
            </div>
          </div>

          <div>
            <div style={{ marginBottom: 'var(--space-16)' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)' }}>最终裁定结果</span>
            </div>
            <div style={{ border: '1px solid var(--color-border)', borderRadius: 18, backgroundColor: 'var(--color-bg-base)', padding: 'var(--space-20)' }}>
              {data.arbitration ? (
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <div>
                    <Tag color={data.arbitration.finalDecision === 'APPROVED' ? 'green' : 'orange'} style={{ borderRadius: 999, paddingInline: 10 }}>
                      {data.arbitration.finalDecision === 'APPROVED' ? '支持采集方 / 通过' : '维持驳回 / 不通过'}
                    </Tag>
                  </div>
                  <Typography.Text style={{ color: '#71717A' }}>
                    {data.arbitration.reviewerName} · {new Date(data.arbitration.reviewedAt).toLocaleString()}
                  </Typography.Text>
                  <Typography.Paragraph style={{ margin: 0, fontSize: 15, lineHeight: 1.8, color: '#52525B' }}>{data.arbitration.description}</Typography.Paragraph>
                </Space>
              ) : (
                <Typography.Text type="secondary">尚未形成最终裁定结果。</Typography.Text>
              )}
            </div>
          </div>
        </Space>
      )}
    </div>
  );
}

function getRoleLabel(role: string) {
  switch (role) {
    case 'COLLECTOR':
      return '采集者';
    case 'VERIFIER':
      return '核验者';
    case 'ADMIN':
      return '管理员';
    default:
      return role;
  }
}

function getPoiStatusLabel(status: string) {
  switch (status) {
    case 'DRAFT':
      return '草稿';
    case 'SUBMITTED':
      return '待核验';
    case 'APPROVED':
      return '核验通过';
    case 'REJECTED':
      return '待整改';
    case 'RESUBMITTED':
      return '待复核';
    case 'DISPUTING':
      return '争议处理中';
    case 'ARBITRATING':
      return '最终裁定中';
    case 'FINALIZED':
      return '已最终确认';
    default:
      return status;
  }
}

function getDisputeStatusLabel(status: string) {
  switch (status) {
    case 'DISPUTING':
      return '争议处理中';
    case 'ARBITRATING':
      return '最终裁定中';
    case 'FINALIZED':
      return '已最终确认';
    default:
      return status;
  }
}
