import React, { useState } from 'react';
import {
  Row,
  Col,
  Card,
  Table,
  Tag,
  Button,
  Modal,
  Form,
  Select,
  Switch,
  Descriptions,
  message,
  Tabs,
  Space,
  InputNumber,
  Alert,
} from 'antd';
import {
  SafetyOutlined,
  ControlOutlined,
  DatabaseOutlined,
  UserOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../store/authStore';
import { ROLE_LABELS, ROLE_PERMISSIONS } from '../../types';
import type { UserRole } from '../../types';
import { MOCK_USERS } from '../../mock/data';

const PERMISSION_LABELS: Record<string, string> = {
  view_own_data: '查看个人数据',
  submit_repair: '提交报修',
  view_billing: '查看账单',
  submit_installation: '提交报装',
  manage_station: '管理换热站',
  view_station_alerts: '查看站点告警',
  assign_work_orders: '分配工单',
  view_region_data: '查看区域数据',
  manage_region_stations: '管理区域站点',
  adjust_dispatch: '调整调度',
  view_all_data: '查看全量数据',
  manage_all_stations: '管理全部站点',
  adjust_all_dispatch: '调整全部调度',
  export_reports: '导出报表',
  manage_users: '用户管理',
};

const ROLE_COLORS: Record<UserRole, string> = {
  user: 'blue',
  station_admin: 'green',
  region_manager: 'orange',
  company_admin: 'red',
};

const REGIONS = ['朝阳区', '海淀区', '丰台区', '东城区', '西城区'];

const SystemSettings: React.FC = () => {
  const { currentUser } = useAuth();
  const [dispatchForm] = Form.useForm();
  const [collectForm] = Form.useForm();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [, setEditingUser] = useState<typeof MOCK_USERS[0] | null>(null);
  const [editForm] = Form.useForm();

  const roleTableData = (['user', 'station_admin', 'region_manager', 'company_admin'] as UserRole[]).map((role) => ({
    key: role,
    role,
    label: ROLE_LABELS[role],
    permissions: ROLE_PERMISSIONS[role],
  }));

  const roleColumns = [
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: UserRole) => (
        <Tag color={ROLE_COLORS[role]}>{ROLE_LABELS[role]}</Tag>
      ),
    },
    {
      title: '权限列表',
      dataIndex: 'permissions',
      key: 'permissions',
      render: (permissions: string[]) => (
        <Space wrap>
          {permissions.map((p) => (
            <Tag key={p}>{PERMISSION_LABELS[p] || p}</Tag>
          ))}
        </Space>
      ),
    },
  ];

  const permissionDescData = Object.entries(PERMISSION_LABELS).map(([code, label]) => ({
    key: code,
    code,
    label,
    roles: (['user', 'station_admin', 'region_manager', 'company_admin'] as UserRole[]).filter((r) =>
      ROLE_PERMISSIONS[r].includes(code)
    ),
  }));

  const permissionDescColumns = [
    {
      title: '权限代码',
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => <Tag color="geekblue">{code}</Tag>,
    },
    {
      title: '权限说明',
      dataIndex: 'label',
      key: 'label',
    },
    {
      title: '拥有该权限的角色',
      dataIndex: 'roles',
      key: 'roles',
      render: (roles: UserRole[]) => (
        <Space wrap>
          {roles.map((r) => (
            <Tag key={r} color={ROLE_COLORS[r]}>{ROLE_LABELS[r]}</Tag>
          ))}
        </Space>
      ),
    },
  ];

  const userColumns = [
    {
      title: '用户ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: UserRole) => (
        <Tag color={ROLE_COLORS[role]}>{ROLE_LABELS[role]}</Tag>
      ),
    },
    {
      title: '区域',
      dataIndex: 'region',
      key: 'region',
      render: (region: string | undefined) => region || '-',
    },
    {
      title: '管辖站点',
      dataIndex: 'stationIds',
      key: 'stationIds',
      render: (stationIds: string[] | undefined) =>
        stationIds ? stationIds.join(', ') : '-',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: typeof MOCK_USERS[0]) => (
        <Button
          type="link"
          icon={<EditOutlined />}
          onClick={() => {
            setEditingUser(record);
            editForm.setFieldsValue({ role: record.role, region: record.region });
            setEditModalVisible(true);
          }}
        >
          编辑
        </Button>
      ),
    },
  ];

  const handleSaveDispatch = () => {
    dispatchForm.validateFields().then(() => {
      message.success('调度规则保存成功');
    });
  };

  const handleSaveCollect = () => {
    collectForm.validateFields().then(() => {
      message.success('数据采集设置保存成功');
    });
  };

  const handleEditUser = () => {
    editForm.validateFields().then(() => {
      message.success('用户信息更新成功');
      setEditModalVisible(false);
      setEditingUser(null);
    });
  };

  const isCompanyAdmin = currentUser?.role === 'company_admin';
  const canManageUsers = currentUser?.role === 'company_admin' || currentUser?.role === 'region_manager';

  const tabItems = [
    {
      key: 'permission',
      label: (
        <span>
          <SafetyOutlined />
          权限管理
        </span>
      ),
      children: (
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card title="角色权限矩阵">
              <Table
                columns={roleColumns}
                dataSource={roleTableData}
                pagination={false}
                bordered
              />
            </Card>
          </Col>
          <Col span={24}>
            <Card title="权限说明">
              <Table
                columns={permissionDescColumns}
                dataSource={permissionDescData}
                pagination={false}
                bordered
                size="small"
              />
            </Card>
          </Col>
          {currentUser && (
            <Col span={24}>
              <Card title="当前用户信息">
                <Descriptions bordered column={1}>
                  <Descriptions.Item label="用户ID">{currentUser.id}</Descriptions.Item>
                  <Descriptions.Item label="用户姓名">{currentUser.name}</Descriptions.Item>
                  <Descriptions.Item label="角色">
                    <Tag color={ROLE_COLORS[currentUser.role]}>
                      {ROLE_LABELS[currentUser.role]}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="区域">{currentUser.region || '-'}</Descriptions.Item>
                  <Descriptions.Item label="拥有权限">
                    <Space wrap>
                      {ROLE_PERMISSIONS[currentUser.role].map((p) => (
                        <Tag key={p} color="blue">{PERMISSION_LABELS[p]}</Tag>
                      ))}
                    </Space>
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>
          )}
        </Row>
      ),
    },
    {
      key: 'dispatch',
      label: (
        <span>
          <ControlOutlined />
          调度规则
        </span>
      ),
      children: (
        <Row gutter={[16, 16]}>
          {!isCompanyAdmin && (
            <Col span={24}>
              <Alert
                message="权限不足"
                description="仅热力公司管理员可以修改调度规则"
                type="warning"
                showIcon
              />
            </Col>
          )}
          <Col span={24}>
            <Card title="调度规则配置">
              <Form
                form={dispatchForm}
                layout="vertical"
                initialValues={{
                  lowTempThreshold: -5,
                  highTempThreshold: 5,
                  supplyTempBaseline: 90,
                  heatExchangeWarning: 85,
                  primaryPressureLow: 0.6,
                  primaryPressureHigh: 1.4,
                  autoPushAlert: true,
                  orderEscalationHours: 2,
                  overdueWarnDays: 30,
                  overdueCloseDays: 37,
                }}
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="lowTempThreshold" label="室外温度低于(°C)时增加锅炉">
                      <InputNumber style={{ width: '100%' }} disabled={!isCompanyAdmin} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="highTempThreshold" label="室外温度高于(°C)时减少锅炉">
                      <InputNumber style={{ width: '100%' }} disabled={!isCompanyAdmin} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="supplyTempBaseline" label="供水温度基准值(°C)">
                      <InputNumber style={{ width: '100%' }} disabled={!isCompanyAdmin} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="heatExchangeWarning" label="换热效率低于(%)时预警">
                      <InputNumber style={{ width: '100%' }} disabled={!isCompanyAdmin} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="primaryPressureLow" label="一次网压力下限(MPa)">
                      <InputNumber style={{ width: '100%' }} step={0.1} disabled={!isCompanyAdmin} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="primaryPressureHigh" label="一次网压力上限(MPa)">
                      <InputNumber style={{ width: '100%' }} step={0.1} disabled={!isCompanyAdmin} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="autoPushAlert" label="告警自动推送" valuePropName="checked">
                      <Switch disabled={!isCompanyAdmin} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="orderEscalationHours" label="工单超时升级时间(小时)">
                      <InputNumber style={{ width: '100%' }} disabled={!isCompanyAdmin} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="overdueWarnDays" label="欠费催缴天数">
                      <InputNumber style={{ width: '100%' }} disabled={!isCompanyAdmin} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="overdueCloseDays" label="欠费关阀天数">
                      <InputNumber style={{ width: '100%' }} disabled={!isCompanyAdmin} />
                    </Form.Item>
                  </Col>
                </Row>
                {isCompanyAdmin && (
                  <Form.Item>
                    <Button type="primary" onClick={handleSaveDispatch}>
                      保存调度规则
                    </Button>
                  </Form.Item>
                )}
              </Form>
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'collection',
      label: (
        <span>
          <DatabaseOutlined />
          数据采集
        </span>
      ),
      children: (
        <Card title="数据采集设置">
          <Form
            form={collectForm}
            layout="vertical"
            initialValues={{
              collectInterval: 5,
              roomTempReportInterval: 5,
              dataRetentionDays: 365,
              anomalyThreshold: 10,
              alertDedupeWindow: 5,
            }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="collectInterval" label="采集频率(秒)">
                  <InputNumber style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="roomTempReportInterval" label="室温采集器上报频率(分钟)">
                  <InputNumber style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="dataRetentionDays" label="数据保留天数">
                  <InputNumber style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="anomalyThreshold" label="异常波动阈值(%)">
                  <InputNumber style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="alertDedupeWindow" label="告警去重时间窗口(分钟)">
                  <InputNumber style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item>
              <Button type="primary" onClick={handleSaveCollect}>
                保存采集设置
              </Button>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
    ...(canManageUsers
      ? [
          {
            key: 'users',
            label: (
              <span>
                <UserOutlined />
                用户管理
              </span>
            ),
            children: (
              <Card title="用户管理">
                <Table
                  columns={userColumns}
                  dataSource={MOCK_USERS}
                  rowKey="id"
                  bordered
                />
              </Card>
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card>
            <Tabs items={tabItems} />
          </Card>
        </Col>
      </Row>
      <Modal
        title="编辑用户"
        open={editModalVisible}
        onOk={handleEditUser}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingUser(null);
        }}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="role" label="角色">
            <Select>
              {(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => (
                <Select.Option key={role} value={role}>
                  <Tag color={ROLE_COLORS[role]}>{ROLE_LABELS[role]}</Tag>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="region" label="区域">
            <Select allowClear>
              {REGIONS.map((region) => (
                <Select.Option key={region} value={region}>
                  {region}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SystemSettings;
