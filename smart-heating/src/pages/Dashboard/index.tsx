import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Row, Col, Card, Statistic, Tag, Table, Badge, Select, Button, Modal } from 'antd';
import {
  FireOutlined,
  CheckCircleOutlined,
  DashboardOutlined,
  HomeOutlined,
  AlertOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import {
  generateHeatSourcePlants,
  generateHeatStations,
  generateAlerts,
  generateRoomTempData,
  generateBillingRecords,
} from '../../mock/data';
import type { AlertRecord, HeatSourcePlant, HeatStation, RoomTempData, BillingRecord } from '../../types';
import { useAuth } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';

const regionOptions = [
  { value: '全部', label: '全部' },
  { value: '朝阳区', label: '朝阳区' },
  { value: '海淀区', label: '海淀区' },
  { value: '丰台区', label: '丰台区' },
  { value: '东城区', label: '东城区' },
  { value: '西城区', label: '西城区' },
];

const REGION_CODE: Record<string, string> = {
  '朝阳区': '朝',
  '海淀区': '海',
  '丰台区': '丰',
  '东城区': '东',
  '西城区': '西',
};

function stationIdMatchesRegion(stationId: string, region: string): boolean {
  const code = REGION_CODE[region];
  return code ? stationId.startsWith(`ST-${code}-`) : false;
}

const alertLevelColor: Record<string, string> = {
  info: 'blue',
  warning: 'orange',
  error: 'red',
  critical: 'magenta',
};

const alertStatusMap: Record<string, { text: string; status: 'default' | 'processing' | 'success' | 'error' }> = {
  pending: { text: '待处理', status: 'error' },
  processing: { text: '处理中', status: 'processing' },
  resolved: { text: '已解决', status: 'success' },
};

function generateTempTrend(): { hours: string[]; rates: number[] } {
  const hours: string[] = [];
  const rates: number[] = [];
  for (let i = 23; i >= 0; i--) {
    const h = new Date();
    h.setHours(h.getHours() - i);
    hours.push(`${String(h.getHours()).padStart(2, '0')}:00`);
    rates.push(Number((92 + Math.random() * 6).toFixed(1)));
  }
  return { hours, rates };
}

const Dashboard: React.FC = () => {
  const { currentUser, userRegion, userStationIds } = useAuth();
  const navigate = useNavigate();
  const userRole = currentUser?.role || 'user';

  const [rawPlants, setRawPlants] = useState<HeatSourcePlant[]>(generateHeatSourcePlants());
  const [rawStations, setRawStations] = useState<HeatStation[]>(generateHeatStations());
  const [rawAlerts, setRawAlerts] = useState<AlertRecord[]>(generateAlerts());
  const [rawRoomData, setRawRoomData] = useState<RoomTempData[]>(generateRoomTempData());
  const [rawBilling, setRawBilling] = useState<BillingRecord[]>(generateBillingRecords());
  const [tempTrend, setTempTrend] = useState(generateTempTrend());
  const [region, setRegion] = useState('全部');
  const [community, setCommunity] = useState<string | undefined>(undefined);
  const [stationFilter, setStationFilter] = useState<string | undefined>(undefined);
  const [overdueModalVisible, setOverdueModalVisible] = useState(false);

  const roleFilteredStations = useMemo(() => {
    if (userRole === 'company_admin') return rawStations;
    if (userRole === 'region_manager') return rawStations.filter(s => s.region === userRegion);
    if (userRole === 'station_admin') return rawStations.filter(s => userStationIds.includes(s.id));
    return [];
  }, [rawStations, userRole, userRegion, userStationIds]);

  const roleFilteredPlants = useMemo(() => {
    if (userRole === 'company_admin') return rawPlants;
    if (userRole === 'region_manager') return rawPlants.filter(p => p.region === userRegion);
    if (userRole === 'station_admin') {
      const regions = new Set(roleFilteredStations.map(s => s.region));
      return rawPlants.filter(p => regions.has(p.region));
    }
    return [];
  }, [rawPlants, userRole, userRegion, roleFilteredStations]);

  const roleFilteredRoomData = useMemo(() => {
    if (userRole === 'company_admin') return rawRoomData;
    if (userRole === 'region_manager') return rawRoomData.filter(r => stationIdMatchesRegion(r.stationId, userRegion));
    if (userRole === 'station_admin') {
      const stationIdsSet = new Set(userStationIds);
      return rawRoomData.filter(r => stationIdsSet.has(r.stationId));
    }
    return rawRoomData.filter(r => r.userName === currentUser?.name);
  }, [rawRoomData, userRole, userRegion, userStationIds, currentUser]);

  const roleFilteredBilling = useMemo(() => {
    if (userRole === 'company_admin') return rawBilling;
    if (userRole === 'region_manager') return rawBilling.filter(b => stationIdMatchesRegion(b.stationId, userRegion));
    if (userRole === 'station_admin') {
      const stationIdsSet = new Set(userStationIds);
      return rawBilling.filter(b => stationIdsSet.has(b.stationId));
    }
    return rawBilling.filter(b => b.userName === currentUser?.name);
  }, [rawBilling, userRole, userRegion, userStationIds, currentUser]);

  const roleFilteredAlerts = useMemo(() => {
    if (userRole === 'company_admin') return rawAlerts;
    const stationIdsSet = new Set(roleFilteredStations.map(s => s.id));
    return rawAlerts.filter(a => stationIdsSet.has(a.sourceId));
  }, [rawAlerts, userRole, roleFilteredStations]);

  const refreshData = useCallback(() => {
    setRawPlants(generateHeatSourcePlants());
    setRawStations(generateHeatStations());
    setRawAlerts(generateAlerts());
    setRawRoomData(generateRoomTempData());
    setRawBilling(generateBillingRecords());
    setTempTrend(generateTempTrend());
  }, []);

  useEffect(() => {
    const timer = setInterval(refreshData, 5000);
    return () => clearInterval(timer);
  }, [refreshData]);

  const filteredStations = useMemo(() => {
    let result = roleFilteredStations;
    if (region !== '全部') {
      result = result.filter((s) => s.region === region);
    }
    if (community) {
      result = result.filter((s) => s.community === community);
    }
    if (stationFilter) {
      result = result.filter((s) => s.id === stationFilter);
    }
    return result;
  }, [roleFilteredStations, region, community, stationFilter]);

  const filteredStationIds = useMemo(() => new Set(filteredStations.map((s) => s.id)), [filteredStations]);

  const filteredPlants = useMemo(() => {
    let result = roleFilteredPlants;
    if (region !== '全部') result = result.filter((p) => p.region === region);
    return result;
  }, [roleFilteredPlants, region]);

  const filteredAlerts = useMemo(() => {
    if (filteredStationIds.size === roleFilteredStations.length && region === '全部') return roleFilteredAlerts;
    return roleFilteredAlerts.filter((a) => filteredStationIds.has(a.sourceId));
  }, [roleFilteredAlerts, filteredStationIds, roleFilteredStations.length, region]);

  const filteredRoomData = useMemo(() => {
    if (filteredStationIds.size === new Set(roleFilteredRoomData.map((r) => r.stationId)).size && region === '全部') return roleFilteredRoomData;
    return roleFilteredRoomData.filter((r) => filteredStationIds.has(r.stationId));
  }, [roleFilteredRoomData, filteredStationIds, region]);

  const filteredBilling = useMemo(() => {
    if (filteredStationIds.size === new Set(roleFilteredBilling.map(b => b.stationId)).size && region === '全部') return roleFilteredBilling;
    return roleFilteredBilling.filter(b => filteredStationIds.has(b.stationId));
  }, [roleFilteredBilling, filteredStationIds, region]);

  const overdueRecords = filteredBilling.filter(b => b.overdueDays > 30);

  const stationNameMap = useMemo(() => {
    const map = new Map<string, string>();
    rawStations.forEach(s => { map.set(s.id, s.name); });
    return map;
  }, [rawStations]);

  const handleRegionChange = useCallback((value: string) => {
    setRegion(value);
    setCommunity(undefined);
    setStationFilter(undefined);
  }, []);

  const handleCommunityChange = useCallback((value: string | undefined) => {
    setCommunity(value);
    setStationFilter(undefined);
  }, []);

  const communityOptions = useMemo(() => {
    const sourceStations = region === '全部' ? roleFilteredStations : roleFilteredStations.filter((s) => s.region === region);
    const communities = Array.from(new Set(sourceStations.map((s) => s.community)));
    return [
      { value: undefined, label: '全部小区' },
      ...communities.map((c) => ({ value: c, label: c })),
    ];
  }, [roleFilteredStations, region]);

  const stationOptions = useMemo(() => {
    let sourceStations = roleFilteredStations;
    if (region !== '全部') {
      sourceStations = sourceStations.filter((s) => s.region === region);
    }
    if (community) {
      sourceStations = sourceStations.filter((s) => s.community === community);
    }
    return [
      { value: undefined, label: '全部换热站' },
      ...sourceStations.map((s) => ({ value: s.id, label: s.name })),
    ];
  }, [roleFilteredStations, region, community]);

  const summary = useMemo(() => {
    const totalPlants = filteredPlants.length;
    const runningPlants = filteredPlants.filter((p) => p.status === 'running').length;
    const normalStations = filteredStations.filter((s) => s.status === 'normal').length;
    const warningStations = filteredStations.filter((s) => s.status === 'warning').length;
    const faultStations = filteredStations.filter((s) => s.status === 'fault').length;
    const offlineStations = filteredStations.filter((s) => s.status === 'offline').length;
    const totalStations = filteredStations.length;
    const avgSupplyTemp = totalStations > 0
      ? Number((filteredStations.reduce((s, st) => s + st.primarySupplyTemp, 0) / totalStations).toFixed(1))
      : 0;
    const roomTempPassRate = filteredRoomData.length > 0
      ? Number(((filteredRoomData.filter((r) => r.status === 'normal').length / filteredRoomData.length) * 100).toFixed(1))
      : 0;
    const pendingAlerts = filteredAlerts.filter((a) => a.status === 'pending').length;
    const overdueRecords = filteredBilling.filter((b) => b.overdueDays > 30);
    const overdueCount = overdueRecords.length;
    const totalOverdueAmount = overdueRecords.reduce((s, b) => s + (b.totalAmount - b.paidAmount), 0);
    const avgRepairTime = 4.0;
    return {
      totalPlants,
      runningPlants,
      normalStations,
      warningStations,
      faultStations,
      offlineStations,
      totalStations,
      avgSupplyTemp,
      roomTempPassRate,
      pendingAlerts,
      overdueCount,
      totalOverdueAmount,
      avgRepairTime,
    };
  }, [filteredPlants, filteredStations, filteredRoomData, filteredAlerts, filteredBilling]);

  const normalRate = summary.totalStations > 0
    ? ((summary.normalStations / summary.totalStations) * 100).toFixed(1)
    : '0.0';

  const loadChartOption = {
    tooltip: { trigger: 'axis' as const },
    legend: { data: ['实际负荷', '最大负荷'] },
    grid: { left: 60, right: 20, top: 40, bottom: 30 },
    xAxis: {
      type: 'category' as const,
      data: filteredPlants.map((p) => p.name),
      axisLabel: { rotate: 30, fontSize: 11 },
    },
    yAxis: { type: 'value' as const, name: 'MW' },
    series: [
      {
        name: '实际负荷',
        type: 'bar' as const,
        data: filteredPlants.map((p) => p.load),
        itemStyle: { color: '#1890ff' },
      },
      {
        name: '最大负荷',
        type: 'bar' as const,
        data: filteredPlants.map((p) => p.maxLoad),
        itemStyle: { color: '#ff4d4f' },
      },
    ],
  };

  const regionNames = Array.from(new Set(filteredStations.map((s) => s.region)));
  const networkTypes = ['一次网', '二次网'];
  const heatmapData: [number, number, number][] = [];
  regionNames.forEach((rName, yIdx) => {
    const regionStations = filteredStations.filter((s) => s.region === rName);
    networkTypes.forEach((_nType, xIdx) => {
      const temps = regionStations.map((s) =>
        xIdx === 0 ? s.primarySupplyTemp : s.secondarySupplyTemp
      );
      const avg = temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : 0;
      heatmapData.push([xIdx, yIdx, Number(avg.toFixed(1))]);
    });
  });

  const heatmapOption = {
    tooltip: {
      formatter: (params: { data: number[] }) => {
        const d = params.data;
        return `${regionNames[d[1]]} - ${networkTypes[d[0]]}<br/>供水温度: ${d[2]}°C`;
      },
    },
    grid: { left: 80, right: 60, top: 10, bottom: 40 },
    xAxis: {
      type: 'category' as const,
      data: networkTypes,
      splitArea: { show: true },
    },
    yAxis: {
      type: 'category' as const,
      data: regionNames,
      splitArea: { show: true },
    },
    visualMap: {
      min: 45,
      max: 110,
      calculable: true,
      orient: 'horizontal' as const,
      left: 'center',
      bottom: 0,
      inRange: { color: ['#1890ff', '#faad14', '#f5222d'] },
    },
    series: [
      {
        type: 'heatmap' as const,
        data: heatmapData,
        label: { show: true, formatter: (p: { data: number[] }) => `${p.data[2]}°C` },
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' } },
      },
    ],
  };

  const statusCounts = [
    { name: '正常', value: summary.normalStations, itemStyle: { color: '#52c41a' } },
    { name: '预警', value: summary.warningStations, itemStyle: { color: '#faad14' } },
    { name: '故障', value: summary.faultStations, itemStyle: { color: '#f5222d' } },
    { name: '离线', value: summary.offlineStations, itemStyle: { color: '#d9d9d9' } },
  ];

  const pieOption = {
    tooltip: { trigger: 'item' as const },
    legend: { bottom: 0 },
    series: [
      {
        type: 'pie' as const,
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: true, formatter: '{b}: {c}' },
        data: statusCounts,
      },
    ],
  };

  const gaugeOption = {
    series: [
      {
        type: 'gauge' as const,
        startAngle: 200,
        endAngle: -20,
        min: 0,
        max: 12,
        detail: { formatter: '{value}h', fontSize: 20, offsetCenter: [0, '60%'] },
        data: [{ value: Number(summary.avgRepairTime.toFixed(1)), name: '平均响应时间' }],
        title: { offsetCenter: [0, '80%'], fontSize: 14 },
        axisLine: {
          lineStyle: {
            width: 18,
            color: [
              [0.3, '#52c41a'],
              [0.7, '#faad14'],
              [1, '#f5222d'],
            ],
          },
        },
        pointer: { width: 5 },
        axisTick: { length: 6, lineStyle: { color: 'auto' } },
        splitLine: { length: 12, lineStyle: { color: 'auto' } },
        axisLabel: { fontSize: 11, distance: 16, color: 'auto' },
      },
    ],
  };

  const trendOption = {
    tooltip: { trigger: 'axis' as const },
    grid: { left: 50, right: 20, top: 30, bottom: 30 },
    xAxis: { type: 'category' as const, data: tempTrend.hours, boundaryGap: false },
    yAxis: {
      type: 'value' as const,
      name: '达标率(%)',
      min: 85,
      max: 100,
    },
    series: [
      {
        name: '室温达标率',
        type: 'line' as const,
        data: tempTrend.rates,
        smooth: true,
        areaStyle: { color: 'rgba(24,144,255,0.15)' },
        lineStyle: { color: '#1890ff', width: 2 },
        itemStyle: { color: '#1890ff' },
        markLine: {
          data: [{ yAxis: 95, name: '目标线', lineStyle: { color: '#f5222d', type: 'dashed' as const } }],
        },
      },
    ],
  };

  const alertColumns = [
    { title: '时间', dataIndex: 'time', key: 'time', width: 140, render: (v: string) => v.slice(5) },
    { title: '来源', dataIndex: 'source', key: 'source', width: 120, ellipsis: true },
    { title: '告警内容', dataIndex: 'message', key: 'message', ellipsis: true },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 70,
      render: (v: string) => <Tag color={alertLevelColor[v]}>{v}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (v: string) => {
        const s = alertStatusMap[v];
        return <Badge status={s.status} text={s.text} />;
      },
    },
  ];

  if (userRole === 'user') {
    const myRoom = roleFilteredRoomData[0];
    const myBilling = roleFilteredBilling[0];
    return (
      <div style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
        <Card title="我的供暖信息" style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Statistic
                title="当前室温"
                value={myRoom?.currentTemp || '--'}
                suffix="°C"
                prefix={<HomeOutlined style={{ color: '#1890ff' }} />}
                valueStyle={{ color: myRoom && myRoom.currentTemp < 18 ? '#1890ff' : '#52c41a' }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="目标温度"
                value={myRoom?.targetTemp || '--'}
                suffix="°C"
                prefix={<DashboardOutlined style={{ color: '#52c41a' }} />}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="状态"
                value={myRoom?.status === 'normal' ? '正常' : myRoom?.status === 'low' ? '偏低' : '--'}
                valueStyle={{ color: myRoom?.status === 'normal' ? '#52c41a' : myRoom?.status === 'low' ? '#1890ff' : undefined }}
              />
            </Col>
          </Row>
        </Card>
        <Card title="缴费信息" style={{ marginBottom: 16 }}>
          {myBilling ? (
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic title="应缴金额" value={myBilling.totalAmount} prefix="¥" valueStyle={{ color: '#1890ff' }} />
              </Col>
              <Col span={12}>
                <Statistic title="已缴金额" value={myBilling.paidAmount} prefix="¥" valueStyle={{ color: '#52c41a' }} />
              </Col>
              <Col span={12}>
                <Statistic
                  title="欠缴金额"
                  value={Number((myBilling.totalAmount - myBilling.paidAmount).toFixed(2))}
                  prefix="¥"
                  valueStyle={{ color: myBilling.totalAmount - myBilling.paidAmount > 0 ? '#f5222d' : '#52c41a' }}
                />
              </Col>
              <Col span={12}>
                <Statistic title="缴费状态" value={myBilling.status === 'paid' ? '已缴费' : myBilling.status === 'overdue' ? '欠费中' : myBilling.status === 'partial' ? '部分缴费' : '已限制'} />
              </Col>
            </Row>
          ) : (
            <div style={{ color: '#999' }}>暂无缴费记录</div>
          )}
        </Card>
        <Card title="快捷操作">
          <Button type="primary" icon={<ExclamationCircleOutlined />} block>提交报修</Button>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col>
          <Select
            value={region}
            onChange={handleRegionChange}
            options={regionOptions}
            style={{ width: 140 }}
          />
        </Col>
        <Col>
          <Select
            value={community}
            onChange={handleCommunityChange}
            options={communityOptions}
            style={{ width: 160 }}
            allowClear
            placeholder="全部小区"
          />
        </Col>
        <Col>
          <Select
            value={stationFilter}
            onChange={setStationFilter}
            options={stationOptions}
            style={{ width: 180 }}
            allowClear
            placeholder="全部换热站"
          />
        </Col>
        <Col>
          <Button icon={<ReloadOutlined />} onClick={refreshData}>
            刷新数据
          </Button>
        </Col>
        <Col>
          <Button type="primary">导出报告</Button>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col span={4}>
          <Card className="dashboard-card">
            <Statistic
              title="运行热源厂"
              value={summary.runningPlants}
              suffix={`/ ${summary.totalPlants}`}
              prefix={<FireOutlined style={{ color: '#f5222d' }} />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="dashboard-card">
            <Statistic
              title="换热站正常率"
              value={normalRate}
              suffix="%"
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="dashboard-card">
            <Statistic
              title="供水温度"
              value={summary.avgSupplyTemp}
              suffix="°C"
              prefix={<DashboardOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="dashboard-card">
            <Statistic
              title="室温达标率"
              value={summary.roomTempPassRate}
              suffix="%"
              prefix={<HomeOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="dashboard-card">
            <Statistic
              title="待处理告警"
              value={summary.pendingAlerts}
              prefix={<AlertOutlined style={{ color: '#faad14' }} />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="dashboard-card" style={{ cursor: 'pointer' }} onClick={() => setOverdueModalVisible(true)}>
            <Statistic
              title="欠费户数"
              value={summary.overdueCount}
              prefix={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card className="dashboard-card" title={<><FireOutlined /> 热源厂负荷分布</>}>
            <ReactECharts option={loadChartOption} style={{ height: 300 }} />
          </Card>
        </Col>
        <Col span={12}>
          <Card className="dashboard-card" title={<><DashboardOutlined /> 全网供水温度热力图</>}>
            <ReactECharts option={heatmapOption} style={{ height: 300 }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={8}>
          <Card className="dashboard-card" title={<><CheckCircleOutlined /> 换热站运行状态</>}>
            <ReactECharts option={pieOption} style={{ height: 280 }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card className="dashboard-card" title={<><AlertOutlined /> 最近告警</>}>
            <Table
              dataSource={filteredAlerts.slice(0, 5)}
              columns={alertColumns}
              rowKey="id"
              size="small"
              pagination={false}
              scroll={{ y: 240 }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card className="dashboard-card" title={<><ExclamationCircleOutlined /> 报修响应 & 欠费统计</>}>
            <ReactECharts option={gaugeOption} style={{ height: 180 }} />
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <div style={{ marginBottom: 8 }}>
                <span style={{ marginRight: 16, cursor: 'pointer' }} onClick={() => setOverdueModalVisible(true)}>欠费户数: <strong style={{ color: '#f5222d' }}>{summary.overdueCount}</strong></span>
                <span style={{ cursor: 'pointer' }} onClick={() => setOverdueModalVisible(true)}>欠费总额: <strong style={{ color: '#f5222d' }}>¥{summary.totalOverdueAmount.toFixed(0)}</strong></span>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card className="dashboard-card" title={<><HomeOutlined /> 室温达标率趋势</>}>
            <ReactECharts option={trendOption} style={{ height: 280 }} />
          </Card>
        </Col>
      </Row>

      <Modal
        title="欠费用户明细"
        open={overdueModalVisible}
        onCancel={() => setOverdueModalVisible(false)}
        width={800}
        footer={[
          <Button key="billing" type="primary" onClick={() => {
            setOverdueModalVisible(false);
            navigate('/billing', { state: { region, community, stationId: stationFilter } });
          }}>
            前往费用管理
          </Button>,
        ]}
      >
        <Table
          dataSource={overdueRecords}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 5 }}
          columns={[
            { title: '用户', dataIndex: 'userName', key: 'userName' },
            { title: '地址', dataIndex: 'address', key: 'address', ellipsis: true },
            { title: '所属换热站', key: 'stationName', render: (_: unknown, record: BillingRecord) => stationNameMap.get(record.stationId) || '--' },
            { title: '欠缴金额', key: 'oweAmount', render: (_: unknown, record: BillingRecord) => `¥${(record.totalAmount - record.paidAmount).toFixed(2)}` },
            { title: '逾期天数', dataIndex: 'overdueDays', key: 'overdueDays' },
            { title: '状态', dataIndex: 'status', key: 'status', render: (v: string) => <Tag color={v === 'overdue' ? 'red' : v === 'partial' ? 'orange' : 'default'}>{v === 'overdue' ? '欠费' : v === 'partial' ? '部分缴费' : v === 'restricted' ? '已限制' : '已缴费'}</Tag> },
          ]}
        />
      </Modal>
    </div>
  );
};

export default Dashboard;
