import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined, FireOutlined } from '@ant-design/icons';
import { useAuth } from '../../store/authStore';

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const onFinish = (values: { username: string; password: string }) => {
    setLoading(true);
    const success = login(values.username, values.password);
    if (success) {
      message.success('登录成功');
      navigate('/');
    } else {
      message.error('用户名或密码错误');
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #001529 0%, #003a70 100%)',
      }}
    >
      <Card
        style={{
          width: 420,
          borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
        }}
        bodyStyle={{ padding: '40px 32px 24px' }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <FireOutlined style={{ fontSize: 48, color: '#ff4d4f', marginBottom: 16 }} />
          <div style={{ fontSize: 24, fontWeight: 600, color: '#001529', marginBottom: 8 }}>
            智慧供热管理平台
          </div>
          <div style={{ fontSize: 14, color: '#8c8c8c' }}>
            城市集中供暖全生命周期管理系统
          </div>
        </div>
        <Form onFinish={onFinish} size="large">
          <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input prefix={<UserOutlined />} placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="请输入密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              登 录
            </Button>
          </Form.Item>
        </Form>
        <div
          style={{
            textAlign: 'center',
            fontSize: 12,
            color: '#bfbfbf',
            marginTop: 8,
          }}
        >
          演示账号：张三/李管理/王主管/赵总 密码：123456
        </div>
      </Card>
    </div>
  );
};

export default Login;
