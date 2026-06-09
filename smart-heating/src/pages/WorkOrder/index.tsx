import { useState, useEffect, useMemo } from 'react';
import { Row, Col, Card, Table, Tag, Button, Modal, Descriptions, Select, Input, DatePicker, Rate, Form, message, Statistic, Tabs } from 'antd';
import {
  FileTextOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  ArrowUpOutlined,
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  UserOutlined,
  TeamOutlined,
  AlertOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import ReactECharts from 'echarts-for-react';
import { generateWorkOrders } from '../../mock/data';
import type { WorkOrder } from '../../types';
import { useAuth } from '../../store/authStore';

declare global {
  interface Window {
    __escalatedOrders: WorkOrder[];
    __customWorkOrders: WorkOrder[];
  }
}

const { RangePicker } = DatePicker;

const REGIONS = ['全部', '朝阳区', '海淀区', '丰台区', '东城区', '西城区'];

const REGION_CODE: Record<string, string> = {
  '朝阳区': '朝',
  '海淀区': '海',
  '丰台区': '丰',
  '东城区': '东',
  '西城区': '西',
};

const TYPE_OPTIONS = [
  { value: '全部', label: '全部' },
  { value: 'repair', label: '维修' },
  { value: 'maintenance', label: '维护' },
  { value: 'inspection', label: '巡检' },
  { value: 'installation', label: '安装' },
];

const STATUS_OPTIONS = [
  { value: '全部', label: '全部' },
  { value: 'pending', label: '待处理' },
  { value: 'assigned', label: '已分配' },
  { value: 'in_progress', label: '处理中' },
  { value: 'completed', label: '已完成' },
  { value: 'escalated', label: '已升级' },
];

const PRIORITY_OPTIONS = [
  { value: '全部', label: '全部' },
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
  { value: 'urgent', label: '紧急' },
];

const TYPE_MAP: Record<string, { color: string; text: string }> = {
  repair: { color: 'red', text: '维修' },
  maintenance: { color: 'blue', text: '维护' },
  inspection: { color: 'green', text: '巡检' },
  installation: { color: 'orange', text: '安装' },
};

const STATUS_MAP: Record<string, { color: string; text: string }> = {
  pending: { color: 'orange', text: '待处理' },
  assigned: { color: 'blue', text: '已分配' },
  in_progress: { color: 'cyan', text: '处理中' },
  completed: { color: 'green', text: '已完成' },
  escalated: { color: 'red', text: '已升级' },
};

const PRIORITY_MAP: Record<string, { color: string; text: string }> = {
  low: { color: 'default', text: '低' },
  medium: { color: 'blue', text: '中' },
  high: { color: 'orange', text: '高' },
  urgent: { color: 'red', text: '紧急' },
};

const TEAMS = ['朝阳维修一组', '朝阳维修二组', '海淀维修一组', '海淀维修二组', '丰台维修一组', '东城维修组', '西城维修组'];
const TEAM_OPTIONS = TEAMS.map(t => ({ value: t, label: t }));

function WorkOrderPage() {
  const { currentUser, userRegion, userStationIds } = useAuth();
  const userRole = currentUser?.role || 'user';
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [filterType, setFilterType] = useState('全部');
  const [filterStatus, setFilterStatus] = useState('全部');
  const [filterPriority, setFilterPriority] = useState('全部');
  const [filterRegion, setFilterRegion] = useState('全部');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('1');

  useEffect(() => {
    if (userRole === 'region_manager' && userRegion) {
      setFilterRegion(userRegion);
    }
  }, [userRole, userRegion]);

  const regionOptions = useMemo(() => {
    const all = REGIONS.map(r => ({ value: r, label: r }));
    if (userRole === 'region_manager') {
      return [{ value: userRegion, label: userRegion }];
    }
    return all;
  }, [userRole, userRegion]);

  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);

  const [assignVisible, setAssignVisible] = useState(false);
  const [assignOrder, setAssignOrder] = useState<WorkOrder | null>(null);
  const [assignTeam, setAssignTeam] = useState('');
  const [assignee, setAssignee] = useState('');

  const refreshData = () => {
    const mockOrders = generateWorkOrders();
    const customOrders = window.__customWorkOrders || [];
    const escalatedOrders = window.__escalatedOrders || [];
    const customIds = new Set(customOrders.map(o => o.id));
    const escalatedMap = new Map(escalatedOrders.map(o => [o.id, o]));
    const merged = [
      ...customOrders.map(o => escalatedMap.get(o.id) || o),
      ...mockOrders.filter(o => !customIds.has(o.id)).map(o => escalatedMap.get(o.id) || o),
    ];
    setOrders(merged);
  };

  const roleFilteredOrders = useMemo(() => {
    if (userRole === 'company_admin') return orders;
    if (userRole === 'region_manager') {
      const code = REGION_CODE[userRegion];
      return code ? orders.filter(o => o.stationId.startsWith(`ST-${code}-`)) : orders;
    }
    if (userRole === 'station_admin') {
      const ids = new Set(userStationIds);
      return orders.filter(o => ids.has(o.stationId));
    }
    return orders;
  }, [orders, userRole, userRegion, userStationIds]);

  useEffect(() => {
    refreshData();
    const timer = setInterval(refreshData, 5000);
    return () => clearInterval(timer);
  }, []);

  const filteredOrders = roleFilteredOrders.filter(o => {
    if (filterType !== '全部' && o.type !== filterType) return false;
    if (filterStatus !== '全部' && o.status !== filterStatus) return false;
    if (filterPriority !== '全部' && o.priority !== filterPriority) return false;
    if (filterRegion !== '全部') {
      const code = REGION_CODE[filterRegion];
      if (code && !o.stationId.startsWith(`ST-${code}-`)) return false;
    }
    if (searchText && !o.title.includes(searchText) && !o.id.includes(searchText)) return false;
    return true;
  });

  const totalCount = roleFilteredOrders.length;
  const pendingCount = roleFilteredOrders.filter(o => o.status === 'pending').length;
  const inProgressCount = roleFilteredOrders.filter(o => o.status === 'assigned' || o.status === 'in_progress').length;
  const completedCount = roleFilteredOrders.filter(o => o.status === 'completed').length;
  const escalatedCount = roleFilteredOrders.filter(o => o.status === 'escalated').length;

  const handleAssign = () => {
    if (!assignOrder || !assignTeam) {
      message.warning('请选择负责班组');
      return;
    }
    setOrders(prev => prev.map(o =>
      o.id === assignOrder.id
        ? { ...o, status: 'assigned' as const, assigneeTeam: assignTeam, assignee: assignee || undefined, assignedAt: new Date().toLocaleString() }
        : o
    ));
    message.success('工单已分配');
    setAssignVisible(false);
    setAssignOrder(null);
    setAssignTeam('');
    setAssignee('');
  };

  const handleComplete = (order: WorkOrder) => {
    setOrders(prev => prev.map(o =>
      o.id === order.id
        ? { ...o, status: 'completed' as const, completedAt: new Date().toLocaleString() }
        : o
    ));
    message.success('工单已完成');
  };

  const handleEscalatedProcess = (order: WorkOrder) => {
    setOrders(prev => prev.map(o =>
      o.id === order.id
        ? { ...o, status: 'in_progress' as const }
        : o
    ));
    message.success('工单已开始处理');
  };

  const showDetail = (order: WorkOrder) => {
    setSelectedOrder(order);
    setDetailVisible(true);
  };

  const listColumns = [
    { title: '工单号', dataIndex: 'id', key: 'id', width: 110 },
    {
      title: '类型', dataIndex: 'type', key: 'type', width: 80,
      render: (type: string) => <Tag color={TYPE_MAP[type]?.color}>{TYPE_MAP[type]?.text}</Tag>,
    },
    { title: '标题', dataIndex: 'title', key: 'title', width: 180, ellipsis: true },
    {
      title: '优先级', dataIndex: 'priority', key: 'priority', width: 80,
      render: (p: string) => <Tag color={PRIORITY_MAP[p]?.color}>{PRIORITY_MAP[p]?.text}</Tag>,
    },
    { title: '所属站点', dataIndex: 'stationName', key: 'stationName', width: 150 },
    { title: '负责班组', dataIndex: 'assigneeTeam', key: 'assigneeTeam', width: 120, render: (v: string) => v || '-' },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 90,
      render: (s: string) => <Tag color={STATUS_MAP[s]?.color}>{STATUS_MAP[s]?.text}</Tag>,
    },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 150 },
    {
      title: '操作', key: 'action', width: 180, fixed: 'right' as const,
      render: (_: unknown, record: WorkOrder) => (
        <>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => showDetail(record)}>详情</Button>
          {record.status === 'pending' && (
            <Button type="link" size="small" icon={<TeamOutlined />} onClick={() => { setAssignOrder(record); setAssignVisible(true); }}>分配</Button>
          )}
          {(record.status === 'assigned' || record.status === 'in_progress') && (
            <Button type="link" size="small" icon={<CheckCircleOutlined />} onClick={() => handleComplete(record)}>完成</Button>
          )}
          {record.status === 'escalated' && (
            <Tag color="red">已升级至{record.escalatedTo}</Tag>
          )}
        </>
      ),
    },
  ];

  const typePieOption = {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      data: Object.entries(TYPE_MAP).map(([key, val]) => ({
        value: roleFilteredOrders.filter(o => o.type === key).length,
        name: val.text,
        itemStyle: { color: val.color === 'red' ? '#ff4d4f' : val.color === 'blue' ? '#1890ff' : val.color === 'green' ? '#52c41a' : '#fa8c16' },
      })),
    }],
  };

  const statusPieOption = {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      data: Object.entries(STATUS_MAP).map(([key, val]) => ({
        value: roleFilteredOrders.filter(o => o.status === key).length,
        name: val.text,
        itemStyle: {
          color: val.color === 'orange' ? '#fa8c16' : val.color === 'blue' ? '#1890ff' : val.color === 'cyan' ? '#13c2c2' : val.color === 'green' ? '#52c41a' : '#ff4d4f',
        },
      })),
    }],
  };

  const avgTimeByType = Object.entries(TYPE_MAP).map(([key, val]) => {
    const completedOfType = roleFilteredOrders.filter(o => o.type === key && o.status === 'completed' && o.completedAt);
    const avgHours = completedOfType.length > 0
      ? completedOfType.reduce((sum, o) => {
          const created = new Date(o.createdAt).getTime();
          const completed = new Date(o.completedAt!).getTime();
          return sum + (completed - created) / (1000 * 60 * 60);
        }, 0) / completedOfType.length
      : 0;
    return { type: val.text, hours: Number(avgHours.toFixed(1)) };
  });

  const avgTimeBarOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: 60, right: 30, bottom: 30, top: 30 },
    xAxis: { type: 'category', data: avgTimeByType.map(d => d.type) },
    yAxis: { type: 'value', name: '平均完成时间(h)' },
    series: [{
      type: 'bar',
      data: avgTimeByType.map(d => d.hours),
      itemStyle: {
        color: (params: { dataIndex: number }) => {
          const colors = ['#ff4d4f', '#1890ff', '#52c41a', '#fa8c16'];
          return colors[params.dataIndex] || '#1890ff';
        },
      },
      barWidth: 40,
    }],
  };

  const trendDays = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });
  const trendData = Array.from({ length: 30 }, () => Math.floor(Math.random() * 8) + 2);

  const trendLineOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: 50, right: 30, bottom: 30, top: 30 },
    xAxis: { type: 'category', data: trendDays },
    yAxis: { type: 'value', name: '工单数' },
    series: [{
      type: 'line',
      smooth: true,
      data: trendData,
      lineStyle: { color: '#1890ff', width: 2 },
      itemStyle: { color: '#1890ff' },
      areaStyle: { color: 'rgba(24, 144, 255, 0.15)' },
    }],
  };

  const escalatedOrders = roleFilteredOrders.filter(o => o.status === 'escalated');

  const escalatedColumns = [
    { title: '工单号', dataIndex: 'id', key: 'id', width: 110 },
    { title: '标题', dataIndex: 'title', key: 'title', width: 180, ellipsis: true },
    { title: '站点', dataIndex: 'stationName', key: 'stationName', width: 150 },
    { title: '原始班组', dataIndex: 'assigneeTeam', key: 'assigneeTeam', width: 120, render: (v: string) => v || '-' },
    { title: '升级时间', dataIndex: 'escalatedAt', key: 'escalatedAt', width: 150, render: (v: string) => v || '-' },
    { title: '升级至', dataIndex: 'escalatedTo', key: 'escalatedTo', width: 120, render: (v: string) => v || '-' },
    {
      title: '操作', key: 'action', width: 100,
      render: (_: unknown, record: WorkOrder) => (
        <Button type="link" size="small" icon={<ToolOutlined />} onClick={() => handleEscalatedProcess(record)}>处理</Button>
      ),
    },
  ];

  const completedRate = totalCount > 0 ? Number(((completedCount / totalCount) * 100).toFixed(1)) : 0;

  const gaugeOption = {
    series: [{
      type: 'gauge',
      startAngle: 200,
      endAngle: -20,
      min: 0,
      max: 100,
      splitNumber: 10,
      itemStyle: { color: '#1890ff' },
      progress: { show: true, width: 18 },
      pointer: { show: false },
      axisLine: { lineStyle: { width: 18 } },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      title: { offsetCenter: [0, '70%'], fontSize: 14 },
      detail: { valueAnimation: true, fontSize: 28, offsetCenter: [0, '40%'], formatter: '{value}%' },
      data: [{ value: completedRate, name: '工单完成率' }],
    }],
  };

  const responseTrendDays = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });
  const responseTrendData = Array.from({ length: 30 }, () => Number((10 + Math.random() * 40).toFixed(0)));

  const responseTrendOption = {
    tooltip: { trigger: 'axis', formatter: '{b}: {c}分钟' },
    grid: { left: 60, right: 30, bottom: 30, top: 30 },
    xAxis: { type: 'category', data: responseTrendDays },
    yAxis: { type: 'value', name: '平均响应时间(分钟)' },
    series: [{
      type: 'line',
      smooth: true,
      data: responseTrendData,
      lineStyle: { color: '#fa8c16', width: 2 },
      itemStyle: { color: '#fa8c16' },
      areaStyle: { color: 'rgba(250, 140, 22, 0.12)' },
    }],
  };

  const tabItems = [
    {
      key: '1',
      label: '工单列表',
      children: (
        <Table
          dataSource={filteredOrders}
          columns={listColumns}
          rowKey="id"
          size="small"
          scroll={{ x: 1200 }}
          pagination={{ pageSize: 10 }}
        />
      ),
    },
    {
      key: '2',
      label: '工单统计',
      children: (
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Card title="工单类型分布" size="small">
              <ReactECharts option={typePieOption} style={{ height: 280 }} />
            </Card>
          </Col>
          <Col span={12}>
            <Card title="工单状态分布" size="small">
              <ReactECharts option={statusPieOption} style={{ height: 280 }} />
            </Card>
          </Col>
          <Col span={12}>
            <Card title="各类型平均完成时间" size="small">
              <ReactECharts option={avgTimeBarOption} style={{ height: 280 }} />
            </Card>
          </Col>
          <Col span={12}>
            <Card title="近30天工单趋势" size="small">
              <ReactECharts option={trendLineOption} style={{ height: 280 }} />
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: '3',
      label: '超时升级',
      children: (
        <>
          <Card
            size="small"
            style={{ marginBottom: 16 }}
          >
            <Row align="middle" gutter={16}>
              <Col>
                <AlertOutlined style={{ color: '#fa8c16', fontSize: 20 }} />
              </Col>
              <Col>
                <span style={{ fontWeight: 600, fontSize: 14 }}>升级规则：</span>
                <span style={{ color: '#fa8c16' }}>工单超过2小时未响应自动升级至区域主管</span>
              </Col>
            </Row>
          </Card>
          <Table
            dataSource={escalatedOrders}
            columns={escalatedColumns}
            rowKey="id"
            size="small"
            scroll={{ x: 900 }}
            pagination={{ pageSize: 10 }}
          />
        </>
      ),
    },
  ];

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={5}>
          <Card size="small">
            <Statistic title="总工单数" value={totalCount} valueStyle={{ color: '#1890ff' }} prefix={<FileTextOutlined />} />
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small">
            <Statistic title="待处理" value={pendingCount} valueStyle={{ color: '#fa8c16' }} prefix={<ClockCircleOutlined />} />
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small">
            <Statistic title="处理中" value={inProgressCount} valueStyle={{ color: '#13c2c2' }} prefix={<SyncOutlined spin />} />
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small">
            <Statistic title="已完成" value={completedCount} valueStyle={{ color: '#52c41a' }} prefix={<CheckCircleOutlined />} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="已升级" value={escalatedCount} valueStyle={{ color: '#ff4d4f' }} prefix={<ArrowUpOutlined />} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={24}>
          <Card size="small">
            <Row align="middle" gutter={16} wrap>
              <Col>类型：</Col>
              <Col><Select value={filterType} onChange={setFilterType} style={{ width: 100 }} options={TYPE_OPTIONS} /></Col>
              <Col>状态：</Col>
              <Col><Select value={filterStatus} onChange={setFilterStatus} style={{ width: 100 }} options={STATUS_OPTIONS} /></Col>
              <Col>优先级：</Col>
              <Col><Select value={filterPriority} onChange={setFilterPriority} style={{ width: 100 }} options={PRIORITY_OPTIONS} /></Col>
              <Col>区域：</Col>
              <Col><Select value={filterRegion} onChange={setFilterRegion} style={{ width: 120 }} options={regionOptions} disabled={userRole === 'region_manager'} /></Col>
              <Col>
                <RangePicker value={dateRange} onChange={(dates) => setDateRange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null)} />
              </Col>
              <Col>
                <Input
                  placeholder="搜索工单号/标题"
                  prefix={<SearchOutlined />}
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  style={{ width: 180 }}
                  allowClear
                />
              </Col>
              <Col flex="auto" />
              <Col>
                <Button icon={<ReloadOutlined />} size="small" onClick={refreshData}>刷新</Button>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={24}>
          <Card>
            <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Card title="工单完成率" size="small">
            <ReactECharts option={gaugeOption} style={{ height: 260 }} />
          </Card>
        </Col>
        <Col span={16}>
          <Card title="平均响应时间趋势" size="small">
            <ReactECharts option={responseTrendOption} style={{ height: 260 }} />
          </Card>
        </Col>
      </Row>

      <Modal
        title="工单详情"
        open={detailVisible}
        onCancel={() => { setDetailVisible(false); setSelectedOrder(null); }}
        footer={null}
        width={720}
      >
        {selectedOrder && (
          <>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="工单号">{selectedOrder.id}</Descriptions.Item>
              <Descriptions.Item label="类型"><Tag color={TYPE_MAP[selectedOrder.type]?.color}>{TYPE_MAP[selectedOrder.type]?.text}</Tag></Descriptions.Item>
              <Descriptions.Item label="标题" span={2}>{selectedOrder.title}</Descriptions.Item>
              <Descriptions.Item label="描述" span={2}>{selectedOrder.description}</Descriptions.Item>
              <Descriptions.Item label="优先级"><Tag color={PRIORITY_MAP[selectedOrder.priority]?.color}>{PRIORITY_MAP[selectedOrder.priority]?.text}</Tag></Descriptions.Item>
              <Descriptions.Item label="状态"><Tag color={STATUS_MAP[selectedOrder.status]?.color}>{STATUS_MAP[selectedOrder.status]?.text}</Tag></Descriptions.Item>
              <Descriptions.Item label="所属站点">{selectedOrder.stationName}</Descriptions.Item>
              <Descriptions.Item label="负责班组">{selectedOrder.assigneeTeam || '-'}</Descriptions.Item>
              <Descriptions.Item label="负责人">{selectedOrder.assignee || '-'}</Descriptions.Item>
              <Descriptions.Item label="来源">{selectedOrder.source}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{selectedOrder.createdAt}</Descriptions.Item>
              <Descriptions.Item label="分配时间">{selectedOrder.assignedAt || '-'}</Descriptions.Item>
              <Descriptions.Item label="完成时间">{selectedOrder.completedAt || '-'}</Descriptions.Item>
              {selectedOrder.status === 'escalated' && (
                <>
                  <Descriptions.Item label="升级时间">{selectedOrder.escalatedAt || '-'}</Descriptions.Item>
                  <Descriptions.Item label="升级至">{selectedOrder.escalatedTo || '-'}</Descriptions.Item>
                </>
              )}
            </Descriptions>
            {selectedOrder.status === 'completed' && selectedOrder.userRating && (
              <Card size="small" style={{ marginTop: 16 }} title="用户评价">
                <div style={{ marginBottom: 8 }}>
                  <span style={{ marginRight: 8 }}>满意度评分：</span>
                  <Rate disabled value={selectedOrder.userRating} />
                </div>
                <div>
                  <span style={{ marginRight: 8 }}>用户反馈：</span>
                  {selectedOrder.userComment || '无'}
                </div>
              </Card>
            )}
          </>
        )}
      </Modal>

      <Modal
        title="分配工单"
        open={assignVisible}
        onOk={handleAssign}
        onCancel={() => { setAssignVisible(false); setAssignOrder(null); setAssignTeam(''); setAssignee(''); }}
        okText="确认分配"
        cancelText="取消"
      >
        {assignOrder && (
          <Descriptions bordered size="small" column={1} style={{ marginBottom: 16 }}>
            <Descriptions.Item label="工单号">{assignOrder.id}</Descriptions.Item>
            <Descriptions.Item label="标题">{assignOrder.title}</Descriptions.Item>
            <Descriptions.Item label="优先级"><Tag color={PRIORITY_MAP[assignOrder.priority]?.color}>{PRIORITY_MAP[assignOrder.priority]?.text}</Tag></Descriptions.Item>
          </Descriptions>
        )}
        <Form layout="vertical">
          <Form.Item label="负责班组" required>
            <Select value={assignTeam} onChange={setAssignTeam} style={{ width: '100%' }} placeholder="请选择班组" options={TEAM_OPTIONS} />
          </Form.Item>
          <Form.Item label="负责人">
            <Input value={assignee} onChange={e => setAssignee(e.target.value)} placeholder="请输入负责人姓名" prefix={<UserOutlined />} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default WorkOrderPage;
