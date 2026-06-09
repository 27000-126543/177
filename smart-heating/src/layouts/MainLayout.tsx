import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Breadcrumb, Badge, Avatar, Dropdown } from 'antd';
import {
  DashboardOutlined,
  FireOutlined,
  ApartmentOutlined,
  HomeOutlined,
  TeamOutlined,
  MoneyCollectOutlined,
  FileAddOutlined,
  ToolOutlined,
  BarChartOutlined,
  SettingOutlined,
  BellOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useAuth } from '../store/authStore';
import { ROLE_LABELS } from '../types';

const { Sider, Header, Content } = Layout;

const ALL_MENU_ITEMS = [
  { key: '/', icon: <DashboardOutlined />, label: '首页大屏' },
  { key: '/heat-source', icon: <FireOutlined />, label: '热源厂管理' },
  { key: '/network', icon: <ApartmentOutlined />, label: '管网监控' },
  { key: '/heat-station', icon: <HomeOutlined />, label: '换热站管理' },
  { key: '/user-side', icon: <TeamOutlined />, label: '用户侧管理' },
  { key: '/billing', icon: <MoneyCollectOutlined />, label: '费用管理' },
  { key: '/installation', icon: <FileAddOutlined />, label: '报装管理' },
  { key: '/work-order', icon: <ToolOutlined />, label: '工单管理' },
  { key: '/report', icon: <BarChartOutlined />, label: '报表分析' },
  { key: '/settings', icon: <SettingOutlined />, label: '系统设置' },
];

const ROLE_VISIBLE_KEYS: Record<string, string[]> = {
  user: ['/', '/user-side', '/billing', '/installation'],
  station_admin: ['/', '/heat-source', '/network', '/heat-station', '/user-side', '/billing', '/installation', '/work-order'],
  region_manager: ['/', '/heat-source', '/network', '/heat-station', '/user-side', '/billing', '/installation', '/work-order', '/report'],
  company_admin: ['/', '/heat-source', '/network', '/heat-station', '/user-side', '/billing', '/installation', '/work-order', '/report', '/settings'],
};

function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout, pendingAlerts } = useAuth();
  const userRole = currentUser?.role || 'user';
  const menuItems = ALL_MENU_ITEMS.filter(item => ROLE_VISIBLE_KEYS[userRole]?.includes(item.key));

  const userDropdownItems = {
    items: [
      {
        key: 'user-info',
        label: (
          <span>
            {currentUser?.name} <span style={{ color: '#999' }}>{currentUser ? ROLE_LABELS[currentUser.role] : ''}</span>
          </span>
        ),
        disabled: true,
      },
      { type: 'divider' as const },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: '退出登录',
        onClick: logout,
      },
    ],
  };

  const breadcrumbItems = (() => {
    const currentItem = ALL_MENU_ITEMS.find((item) => item.key === location.pathname);
    return currentItem ? [{ title: currentItem.label }] : [];
  })();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={240}
        theme="dark"
        style={{ background: '#001529' }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: collapsed ? 16 : 20,
            fontWeight: 600,
            gap: 8,
          }}
        >
          <FireOutlined />
          {!collapsed && <span>智慧供热</span>}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ background: '#001529' }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0, 0, 0, 0.08)',
          }}
        >
          <Breadcrumb items={breadcrumbItems} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <Badge count={pendingAlerts}>
              <BellOutlined style={{ fontSize: 18, cursor: 'pointer' }} />
            </Badge>
            <Dropdown menu={userDropdownItems} placement="bottomRight">
              <Avatar icon={<UserOutlined />} style={{ cursor: 'pointer' }} />
            </Dropdown>
          </div>
        </Header>
        <Content
          style={{
            background: '#f0f2f5',
            padding: 16,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

export default MainLayout;
