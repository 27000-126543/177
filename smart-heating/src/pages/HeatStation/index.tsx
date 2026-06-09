import { useState, useEffect, useRef } from 'react';
import { Row, Col, Card, Table, Tag, Badge, Button, Modal, Descriptions, Select, Input, Statistic, Progress, message, Tabs, Timeline, Result } from 'antd';
import {
  EnvironmentOutlined,
  ReloadOutlined,
  SearchOutlined,
  EyeOutlined,
  ToolOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  AlertOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { generateHeatStations, generateWorkOrders } from '../../mock/data';
import type { HeatStation as HeatStationType, Device, WorkOrder } from '../../types';
import { useAuth } from '../../store/authStore';

declare global {
  interface Window {
    __escalatedOrders: WorkOrder[];
    __customWorkOrders: WorkOrder[];
  }
}

const REGIONS = ['全部', '朝阳区', '海淀区', '丰台区', '东城区', '西城区'];

const STATUS_OPTIONS = [
  { value: '全部', label: '全部' },
  { value: 'normal', label: '正常运行' },
  { value: 'warning', label: '预警' },
  { value: 'fault', label: '故障' },
  { value: 'offline', label: '离线' },
];

const STATION_STATUS_MAP: Record<string, { color: string; text: string }> = {
  normal: { color: 'green', text: '正常运行' },
  warning: { color: 'orange', text: '预警' },
  fault: { color: 'red', text: '故障' },
  offline: { color: 'default', text: '离线' },
};

const DEVICE_TYPE_MAP: Record<string, { color: string; text: string }> = {
  pump: { color: 'blue', text: '水泵' },
  valve: { color: 'purple', text: '阀门' },
  heat_exchanger: { color: 'orange', text: '换热器' },
  sensor: { color: 'cyan', text: '传感器' },
  controller: { color: 'geekblue', text: '控制器' },
};

const DEVICE_STATUS_MAP: Record<string, { color: string; text: string }> = {
  normal: { color: 'green', text: '正常' },
  warning: { color: 'orange', text: '预警' },
  fault: { color: 'red', text: '故障' },
};

const PRIORITY_MAP: Record<string, { color: string; text: string }> = {
  low: { color: 'default', text: '低' },
  medium: { color: 'blue', text: '中' },
  high: { color: 'orange', text: '高' },
  urgent: { color: 'red', text: '紧急' },
};

const WO_STATUS_MAP: Record<string, { color: string; text: string }> = {
  pending: { color: 'orange', text: '待分配' },
  assigned: { color: 'blue', text: '已分配' },
  in_progress: { color: 'cyan', text: '进行中' },
  completed: { color: 'green', text: '已完成' },
  escalated: { color: 'red', text: '已升级' },
};

const WO_TYPE_MAP: Record<string, string> = {
  repair: '维修',
  maintenance: '维护',
  inspection: '巡检',
  installation: '安装',
};

const TEAMS = ['朝阳维修一组', '朝阳维修二组', '海淀维修一组', '丰台维修一组', '东城维修组', '西城维修组'];

const PRIORITY_OPTIONS = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
  { value: 'urgent', label: '紧急' },
];

const TEAM_OPTIONS = TEAMS.map(t => ({ value: t, label: t }));

interface DeviceWithStation extends Device {
  stationName: string;
  stationId: string;
}

function HeatStation() {
  const { currentUser, userRegion, userStationIds } = useAuth();
  const userRole = currentUser?.role || 'user';
  const [stations, setStations] = useState<HeatStationType[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [selectedRegion, setSelectedRegion] = useState('全部');
  const [selectedStatus, setSelectedStatus] = useState('全部');
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('1');
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedStation, setSelectedStation] = useState<HeatStationType | null>(null);
  const [woVisible, setWoVisible] = useState(false);
  const [woStation, setWoStation] = useState<HeatStationType | null>(null);
  const [woPriority, setWoPriority] = useState<WorkOrder['priority']>('medium');
  const [woTeam, setWoTeam] = useState('');
  const [deviceStationFilter, setDeviceStationFilter] = useState('全部');
  const [repairVisible, setRepairVisible] = useState(false);
  const [repairDevice, setRepairDevice] = useState<DeviceWithStation | null>(null);
  const [repairPriority, setRepairPriority] = useState<WorkOrder['priority']>('medium');
  const [repairTeam, setRepairTeam] = useState('');
  const [assignVisible, setAssignVisible] = useState(false);
  const [assignOrder, setAssignOrder] = useState<WorkOrder | null>(null);
  const [assignTeam, setAssignTeam] = useState('');
  const [efficiencyStation, setEfficiencyStation] = useState('');
  const [woCounter, setWoCounter] = useState(100);
  const [customWorkOrders, setCustomWorkOrders] = useState<WorkOrder[]>([]);
  const customWorkOrdersRef = useRef<WorkOrder[]>([]);
  const stationsRef = useRef<HeatStationType[]>([]);
  const workOrdersRef = useRef<WorkOrder[]>([]);

  if (!window.__escalatedOrders) window.__escalatedOrders = [];
  if (!window.__customWorkOrders) window.__customWorkOrders = [];

  const refreshData = () => {
    const s = generateHeatStations();
    setStations(s);
    const mockWorkOrders = generateWorkOrders();
    const allWorkOrders = [...customWorkOrdersRef.current, ...mockWorkOrders];
    setWorkOrders(allWorkOrders);
    workOrdersRef.current = allWorkOrders;
    if (!efficiencyStation && s.length > 0) {
      setEfficiencyStation(s[0].id);
    }
  };

  useEffect(() => {
    refreshData();
    const timer = setInterval(refreshData, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    stationsRef.current = stations;
  }, [stations]);

  useEffect(() => {
    workOrdersRef.current = workOrders;
  }, [workOrders]);

  useEffect(() => {
    customWorkOrdersRef.current = customWorkOrders;
  }, [customWorkOrders]);

  useEffect(() => {
    const checkEscalation = () => {
      const now = Date.now();
      const TWO_HOURS = 2 * 60 * 60 * 1000;
      const TEN_SECONDS = 10 * 1000;
      const currentOrders = workOrdersRef.current;
      const customIds = new Set(customWorkOrdersRef.current.map(o => o.id));
      const toEscalate = currentOrders.filter(wo => {
        if (wo.status !== 'pending' && wo.status !== 'assigned') return false;
        const createdTime = new Date(wo.createdAt).getTime();
        const isCustom = customIds.has(wo.id);
        const threshold = isCustom ? TEN_SECONDS : TWO_HOURS;
        return now - createdTime > threshold;
      });

      if (toEscalate.length === 0) return;

      const escalatedMap = new Map<string, WorkOrder>();
      toEscalate.forEach(wo => {
        const station = stationsRef.current.find(s => s.id === wo.stationId);
        const region = station?.region || '';
        const escalated: WorkOrder = {
          ...wo,
          status: 'escalated',
          escalatedAt: new Date().toLocaleString(),
          escalatedTo: region + '区域主管',
        };
        escalatedMap.set(wo.id, escalated);
        window.__escalatedOrders = [...(window.__escalatedOrders || []), escalated];
      });

      setWorkOrders(prev => {
        const next = prev.map(wo => escalatedMap.has(wo.id) ? escalatedMap.get(wo.id)! : wo);
        workOrdersRef.current = next;
        return next;
      });

      setCustomWorkOrders(prev => {
        const next = prev.map(wo => escalatedMap.has(wo.id) ? escalatedMap.get(wo.id)! : wo);
        customWorkOrdersRef.current = next;
        return next;
      });
    };

    const timer = setInterval(checkEscalation, 30000);
    return () => clearInterval(timer);
  }, []);

  const roleFilteredStations = stations.filter(s => {
    if (userRole === 'company_admin') return true;
    if (userRole === 'region_manager') return s.region === userRegion;
    if (userRole === 'station_admin') return userStationIds.includes(s.id);
    return false;
  });

  const filteredStations = roleFilteredStations.filter(s => {
    if (selectedRegion !== '全部' && s.region !== selectedRegion) return false;
    if (selectedStatus !== '全部' && s.status !== selectedStatus) return false;
    if (searchText && !s.name.includes(searchText)) return false;
    return true;
  });

  const allDevices: DeviceWithStation[] = roleFilteredStations.flatMap(s =>
    s.devices.map(d => ({ ...d, stationName: s.name, stationId: s.id }))
  );
  const filteredDevices = deviceStationFilter === '全部'
    ? allDevices
    : allDevices.filter(d => d.stationId === deviceStationFilter);

  const stationWorkOrders = workOrders.filter(wo =>
    roleFilteredStations.some(s => s.id === wo.stationId)
  );

  const normalCount = filteredStations.filter(s => s.status === 'normal').length;
  const warningFaultCount = filteredStations.filter(s => s.status === 'warning' || s.status === 'fault').length;
  const offlineCount = filteredStations.filter(s => s.status === 'offline').length;

  const escalatedOrders = stationWorkOrders.filter(wo => wo.status === 'escalated');

  const handleCreateWorkOrder = () => {
    if (!woStation || !woTeam) {
      message.warning('请选择负责班组');
      return;
    }
    const newOrder: WorkOrder = {
      id: `WO-${String(woCounter).padStart(4, '0')}`,
      type: 'repair',
      title: `${woStation.name}设备故障维修`,
      description: `${woStation.name}状态异常(${STATION_STATUS_MAP[woStation.status]?.text})，需要维修`,
      status: 'assigned',
      priority: woPriority,
      source: 'system',
      sourceId: woStation.id,
      stationId: woStation.id,
      stationName: woStation.name,
      assigneeTeam: woTeam,
      createdAt: new Date().toLocaleString(),
      assignedAt: new Date().toLocaleString(),
    };
    setWorkOrders(prev => {
      const next = [newOrder, ...prev];
      workOrdersRef.current = next;
      return next;
    });
    setCustomWorkOrders(prev => {
      const next = [newOrder, ...prev];
      customWorkOrdersRef.current = next;
      return next;
    });
    window.__customWorkOrders = [...(window.__customWorkOrders || []), newOrder];
    setWoCounter(prev => prev + 1);
    message.success('工单已创建');
    setWoVisible(false);
    setWoStation(null);
    setWoPriority('medium');
    setWoTeam('');
  };

  const handleRepairDevice = () => {
    if (!repairDevice || !repairTeam) {
      message.warning('请选择负责班组');
      return;
    }
    const newOrder: WorkOrder = {
      id: `WO-${String(woCounter).padStart(4, '0')}`,
      type: 'repair',
      title: `${repairDevice.name}设备报修`,
      description: `${repairDevice.stationName} - ${repairDevice.name}运行异常，需要维修`,
      status: 'assigned',
      priority: repairPriority,
      source: 'system',
      sourceId: repairDevice.id,
      stationId: repairDevice.stationId,
      stationName: repairDevice.stationName,
      assigneeTeam: repairTeam,
      createdAt: new Date().toLocaleString(),
      assignedAt: new Date().toLocaleString(),
    };
    setWorkOrders(prev => {
      const next = [newOrder, ...prev];
      workOrdersRef.current = next;
      return next;
    });
    setCustomWorkOrders(prev => {
      const next = [newOrder, ...prev];
      customWorkOrdersRef.current = next;
      return next;
    });
    window.__customWorkOrders = [...(window.__customWorkOrders || []), newOrder];
    setWoCounter(prev => prev + 1);
    message.success('报修工单已创建');
    setRepairVisible(false);
    setRepairDevice(null);
    setRepairPriority('medium');
    setRepairTeam('');
  };

  const handleAssignOrder = () => {
    if (!assignOrder || !assignTeam) {
      message.warning('请选择负责班组');
      return;
    }
    setWorkOrders(prev => {
      const next = prev.map(wo =>
        wo.id === assignOrder.id
          ? { ...wo, status: 'assigned' as const, assigneeTeam: assignTeam, assignedAt: new Date().toLocaleString() }
          : wo
      );
      workOrdersRef.current = next;
      return next;
    });
    setCustomWorkOrders(prev => {
      const next = prev.map(wo =>
        wo.id === assignOrder.id
          ? { ...wo, status: 'assigned' as const, assigneeTeam: assignTeam, assignedAt: new Date().toLocaleString() }
          : wo
      );
      customWorkOrdersRef.current = next;
      return next;
    });
    message.success('工单已分配');
    setAssignVisible(false);
    setAssignOrder(null);
    setAssignTeam('');
  };

  const handleCompleteOrder = (order: WorkOrder) => {
    setWorkOrders(prev => {
      const next = prev.map(wo =>
        wo.id === order.id
          ? { ...wo, status: 'completed' as const, completedAt: new Date().toLocaleString() }
          : wo
      );
      workOrdersRef.current = next;
      return next;
    });
    setCustomWorkOrders(prev => {
      const next = prev.map(wo =>
        wo.id === order.id
          ? { ...wo, status: 'completed' as const, completedAt: new Date().toLocaleString() }
          : wo
      );
      customWorkOrdersRef.current = next;
      return next;
    });
    message.success('工单已完成');
  };

  const stationColumns = [
    { title: '站名', dataIndex: 'name', key: 'name', width: 150 },
    { title: '区域', dataIndex: 'region', key: 'region', width: 80 },
    { title: '小区', dataIndex: 'community', key: 'community', width: 120 },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 90,
      render: (status: string) => <Tag color={STATION_STATUS_MAP[status]?.color}>{STATION_STATUS_MAP[status]?.text}</Tag>,
    },
    { title: '一次网供水温度', dataIndex: 'primarySupplyTemp', key: 'primarySupplyTemp', width: 130, render: (v: number) => `${v}°C` },
    { title: '二次网供水温度', dataIndex: 'secondarySupplyTemp', key: 'secondarySupplyTemp', width: 130, render: (v: number) => `${v}°C` },
    {
      title: '换热效率(%)', dataIndex: 'heatExchangeEfficiency', key: 'heatExchangeEfficiency', width: 130,
      render: (v: number) => <Progress percent={v} size="small" status={v < 90 ? 'exception' : 'normal'} />,
    },
    { title: '上次维护', dataIndex: 'lastMaintenance', key: 'lastMaintenance', width: 110 },
    {
      title: '无人值守', dataIndex: 'unmanned', key: 'unmanned', width: 90,
      render: (v: boolean) => v ? <Badge status="success" text="是" /> : <Badge status="default" text="否" />,
    },
    {
      title: '操作', key: 'action', width: 160,
      render: (_: unknown, record: HeatStationType) => (
        <>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => { setSelectedStation(record); setDetailVisible(true); }}>详情</Button>
          {(record.status === 'fault' || record.status === 'warning') && (
            <Button type="link" size="small" danger icon={<ToolOutlined />} onClick={() => { setWoStation(record); setWoVisible(true); }}>生成工单</Button>
          )}
        </>
      ),
    },
  ];

  const deviceColumns = [
    { title: '设备名称', dataIndex: 'name', key: 'name', width: 120 },
    { title: '所属站点', dataIndex: 'stationName', key: 'stationName', width: 150 },
    {
      title: '类型', dataIndex: 'type', key: 'type', width: 90,
      render: (type: string) => <Tag color={DEVICE_TYPE_MAP[type]?.color}>{DEVICE_TYPE_MAP[type]?.text}</Tag>,
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 80,
      render: (status: string) => <Tag color={DEVICE_STATUS_MAP[status]?.color}>{DEVICE_STATUS_MAP[status]?.text}</Tag>,
    },
    { title: '运行时长(h)', dataIndex: 'runningHours', key: 'runningHours', width: 110, render: (v: number) => `${v}` },
    { title: '上次检查', dataIndex: 'lastCheck', key: 'lastCheck', width: 110 },
    {
      title: '操作', key: 'action', width: 80,
      render: (_: unknown, record: DeviceWithStation) => {
        if (record.status === 'fault') {
          return (
            <Button type="link" size="small" danger icon={<ToolOutlined />} onClick={() => {
              setRepairDevice(record);
              setRepairVisible(true);
            }}>报修</Button>
          );
        }
        return null;
      },
    },
  ];

  const woColumns = [
    { title: '工单号', dataIndex: 'id', key: 'id', width: 110 },
    {
      title: '类型', dataIndex: 'type', key: 'type', width: 70,
      render: (type: string) => WO_TYPE_MAP[type] || type,
    },
    { title: '标题', dataIndex: 'title', key: 'title', width: 180, ellipsis: true },
    {
      title: '优先级', dataIndex: 'priority', key: 'priority', width: 80,
      render: (p: string) => <Tag color={PRIORITY_MAP[p]?.color}>{PRIORITY_MAP[p]?.text}</Tag>,
    },
    { title: '站点', dataIndex: 'stationName', key: 'stationName', width: 150 },
    {
      title: '负责班组', dataIndex: 'assigneeTeam', key: 'assigneeTeam', width: 120,
      render: (v: string) => v || '-',
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 90,
      render: (s: string) => <Tag color={WO_STATUS_MAP[s]?.color}>{WO_STATUS_MAP[s]?.text}</Tag>,
    },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 150 },
    {
      title: '操作', key: 'action', width: 140,
      render: (_: unknown, record: WorkOrder) => {
        if (record.status === 'pending') {
          return <Button type="link" size="small" onClick={() => { setAssignOrder(record); setAssignVisible(true); }}>分配</Button>;
        }
        if (record.status === 'assigned' || record.status === 'in_progress') {
          return <Button type="link" size="small" onClick={() => handleCompleteOrder(record)}>完成</Button>;
        }
        if (record.status === 'escalated') {
          return <Tag color="red">已升级至{record.escalatedTo}</Tag>;
        }
        return null;
      },
    },
  ];

  const deviceDetailColumns = [
    { title: '设备名称', dataIndex: 'name', key: 'name' },
    {
      title: '类型', dataIndex: 'type', key: 'type',
      render: (type: string) => <Tag color={DEVICE_TYPE_MAP[type]?.color}>{DEVICE_TYPE_MAP[type]?.text}</Tag>,
    },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (status: string) => <Tag color={DEVICE_STATUS_MAP[status]?.color}>{DEVICE_STATUS_MAP[status]?.text}</Tag>,
    },
    { title: '运行时长(h)', dataIndex: 'runningHours', key: 'runningHours', render: (v: number) => `${v}` },
    { title: '上次检查', dataIndex: 'lastCheck', key: 'lastCheck' },
  ];

  const devicePieOption = {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      data: [
        { value: filteredDevices.filter(d => d.status === 'normal').length, name: '正常', itemStyle: { color: '#52c41a' } },
        { value: filteredDevices.filter(d => d.status === 'warning').length, name: '预警', itemStyle: { color: '#faad14' } },
        { value: filteredDevices.filter(d => d.status === 'fault').length, name: '故障', itemStyle: { color: '#ff4d4f' } },
      ],
    }],
  };

  const woPieOption = {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      data: [
        { value: stationWorkOrders.filter(wo => wo.status === 'pending').length, name: '待分配', itemStyle: { color: '#fa8c16' } },
        { value: stationWorkOrders.filter(wo => wo.status === 'assigned').length, name: '已分配', itemStyle: { color: '#1890ff' } },
        { value: stationWorkOrders.filter(wo => wo.status === 'in_progress').length, name: '进行中', itemStyle: { color: '#13c2c2' } },
        { value: stationWorkOrders.filter(wo => wo.status === 'completed').length, name: '已完成', itemStyle: { color: '#52c41a' } },
        { value: stationWorkOrders.filter(wo => wo.status === 'escalated').length, name: '已升级', itemStyle: { color: '#ff4d4f' } },
      ],
    }],
  };

  const efficiencyChartStation = roleFilteredStations.find(s => s.id === efficiencyStation);
  const efficiencyHours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
  const efficiencyBase = efficiencyChartStation?.heatExchangeEfficiency || 90;
  const efficiencyData = efficiencyHours.map(() => Number((efficiencyBase - 3 + Math.random() * 6).toFixed(1)));

  const efficiencyChartOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['换热效率(%)'] },
    grid: { left: 60, right: 30, bottom: 30, top: 40 },
    xAxis: { type: 'category', data: efficiencyHours },
    yAxis: { type: 'value', name: '效率(%)', min: 80, max: 100 },
    series: [{
      name: '换热效率(%)',
      type: 'line',
      smooth: true,
      data: efficiencyData,
      lineStyle: { color: '#1890ff', width: 2 },
      itemStyle: { color: '#1890ff' },
      areaStyle: { color: 'rgba(24, 144, 255, 0.15)' },
    }],
  };

  const tabItems = [
    {
      key: '1',
      label: '换热站列表',
      children: (
        <Table
          dataSource={filteredStations}
          columns={stationColumns}
          rowKey="id"
          size="small"
          scroll={{ x: 1300 }}
          pagination={{ pageSize: 10 }}
        />
      ),
    },
    {
      key: '2',
      label: '设备监控',
      children: (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col>
              <span style={{ marginRight: 8 }}>站点筛选：</span>
              <Select
                value={deviceStationFilter}
                onChange={setDeviceStationFilter}
                style={{ width: 200 }}
                options={[{ value: '全部', label: '全部' }, ...roleFilteredStations.map(s => ({ value: s.id, label: s.name }))]}
              />
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={16}>
              <Table
                dataSource={filteredDevices}
                columns={deviceColumns}
                rowKey="id"
                size="small"
                scroll={{ x: 800 }}
                pagination={{ pageSize: 10 }}
              />
            </Col>
            <Col span={8}>
              <Card title="设备状态分布" size="small">
                <ReactECharts option={devicePieOption} style={{ height: 250 }} />
              </Card>
            </Col>
          </Row>
        </>
      ),
    },
    {
      key: '3',
      label: '维修工单',
      children: (
        <>
          <Table
            dataSource={stationWorkOrders}
            columns={woColumns}
            rowKey="id"
            size="small"
            scroll={{ x: 1200 }}
            pagination={{ pageSize: 10 }}
            style={{ marginBottom: 16 }}
          />
          <Card title="工单状态分布" size="small">
            <ReactECharts option={woPieOption} style={{ height: 280 }} />
          </Card>
        </>
      ),
    },
  ];

  if (userRole === 'user') {
    return (
      <div style={{ padding: 48, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Result status="403" title="无权限" subTitle="您没有权限访问换热站管理页面" />
      </div>
    );
  }

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={24}>
          <Card size="small">
            <Row align="middle" gutter={16}>
              <Col>
                <EnvironmentOutlined style={{ marginRight: 4 }} />
                区域：
              </Col>
              <Col>
                <Select value={selectedRegion} onChange={setSelectedRegion} style={{ width: 120 }} options={REGIONS.map(r => ({ value: r, label: r }))} />
              </Col>
              <Col>状态：</Col>
              <Col>
                <Select value={selectedStatus} onChange={setSelectedStatus} style={{ width: 120 }} options={STATUS_OPTIONS} />
              </Col>
              <Col>
                <Input
                  placeholder="搜索站名"
                  prefix={<SearchOutlined />}
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  style={{ width: 200 }}
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
        <Col span={6}>
          <Card size="small">
            <Statistic title="总站数" value={filteredStations.length} suffix="个" valueStyle={{ color: '#1890ff' }} prefix={<DashboardOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="正常运行" value={normalCount} suffix="个" valueStyle={{ color: '#52c41a' }} prefix={<CheckCircleOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="预警/故障" value={warningFaultCount} suffix="个" valueStyle={{ color: '#fa541c' }} prefix={<WarningOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="离线" value={offlineCount} suffix="个" valueStyle={{ color: '#8c8c8c' }} prefix={<ClockCircleOutlined />} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={18}>
          <Card>
            <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
          </Card>
        </Col>
        <Col span={6}>
          <Card
            title={
              <span>
                <AlertOutlined style={{ marginRight: 8 }} />
                超时升级规则
              </span>
            }
          >
            <div style={{ background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 4, padding: 12, marginBottom: 16 }}>
              <WarningOutlined style={{ color: '#fa8c16', marginRight: 8 }} />
              设备故障工单超过2小时未响应，自动升级到区域主管
            </div>
            <Statistic title="已升级工单数" value={escalatedOrders.length} suffix="个" valueStyle={{ color: '#ff4d4f' }} style={{ marginBottom: 16 }} />
            <div style={{ fontWeight: 600, marginBottom: 8 }}>近期升级记录</div>
            <Timeline
              items={escalatedOrders.slice(0, 5).map(wo => ({
                color: 'red',
                children: (
                  <div>
                    <div><Tag color="red">{wo.id}</Tag> {wo.stationName}</div>
                    <div style={{ fontSize: 12, color: '#999' }}>升级时间：{wo.escalatedAt}</div>
                    <div style={{ fontSize: 12, color: '#999' }}>升级至：{wo.escalatedTo}</div>
                  </div>
                ),
              }))}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card
            title="换热效率趋势"
            extra={
              <Select
                value={efficiencyStation}
                onChange={setEfficiencyStation}
                style={{ width: 200 }}
                options={roleFilteredStations.map(s => ({ value: s.id, label: s.name }))}
              />
            }
          >
            <ReactECharts option={efficiencyChartOption} style={{ height: 300 }} />
          </Card>
        </Col>
      </Row>

      <Modal
        title={selectedStation?.name || '站点详情'}
        open={detailVisible}
        onCancel={() => { setDetailVisible(false); setSelectedStation(null); }}
        footer={null}
        width={720}
      >
        {selectedStation && (
          <>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="站名">{selectedStation.name}</Descriptions.Item>
              <Descriptions.Item label="区域">{selectedStation.region}</Descriptions.Item>
              <Descriptions.Item label="小区">{selectedStation.community}</Descriptions.Item>
              <Descriptions.Item label="状态"><Tag color={STATION_STATUS_MAP[selectedStation.status]?.color}>{STATION_STATUS_MAP[selectedStation.status]?.text}</Tag></Descriptions.Item>
              <Descriptions.Item label="无人值守">{selectedStation.unmanned ? '是' : '否'}</Descriptions.Item>
              <Descriptions.Item label="换热效率">{selectedStation.heatExchangeEfficiency}%</Descriptions.Item>
              <Descriptions.Item label="一次网供水温度">{selectedStation.primarySupplyTemp}°C</Descriptions.Item>
              <Descriptions.Item label="一次网回水温度">{selectedStation.primaryReturnTemp}°C</Descriptions.Item>
              <Descriptions.Item label="一次网压力">{selectedStation.primaryPressure}MPa</Descriptions.Item>
              <Descriptions.Item label="一次网流量">{selectedStation.primaryFlow}t/h</Descriptions.Item>
              <Descriptions.Item label="二次网供水温度">{selectedStation.secondarySupplyTemp}°C</Descriptions.Item>
              <Descriptions.Item label="二次网回水温度">{selectedStation.secondaryReturnTemp}°C</Descriptions.Item>
              <Descriptions.Item label="二次网压力">{selectedStation.secondaryPressure}MPa</Descriptions.Item>
              <Descriptions.Item label="二次网流量">{selectedStation.secondaryFlow}t/h</Descriptions.Item>
              <Descriptions.Item label="上次维护">{selectedStation.lastMaintenance}</Descriptions.Item>
            </Descriptions>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>设备列表</div>
            <Table
              dataSource={selectedStation.devices}
              columns={deviceDetailColumns}
              rowKey="id"
              size="small"
              pagination={false}
            />
          </>
        )}
      </Modal>

      <Modal
        title="生成工单"
        open={woVisible}
        onOk={handleCreateWorkOrder}
        onCancel={() => { setWoVisible(false); setWoStation(null); }}
        okText="创建"
        cancelText="取消"
      >
        {woStation && (
          <Descriptions bordered size="small" column={1} style={{ marginBottom: 16 }}>
            <Descriptions.Item label="标题">{woStation.name}设备故障维修</Descriptions.Item>
            <Descriptions.Item label="描述">{woStation.name}状态异常({STATION_STATUS_MAP[woStation.status]?.text})，需要维修</Descriptions.Item>
          </Descriptions>
        )}
        <Row gutter={16}>
          <Col span={12}>
            <div style={{ marginBottom: 8 }}>优先级：</div>
            <Select value={woPriority} onChange={setWoPriority} style={{ width: '100%' }} options={PRIORITY_OPTIONS} />
          </Col>
          <Col span={12}>
            <div style={{ marginBottom: 8 }}>负责班组：</div>
            <Select value={woTeam} onChange={setWoTeam} style={{ width: '100%' }} placeholder="请选择班组" options={TEAM_OPTIONS} />
          </Col>
        </Row>
      </Modal>

      <Modal
        title="设备报修"
        open={repairVisible}
        onOk={handleRepairDevice}
        onCancel={() => { setRepairVisible(false); setRepairDevice(null); }}
        okText="提交"
        cancelText="取消"
      >
        {repairDevice && (
          <Descriptions bordered size="small" column={1} style={{ marginBottom: 16 }}>
            <Descriptions.Item label="标题">{repairDevice.name}设备报修</Descriptions.Item>
            <Descriptions.Item label="描述">{repairDevice.stationName} - {repairDevice.name}运行异常，需要维修</Descriptions.Item>
          </Descriptions>
        )}
        <Row gutter={16}>
          <Col span={12}>
            <div style={{ marginBottom: 8 }}>优先级：</div>
            <Select value={repairPriority} onChange={setRepairPriority} style={{ width: '100%' }} options={PRIORITY_OPTIONS} />
          </Col>
          <Col span={12}>
            <div style={{ marginBottom: 8 }}>负责班组：</div>
            <Select value={repairTeam} onChange={setRepairTeam} style={{ width: '100%' }} placeholder="请选择班组" options={TEAM_OPTIONS} />
          </Col>
        </Row>
      </Modal>

      <Modal
        title="分配工单"
        open={assignVisible}
        onOk={handleAssignOrder}
        onCancel={() => { setAssignVisible(false); setAssignOrder(null); }}
        okText="确认分配"
        cancelText="取消"
      >
        {assignOrder && (
          <Descriptions bordered size="small" column={1} style={{ marginBottom: 16 }}>
            <Descriptions.Item label="工单号">{assignOrder.id}</Descriptions.Item>
            <Descriptions.Item label="标题">{assignOrder.title}</Descriptions.Item>
          </Descriptions>
        )}
        <div style={{ marginBottom: 8 }}>负责班组：</div>
        <Select value={assignTeam} onChange={setAssignTeam} style={{ width: '100%' }} placeholder="请选择班组" options={TEAM_OPTIONS} />
      </Modal>
    </div>
  );
}

export default HeatStation;
