import { Button, Form, Input, Skeleton, Space, Typography, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { commentDispute, escalateDispute, fetchDisputeDetail } from '../api/dispute';

export default function DisputeResponsePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { disputeId = '' } = useParams();
  const [form] = Form.useForm<{ content: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['dispute-detail', disputeId],
    queryFn: () => fetchDisputeDetail(disputeId),
    enabled: Boolean(disputeId),
  });

  const commentMutation = useMutation({
    mutationFn: (payload: { content: string }) => commentDispute(disputeId, payload),
    onSuccess: async () => {
      message.success('补充说明已提交');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dispute-detail', disputeId] }),
        queryClient.invalidateQueries({ queryKey: ['disputes'] }),
      ]);
      navigate(`/disputes/${disputeId}`);
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '提交补充说明失败');
    },
  });

  const escalateMutation = useMutation({
    mutationFn: (payload: { content?: string | null }) => escalateDispute(disputeId, payload),
    onSuccess: async () => {
      message.success('争议单已升级到最终裁定');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dispute-detail', disputeId] }),
        queryClient.invalidateQueries({ queryKey: ['disputes'] }),
      ]);
      navigate(`/disputes/${disputeId}`);
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '升级最终裁定失败');
    },
  });

  const submitComment = async () => {
    const values = await form.validateFields();
    commentMutation.mutate({ content: values.content.trim() });
  };

  const escalate = async () => {
    const values = await form.validateFields();
    escalateMutation.mutate({ content: values.content?.trim() || null });
  };

  return (
    <div>
      <div className="section-block">
        <Button type="link" style={{ padding: 0, marginBottom: 'var(--space-16)', color: 'var(--color-text-muted)' }} onClick={() => navigate(`/disputes/${disputeId}`)}>
          &larr; 返回争议详情
        </Button>
        <Typography.Title level={3} style={{ margin: 0, fontWeight: 700, letterSpacing: '-0.02em' }}>
          核验者补充说明
        </Typography.Title>
        <Typography.Paragraph style={{ marginTop: 'var(--space-8)', marginBottom: 0, color: 'var(--color-text-muted)' }}>
          对当前异议继续补充事实依据，也可以直接提交到管理员最终裁定。
        </Typography.Paragraph>
      </div>

      {isLoading || !data ? (
        <Skeleton active />
      ) : (
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 16, backgroundColor: 'var(--color-bg-base)', padding: 'var(--space-24)' }}>
          <Typography.Paragraph style={{ marginTop: 0 }}>
            当前点位：<strong>{data.summary.poiName}</strong>，流程状态：<strong>{data.summary.disputeStatus}</strong>
          </Typography.Paragraph>
          <Form form={form} layout="vertical" requiredMark={false} initialValues={{ content: '' }}>
            <Form.Item
              label="补充说明"
              name="content"
              rules={[{ required: true, whitespace: true, message: '请填写补充说明' }]}
            >
              <Input.TextArea rows={8} placeholder="请说明为什么维持当前结论，或补充现场核验依据、错误类型、图片判断依据等。" />
            </Form.Item>
            <Space>
              <Button type="primary" onClick={() => void submitComment()} loading={commentMutation.isPending}>
                提交补充说明
              </Button>
              <Button onClick={() => void escalate()} loading={escalateMutation.isPending}>
                提交最终裁定
              </Button>
            </Space>
          </Form>
        </div>
      )}
    </div>
  );
}
