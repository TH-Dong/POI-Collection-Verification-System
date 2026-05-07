import { AimOutlined, BellOutlined, CloudUploadOutlined, CommentOutlined, DashboardOutlined, EnvironmentOutlined, LogoutOutlined, ProfileOutlined, SettingOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { Layout, Menu, Space, Typography, Button } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { useAuthStore } from '../store/authStore';
import { hasPermission } from '../utils/permission';
import { hasRole } from '../utils/role';

const { Header, Sider, Content } = Layout;

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const isAdmin = hasRole(user?.roles, 'ADMIN');
  const canManageOperations = hasPermission(user?.permissions, 'operations:manage');

  const menuItems = useMemo(
    () => [
      { key: '/', icon: <DashboardOutlined />, label: '系统概览' },
      { key: '/tasks', icon: <UnorderedListOutlined />, label: '任务中心' },
      { key: '/notices', icon: <BellOutlined />, label: '通知中心' },
      { key: '/chat', icon: <CommentOutlined />, label: '协作会话' },
      { key: '/pois', icon: <EnvironmentOutlined />, label: isAdmin ? '处理进展' : '待核验列表' },
      { key: '/map', icon: <AimOutlined />, label: isAdmin ? '地图进展' : '空间核验' },
      { key: '/disputes', icon: <ProfileOutlined />, label: '争议处理' },
      ...(canManageOperations ? [{ key: '/operations', icon: <SettingOutlined />, label: '运营配置' }] : []),
      { key: '/upload', icon: <CloudUploadOutlined />, label: '附件测试' },
    ],
    [canManageOperations, isAdmin],
  );

  const selectedKeys = useMemo(() => {
    if (location.pathname.startsWith('/tasks')) {
      return ['/tasks'];
    }
    if (location.pathname.startsWith('/notices')) {
      return ['/notices'];
    }
    if (location.pathname.startsWith('/operations')) {
      return ['/operations'];
    }
    if (location.pathname.startsWith('/chat')) {
      return ['/chat'];
    }
    if (location.pathname.startsWith('/conversations')) {
      return ['/chat'];
    }
    if (location.pathname.startsWith('/pois')) {
      return ['/pois'];
    }
    if (location.pathname.startsWith('/upload')) {
      return ['/upload'];
    }
    if (location.pathname.startsWith('/disputes')) {
      return ['/disputes'];
    }
    if (location.pathname.startsWith('/map')) {
      return ['/map'];
    }
    return ['/'];
  }, [location.pathname]);

  return (
    <Layout className="admin-shell">
      <Sider width={240} className="admin-sider">
        <div className="brand-block">
          <Typography.Title level={4} style={{ margin: 0, fontWeight: 700 }}>
            POI 数据平台
          </Typography.Title>
          <span style={{ color: 'var(--color-text-muted)', fontSize: 12, letterSpacing: '0.05em' }}>
            {isAdmin ? '阶段 8 / 完整收尾' : '阶段 8 / 协作增强'}
          </span>
        </div>
        <Menu
          mode="inline"
          selectedKeys={selectedKeys}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 'none', backgroundColor: 'transparent' }}
        />
      </Sider>
      <Layout style={{ backgroundColor: 'var(--color-bg-base)' }}>
        <Header className="admin-header">
          <Space size="large">
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 600, color: 'var(--color-text-base)', lineHeight: 1.2 }}>
                {user?.realName ?? user?.username}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                {user?.roles.map(getRoleLabel).join(' / ')}
              </div>
            </div>
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={() => {
                logout();
                navigate('/login');
              }}
              style={{ color: 'var(--color-text-muted)' }}
            >
              退出
            </Button>
          </Space>
        </Header>
        <Content className="admin-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

function getRoleLabel(role: string) {
  switch (role) {
    case 'ADMIN':
      return '管理员';
    case 'VERIFIER':
      return '核验者';
    case 'COLLECTOR':
      return '采集者';
    default:
      return role;
  }
}
