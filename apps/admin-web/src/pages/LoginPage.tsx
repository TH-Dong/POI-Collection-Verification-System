import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Form, Input, Typography, message, Alert } from 'antd';
import { useAuthStore } from '../store/authStore';
import { login } from '../api/auth';

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: any) => {
    try {
      setLoading(true);
      const result = await login({ username: values.username, password: values.password });
      setAuth({
        token: result.accessToken,
        user: result.user,
      });
      message.success('ACCESS GRANTED');
      navigate('/');
    } catch (error: any) {
      message.error('ACCESS DENIED: Authentication Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="center-page">
      <div className="auth-card">
        <Typography.Title level={3} style={{ fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
          POI SYSTEM
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 40 }}>
          VERIFICATION NODE / TERMINAL ACCESS
        </Typography.Paragraph>

        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item
            label={<span className="typography-meta">USERNAME</span>}
            name="username"
            rules={[{ required: true, message: 'REQ' }]}
            initialValue="admin"
          >
            <Input size="large" style={{ padding: '12px 14px' }} placeholder="Enter assigned username" />
          </Form.Item>

          <Form.Item
            label={<span className="typography-meta">PASSWORD</span>}
            name="password"
            rules={[{ required: true, message: 'REQ' }]}
            initialValue="123456"
          >
            <Input.Password size="large" style={{ padding: '12px 14px' }} placeholder="Enter access code" />
          </Form.Item>

          <Form.Item style={{ marginTop: 48 }}>
            <Button type="primary" htmlType="submit" size="large" block loading={loading} style={{ height: 48, fontWeight: 700, letterSpacing: '0.04em' }}>
              INITIALIZE CONNECTION
            </Button>
          </Form.Item>
        </Form>

        <Alert message="SYSTEM MESSAGE" description="Default Credentials: admin / 123456" type="info" showIcon style={{ marginTop: 24, border: '1px solid #BFD8FF', backgroundColor: '#E8F4FF' }} />
      </div>
    </div>
  );
}
