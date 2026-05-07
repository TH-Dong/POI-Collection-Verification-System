import { Button, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="center-page" style={{ backgroundColor: '#FFFFFF' }}>
       <div style={{ textAlign: 'center' }}>
          <Typography.Title level={1} style={{ margin: 0, fontSize: 64, fontWeight: 800, letterSpacing: '-0.05em', color: '#3F3F46' }}>
            404
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 32, letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 600 }}>
            TARGET_NOT_FOUND
          </Typography.Paragraph>
          <Button onClick={() => navigate('/')} style={{ borderRadius: 4, fontWeight: 600, letterSpacing: '0.05em' }}>
            RETURN TO OVERVIEW
          </Button>
       </div>
    </div>
  );
}
