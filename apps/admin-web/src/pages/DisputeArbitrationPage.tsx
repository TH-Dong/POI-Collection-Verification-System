import { Button, Form, Input, Radio, Skeleton, Space, Typography, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { arbitrateDispute, fetchDisputeDetail } from '../api/dispute';
import type { PoiReviewDecision } from '../types/poi';

export default function DisputeArbitrationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { disputeId = '' } = useParams();
  const [form] = Form.useForm<{ finalDecision: PoiReviewDecision; description: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['dispute-detail', disputeId],
    queryFn: () => fetchDisputeDetail(disputeId),
    enabled: Boolean(disputeId),
  });

  const arbitrationMutation = useMutation({
    mutationFn: (payload: { finalDecision: PoiReviewDecision; description: string }) => arbitrateDispute(disputeId, payload),
    onSuccess: async () => {
      message.success('最终裁定已提交');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dispute-detail', disputeId] }),
        queryClient.invalidateQueries({ queryKey: ['disputes'] }),
      ]);
      navigate(`/disputes/${disputeId}`);
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '提交最终裁定失败');
    },
  });

  const submit = async () => {
    const values = await form.validateFields();
    arbitrationMutation.mutate({
      finalDecision: values.finalDecision,
      description: values.description.trim(),
    });
  };

  return (
    <div>
      <div className="section-block">
        <Button type="link" style={{ padding: 0, marginBottom: 'var(--space-16)', color: 'var(--color-text-muted)' }} onClick={() => navigate(`/disputes/${disputeId}`)}>
          &larr; 返回争议详情
        </Button>
        <Typography.Title level={3} style={{ margin: 0, fontWeight: 700, letterSpacing: '-0.02em' }}>
          最终裁定处理
        </Typography.Title>
        <Typography.Paragraph style={{ marginTop: 'var(--space-8)', marginBottom: 0, color: 'var(--color-text-muted)' }}>
          管理员查看完整争议历史后给出最终裁定。裁定完成后状态将进入“已最终确认”。
        </Typography.Paragraph>
      </div>

      {isLoading || !data ? (
        <Skeleton active />
      ) : (
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 16, backgroundColor: 'var(--color-bg-base)', padding: 'var(--space-24)' }}>
          <Typography.Paragraph style={{ marginTop: 0 }}>
            当前点位：<strong>{data.summary.poiName}</strong>，争议状态：<strong>{data.summary.disputeStatus}</strong>
          </Typography.Paragraph>
          <Form form={form} layout="vertical" requiredMark={false} initialValues={{ finalDecision: 'REJECTED' }}>
            <Form.Item label="最终裁定" name="finalDecision" rules={[{ required: true, message: '请选择最终裁定结果' }]}>
              <Radio.Group>
                <Radio.Button value="APPROVED">支持采集方 / 通过</Radio.Button>
                <Radio.Button value="REJECTED">维持驳回 / 不通过</Radio.Button>
              </Radio.Group>
            </Form.Item>
            <Form.Item label="裁定说明" name="description" rules={[{ required: true, whitespace: true, message: '请填写裁定说明' }]}>
              <Input.TextArea rows={8} placeholder="请记录核查结果、最终判定依据，以及为什么形成当前裁定。" />
            </Form.Item>
            <Space>
              <Button type="primary" onClick={() => void submit()} loading={arbitrationMutation.isPending}>
                提交最终裁定
              </Button>
            </Space>
          </Form>
        </div>
      )}
    </div>
  );
}
