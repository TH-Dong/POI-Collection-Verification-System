import { RouterProvider } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { router } from './router';

export default function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#174360',
          colorBgLayout: '#FFFFFF',
          colorBgContainer: '#FAFAFA',
          colorBorder: '#E5E7EB',
          colorBorderSecondary: '#E5E7EB',
          borderRadius: 4,
          boxShadow: 'none',
          boxShadowSecondary: 'none',
          boxShadowTertiary: 'none',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          colorText: '#111827',
          colorTextSecondary: '#6B7280',
        },
        components: {
          Card: {
            boxShadow: 'none',
          },
          Button: {
            boxShadow: 'none',
            fontWeight: 500,
          },
          Table: {
            headerBg: '#FFFFFF',
            headerColor: '#6B7280',
            rowHoverBg: '#F9FAFB',
            borderColor: '#E5E7EB',
          },
          Tag: {
            lineHeight: 18,
          }
        },
      }}
    >
      <RouterProvider router={router} />
    </ConfigProvider>
  );
}
