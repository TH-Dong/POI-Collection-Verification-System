import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Checkbox, Descriptions, Form, Image, Input, List, Skeleton, Space, Steps, Tag, Typography, message } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchPoiCommunicationMessages, openPoiPrivateConversation } from '../api/chat';
import { fetchAdminPoiDetail, fetchReviewIssues, fetchVerifierPoiDetail, submitVerifierPoiReview } from '../api/poi';
import { useAuthStore } from '../store/authStore';
import type { PoiDetail } from '../types/poi';
import { getPoiStatusMeta, getReviewDecisionLabel, getStatusStep, isPendingReviewStatus } from '../utils/poi';
import { hasRole } from '../utils/role';

const flowItems = [
  { title: '草稿', description: '采集者补充基础信息。' },
  { title: '已提交待核验', description: '记录进入核验队列。' },
  { title: '核验结论', description: '通过或驳回并给出整改意见。' },
  { title: '整改后待复核', description: '采集者根据意见修改后重新提交。' },
];

function renderStatus(status: PoiDetail['status']) {
  const meta = getPoiStatusMeta(status);
  return (
    <Tag bordered={false} style={{ color: meta.color, backgroundColor: meta.background, fontWeight: 600, padding: '4px 12px', borderRadius: 999 }}>
      {meta.label}
    </Tag>
  );
}

export default function PoiDetailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { poiId = '' } = useParams();
  const user = useAuthStore((state) => state.user);
  const isAdmin = hasRole(user?.roles, 'ADMIN');
  const canReview = !isAdmin && hasRole(user?.roles, 'VERIFIER');
  const [reviewForm] = Form.useForm<{ issueCodes?: string[]; reviewComment?: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['poi-detail', isAdmin ? 'admin' : 'verifier', poiId],
    queryFn: () => (isAdmin ? fetchAdminPoiDetail(poiId) : fetchVerifierPoiDetail(poiId)),
    enabled: Boolean(poiId),
  });
  const { data: reviewIssues = [] } = useQuery({
    queryKey: ['review-issues'],
    queryFn: fetchReviewIssues,
    enabled: canReview,
  });
  const { data: communicationMessages = [] } = useQuery({
    queryKey: ['chat', 'poi-messages', poiId],
    queryFn: () => fetchPoiCommunicationMessages(Number(poiId)),
    enabled: Boolean(poiId),
  });

  const reviewMutation = useMutation({
    mutationFn: (payload: { decision: 'APPROVED' | 'REJECTED'; issueCodes: string[]; reviewComment: string | null }) =>
      submitVerifierPoiReview(poiId, payload),
    onSuccess: async () => {
      message.success('核验结果已提交');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['poi-detail', 'verifier', poiId] }),
        queryClient.invalidateQueries({ queryKey: ['poi-list', 'verifier'] }),
        queryClient.invalidateQueries({ queryKey: ['poi-list', 'admin'] }),
      ]);
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '提交核验结果失败');
    },
  });
  const openConversationMutation = useMutation({
    mutationFn: () => openPoiPrivateConversation(Number(poiId)),
    onSuccess: (conversation) => {
      navigate(`/chat?conversationId=${conversation.id}`);
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '打开协作私聊失败');
    },
  });

  const latestRejectRecord = useMemo(() => {
    return data?.reviewRecords.find((item) => item.decision === 'REJECTED') ?? null;
  }, [data]);

  const latestReviewAlert = useMemo(() => {
    if (!data?.latestReviewedAt) {
      return null;
    }

    const issueContent = data.latestIssueLabels.length ? `问题标记：${data.latestIssueLabels.join(' / ')}` : '未标记具体问题';
    return {
      message: data.status === 'APPROVED' ? '最近一次核验结果：通过' : '最近一次核验结果：需整改',
      description: `${issueContent}${data.latestReviewComment ? `；说明：${data.latestReviewComment}` : ''}`,
      type: data.status === 'APPROVED' ? 'success' : 'warning',
    } as const;
  }, [data]);

  const submitApprove = async () => {
    const values = reviewForm.getFieldsValue();
    reviewMutation.mutate({
      decision: 'APPROVED',
      issueCodes: [],
      reviewComment: values.reviewComment?.trim() ? values.reviewComment.trim() : null,
    });
  };

  const submitReject = async () => {
    const values = await reviewForm.validateFields();
    reviewMutation.mutate({
      decision: 'REJECTED',
      issueCodes: values.issueCodes ?? [],
      reviewComment: values.reviewComment?.trim() || '',
    });
  };

  return (
    <div>
      <div className="section-block" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Button type="link" style={{ padding: 0, marginBottom: 'var(--space-16)', color: 'var(--color-text-muted)' }} onClick={() => navigate('/pois')}>
            &larr; 返回{isAdmin ? '处理进展' : '待核验列表'}
          </Button>
          <Typography.Title level={3} style={{ margin: 0, fontWeight: 700, letterSpacing: '-0.02em' }}>
            {isAdmin ? '处理进展详情' : 'POI 详情审核'}
          </Typography.Title>
          <Typography.Paragraph style={{ marginTop: 'var(--space-8)', margin: 0, color: 'var(--color-text-muted)' }}>
            {isAdmin ? `查看 ${data?.poiName || poiId} 的处理轨迹与核验记录。` : `核验 ${data?.poiName || poiId} 并给出通过或整改结论。`}
          </Typography.Paragraph>
        </div>
        <Space>
          {data ? <Button onClick={() => navigate(`/map?poi=${data.id}`)} disabled={data.longitude == null || data.latitude == null}>地图查看</Button> : null}
          {data && <div>{renderStatus(data.status)}</div>}
        </Space>
      </div>

      <div>
        {isLoading || !data ? (
          <Skeleton active />
        ) : (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <div style={{ marginBottom: 'var(--space-16)' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)' }}>状态流转 (FLOW)</span>
              </div>
              <div style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', padding: 'var(--space-20)' }}>
                <Steps current={getStatusStep(data.status, data.reviewCount)} items={flowItems} />
              </div>
            </div>

            {latestReviewAlert ? (
              <Alert
                type={latestReviewAlert.type}
                showIcon
                message={latestReviewAlert.message}
                description={latestReviewAlert.description}
                style={{ borderRadius: 2 }}
              />
            ) : null}

            <div>
              <div style={{ marginBottom: 'var(--space-16)' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)' }}>记录元数据 (METADATA)</span>
              </div>
              <div style={{ borderTop: '2px solid var(--color-primary)' }}>
                <Descriptions column={2} bordered size="small" labelStyle={{ backgroundColor: 'var(--color-bg-subtle)', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                  <Descriptions.Item label="名称 (NAME)">{data.poiName}</Descriptions.Item>
                  <Descriptions.Item label="分类 (CATEGORY)">{data.categoryName ?? '-'}</Descriptions.Item>
                  <Descriptions.Item label="采集员 (COLLECTOR)">{data.collectorName}</Descriptions.Item>
                  <Descriptions.Item label="最近核验人 (VERIFIER)">{data.latestReviewerName ?? '-'}</Descriptions.Item>
                  <Descriptions.Item label="坐标 (COORDINATES)">
                    {data.longitude != null && data.latitude != null ? (
                      <span style={{ fontFamily: 'monospace' }}>{data.longitude.toFixed(6)}, {data.latitude.toFixed(6)}</span>
                    ) : (
                      '-'
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="核验轮次 (ROUND)">{data.reviewCount}</Descriptions.Item>
                  <Descriptions.Item label="地址 (ADDRESS)" span={2}>{data.addressText ?? '-'}</Descriptions.Item>
                  <Descriptions.Item label="描述 (DESCRIPTION)" span={2}>{data.description ?? '-'}</Descriptions.Item>
                  <Descriptions.Item label="创建时间 (CREATED)">{new Date(data.createdAt).toLocaleString()}</Descriptions.Item>
                  <Descriptions.Item label="更新时间 (UPDATED)">{new Date(data.updatedAt).toLocaleString()}</Descriptions.Item>
                  <Descriptions.Item label="最近提交时间 (SUBMITTED)">{data.submittedAt ? new Date(data.submittedAt).toLocaleString() : '-'}</Descriptions.Item>
                  <Descriptions.Item label="最近核验时间 (REVIEWED)">{data.latestReviewedAt ? new Date(data.latestReviewedAt).toLocaleString() : '-'}</Descriptions.Item>
                </Descriptions>
              </div>
            </div>

            {latestRejectRecord ? (
              <div>
                <div style={{ marginBottom: 'var(--space-16)' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)' }}>整改意见 (RECTIFICATION)</span>
                </div>
                <div style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', padding: 'var(--space-20)' }}>
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <div>
                      {latestRejectRecord.issueLabels.length ? latestRejectRecord.issueLabels.map((label) => <Tag key={label}>{label}</Tag>) : <Typography.Text type="secondary">未标记具体问题</Typography.Text>}
                    </div>
                    <Typography.Paragraph style={{ margin: 0 }}>{latestRejectRecord.reviewComment ?? '未填写说明'}</Typography.Paragraph>
                  </Space>
                </div>
              </div>
            ) : null}

            <div>
              <div style={{ marginBottom: 'var(--space-16)' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)' }}>附加物：实景图 (COVER IMAGE)</span>
              </div>
              <div className="detail-image-box" style={{ padding: 'var(--space-16)', backgroundColor: 'var(--color-bg-subtle)', display: 'flex' }}>
                {data.coverImageUrl ? (
                  <Image src={data.coverImageUrl} alt={data.poiName} height={300} style={{ objectFit: 'contain', borderRadius: 2 }} />
                ) : (
                  <div style={{ padding: 'var(--space-48)', width: '100%', textAlign: 'center' }}>
                    <Typography.Text style={{ color: 'var(--color-text-muted)' }}>暂无图像 (NO ATTACHMENT)</Typography.Text>
                  </div>
                )}
              </div>
            </div>

            <div>
              <div style={{ marginBottom: 'var(--space-16)' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)' }}>核验历史</span>
              </div>
              <div style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)' }}>
                <List
                  locale={{ emptyText: '暂无核验记录' }}
                  dataSource={data.reviewRecords}
                  renderItem={(item) => (
                    <List.Item style={{ padding: 'var(--space-16) var(--space-20)', display: 'block' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-16)' }}>
                        <div>
                          <Typography.Text strong>第 {item.round} 轮 · {getReviewDecisionLabel(item.decision)}</Typography.Text>
                          <div style={{ marginTop: 6, fontSize: 13, color: 'var(--color-text-muted)' }}>
                            {item.reviewerName} · {new Date(item.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          {item.issueLabels.map((label) => <Tag key={`${item.id}-${label}`}>{label}</Tag>)}
                        </div>
                      </div>
                      {item.reviewComment ? (
                        <Typography.Paragraph style={{ marginBottom: 0, marginTop: 'var(--space-12)' }}>
                          {item.reviewComment}
                        </Typography.Paragraph>
                      ) : null}
                    </List.Item>
                  )}
                />
              </div>
            </div>

            <div>
              <div style={{ marginBottom: 'var(--space-16)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)' }}>沟通留痕</span>
                {canReview ? (
                  <Button type="primary" onClick={() => openConversationMutation.mutate()} loading={openConversationMutation.isPending}>
                    打开私聊
                  </Button>
                ) : null}
              </div>
              <div style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)' }}>
                <List
                  locale={{ emptyText: '当前 POI 还没有协作消息' }}
                  dataSource={communicationMessages}
                  renderItem={(item) => (
                    <List.Item style={{ padding: 'var(--space-16) var(--space-20)', display: 'block' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-16)' }}>
                        <Typography.Text strong>{item.senderName}</Typography.Text>
                        <Typography.Text style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
                          {new Date(item.createdAt).toLocaleString()}
                        </Typography.Text>
                      </div>
                      <Typography.Paragraph style={{ margin: 'var(--space-8) 0 0' }}>{item.content}</Typography.Paragraph>
                    </List.Item>
                  )}
                />
              </div>
            </div>

            {canReview && isPendingReviewStatus(data.status) ? (
              <div>
                <div style={{ marginBottom: 'var(--space-16)' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)' }}>核验操作 (REVIEW ACTION)</span>
                </div>
                <div style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', padding: 'var(--space-24)' }}>
                  <Form form={reviewForm} layout="vertical" requiredMark={false}>
                    <Form.Item label="错误标记" name="issueCodes" rules={[{ validator: async (_, value) => Promise.resolve(value) }]}>
                      <Checkbox.Group options={reviewIssues.map((item) => ({ label: item.name, value: item.code }))} />
                    </Form.Item>
                    <Form.Item
                      label="核验说明"
                      name="reviewComment"
                      rules={[
                        {
                          validator: async (_, value) => {
                            const issueCodes = reviewForm.getFieldValue('issueCodes');
                            if (issueCodes?.length && (!value || !value.trim())) {
                              throw new Error('驳回时必须填写整改说明');
                            }
                          },
                        },
                      ]}
                    >
                      <Input.TextArea rows={5} placeholder="填写核验结论或整改意见，驳回时必须填写。" />
                    </Form.Item>
                    <Space>
                      <Button type="primary" onClick={() => void submitApprove()} loading={reviewMutation.isPending}>
                        核验通过
                      </Button>
                      <Button danger onClick={() => void submitReject()} loading={reviewMutation.isPending}>
                        驳回并要求整改
                      </Button>
                    </Space>
                  </Form>
                </div>
              </div>
            ) : null}
          </Space>
        )}
      </div>
    </div>
  );
}
