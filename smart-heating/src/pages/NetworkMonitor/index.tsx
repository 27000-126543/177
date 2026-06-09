import { useState, useEffect, useMemo } from 'react';
import { Row, Col, Card, Table, Tag, Tabs, Badge, Statistic, Select, Button, Alert, Timeline, Space } from 'antd';
import {
  ReloadOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  EnvironmentOutlined,
  DashboardOutlined,
  AlertOutlined,
  ThunderboltOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { generateNetworkNodes, generateAlerts } from '../../mock/data';
import type { NetworkNode, AlertRecord } from '../../types';
import { useAuth } from '../../store/authStore';

const REGIONS = ['朝阳区', '海淀区', '丰台区', '东城区', '西城区'];
const NETWORK_TYPES = [
  { label: '全部', value: 'all' },
  { label: '一次网', value: 'primary' },
  { label: '二次网', value: 'secondary' },
];

const statusColorMap: Record<string, string> = {
  normal: 'green',
  warning: 'orange',
  fault: 'red',
};

const levelColorMap: Record<string, string> = {
  info: 'blue',
  warning: 'orange',
  error: 'red',
  critical: 'purple',
};

const alertTypeLabelMap: Record<string, string> = {
  pressure: '压力异常',
  temperature: '温度异常',
  flow: '流量异常',
  fault: '设备故障',
  leak: '管网泄漏',
};

const statusLabelMap: Record<string, string> = {
  normal: '正常',
  warning: '预警',
  fault: '故障',
};

const alertStatusLabelMap: Record<string, string> = {
  pending: '待处理',
  processing: '处理中',
  resolved: '已解决',
};

function generateTrendData(base: number, range: number, count: number) {
  return Array.from({ length: count }, () =>
    Number((base + (Math.random() - 0.5) * range).toFixed(1))
  );
}

function generateTimeLabels(count: number) {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const t = new Date(now.getTime() - (count - 1 - i) * 5 * 60 * 1000);
    return `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
  });
}

const REGION_CODE: Record<string, string> = {
  '朝阳区': '朝',
  '海淀区': '海',
  '丰台区': '丰',
  '东城区': '东',
  '西城区': '西',
};

export default function NetworkMonitor() {
  const { currentUser, userRegion, userStationIds } = useAuth();
  const userRole = currentUser?.role || 'user';
  const [region, setRegion] = useState<string | undefined>(undefined);
  const [networkType, setNetworkType] = useState<string>('all');
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [alertLevelFilter, setAlertLevelFilter] = useState<string | undefined>(undefined);
  const [alertStatusFilter, setAlertStatusFilter] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (userRole === 'region_manager' && userRegion) {
      setRegion(userRegion);
    }
  }, [userRole, userRegion]);

  const stationRegionCodes = useMemo(() => {
    if (userRole !== 'station_admin') return new Set<string>();
    const codes = new Set<string>();
    userStationIds.forEach(sid => {
      const match = sid.match(/^ST-(.+)-\d+$/);
      if (match) codes.add(match[1]);
    });
    return codes;
  }, [userRole, userStationIds]);

  const allowedRegionCodes = useMemo(() => {
    if (userRole === 'company_admin') return null;
    if (userRole === 'region_manager') {
      const code = REGION_CODE[userRegion];
      return code ? new Set([code]) : null;
    }
    if (userRole === 'station_admin') return stationRegionCodes;
    return new Set<string>();
  }, [userRole, userRegion, stationRegionCodes]);

  const regionOptions = useMemo(() => {
    const all = REGIONS.map(r => ({ label: r, value: r }));
    if (userRole === 'region_manager') {
      return all.filter(r => r.value === userRegion);
    }
    return all;
  }, [userRole, userRegion]);

  const refreshData = () => {
    setNodes(generateNetworkNodes());
    setAlerts(generateAlerts());
  };

  useEffect(() => {
    refreshData();
    const timer = setInterval(refreshData, 5000);
    return () => clearInterval(timer);
  }, []);

  const filteredNodes = nodes.filter((n) => {
    if (allowedRegionCodes) {
      const match = n.id.match(/^[PS]N-(.+)-\d+$/);
      if (match && !allowedRegionCodes.has(match[1])) return false;
    }
    if (region && !n.name.includes(region)) return false;
    if (networkType !== 'all' && n.type !== networkType) return false;
    return true;
  });

  const roleFilteredAlerts = useMemo(() => {
    if (!allowedRegionCodes) return alerts;
    return alerts.filter(a => {
      const match = a.sourceId.match(/^ST-(.+)-\d+$/);
      if (match && !allowedRegionCodes.has(match[1])) return false;
      return true;
    });
  }, [alerts, allowedRegionCodes]);

  const filteredAlerts = roleFilteredAlerts.filter((a) => {
    if (alertLevelFilter && a.level !== alertLevelFilter) return false;
    if (alertStatusFilter && a.status !== alertStatusFilter) return false;
    return true;
  });

  const primaryNodes = filteredNodes.filter((n) => n.type === 'primary');
  const secondaryNodes = filteredNodes.filter((n) => n.type === 'secondary');

  const totalNodes = filteredNodes.length;
  const normalNodes = filteredNodes.filter((n) => n.status === 'normal').length;
  const warningNodes = filteredNodes.filter((n) => n.status === 'warning').length;
  const faultNodes = filteredNodes.filter((n) => n.status === 'fault').length;

  const alertTypeStats = {
    pressure: roleFilteredAlerts.filter((a) => a.type === 'pressure').length,
    temperature: roleFilteredAlerts.filter((a) => a.type === 'temperature').length,
    flow: roleFilteredAlerts.filter((a) => a.type === 'flow').length,
    fault: roleFilteredAlerts.filter((a) => a.type === 'fault').length,
    leak: roleFilteredAlerts.filter((a) => a.type === 'leak').length,
  };

  const getTopologyOption = (): Record<string, unknown> => {
    const isPrimary = networkType === 'primary' || networkType === 'all';
    const isSecondary = networkType === 'secondary' || networkType === 'all';

    const categories = [
      { name: '热源' },
      { name: '一次网' },
      { name: '换热站' },
      { name: '二次网' },
      { name: '用户' },
    ];

    const data: Record<string, unknown>[] = [];
    const links: Record<string, unknown>[] = [];

    data.push({
      name: '热源厂',
      x: 100,
      y: 300,
      symbolSize: 50,
      category: 0,
      itemStyle: { color: '#1890ff' },
      label: { show: true, formatter: '热源厂', fontSize: 10 },
    });

    if (isPrimary) {
      primaryNodes.forEach((node, idx) => {
        const statusColor = statusColorMap[node.status] || '#999';
        data.push({
          name: node.name,
          x: 200 + idx * 120,
          y: 150 + (idx % 2) * 300,
          symbolSize: 35,
          category: 1,
          itemStyle: { color: statusColor },
          label: { show: true, formatter: `{b}\n供${node.supplyTemp}°C / 回${node.returnTemp}°C`, fontSize: 8 },
        });
        links.push({ source: '热源厂', target: node.name });
      });
    }

    if (isPrimary && isSecondary) {
      data.push({
        name: '换热站组',
        x: 800,
        y: 300,
        symbolSize: 45,
        category: 2,
        itemStyle: { color: '#722ed1' },
        label: { show: true, formatter: '换热站', fontSize: 10 },
      });
      primaryNodes.forEach((node) => {
        links.push({ source: node.name, target: '换热站组' });
      });
    }

    if (isSecondary) {
      secondaryNodes.forEach((node, idx) => {
        const statusColor = statusColorMap[node.status] || '#999';
        data.push({
          name: node.name,
          x: 900 + idx * 100,
          y: 100 + (idx % 3) * 200,
          symbolSize: 30,
          category: 3,
          itemStyle: { color: statusColor },
          label: { show: true, formatter: `{b}\n供${node.supplyTemp}°C / 回${node.returnTemp}°C`, fontSize: 8 },
        });
        if (isPrimary) {
          links.push({ source: '换热站组', target: node.name });
        }
      });
    }

    if (isSecondary) {
      data.push({
        name: '用户端',
        x: 1400,
        y: 300,
        symbolSize: 40,
        category: 4,
        itemStyle: { color: '#13c2c2' },
        label: { show: true, formatter: '用户端', fontSize: 10 },
      });
      secondaryNodes.forEach((node) => {
        links.push({ source: node.name, target: '用户端' });
      });
    }

    return {
      title: { text: '管网拓扑图', left: 'center', top: 10, textStyle: { fontSize: 14 } },
      tooltip: {
        formatter: (params: Record<string, unknown>) => {
          const d = params.data as Record<string, unknown>;
          if (d.label && typeof d.label === 'object') return d.name as string;
          return d.name as string;
        },
      },
      legend: { data: categories.map((c) => c.name), bottom: 10 },
      series: [
        {
          type: 'graph',
          layout: 'none',
          symbolSize: 40,
          roam: true,
          label: { show: true, fontSize: 9 },
          edgeSymbol: ['none', 'arrow'],
          edgeSymbolSize: [4, 10],
          edgeLabel: { fontSize: 9 },
          categories,
          data,
          links,
          lineStyle: { opacity: 0.9, width: 2, curveness: 0 },
        },
      ],
    };
  };

  const selectedNode = filteredNodes.find((n) => n.id === selectedNodeId) || filteredNodes[0];

  const getTrendChartOption = (node: NetworkNode | undefined): Record<string, unknown> => {
    if (!node) return {};
    const timeLabels = generateTimeLabels(30);
    return {
      title: { text: `${node.name} - 实时趋势`, left: 'center', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'axis' },
      legend: { data: ['供水温度', '回水温度', '压力', '流量'], bottom: 0 },
      grid: { left: 50, right: 50, top: 50, bottom: 40 },
      xAxis: { type: 'category', data: timeLabels },
      yAxis: [
        { type: 'value', name: '温度(°C)', position: 'left' },
        { type: 'value', name: '压力(MPa)/流量(t/h)', position: 'right' },
      ],
      series: [
        {
          name: '供水温度',
          type: 'line',
          data: generateTrendData(node.supplyTemp, 10, 30),
          smooth: true,
          yAxisIndex: 0,
        },
        {
          name: '回水温度',
          type: 'line',
          data: generateTrendData(node.returnTemp, 8, 30),
          smooth: true,
          yAxisIndex: 0,
        },
        {
          name: '压力',
          type: 'line',
          data: generateTrendData(node.pressure, 0.3, 30),
          smooth: true,
          yAxisIndex: 1,
        },
        {
          name: '流量',
          type: 'line',
          data: generateTrendData(node.flow, 50, 30),
          smooth: true,
          yAxisIndex: 1,
        },
      ],
    };
  };

  const networkTableColumns = [
    { title: '节点名称', dataIndex: 'name', key: 'name', width: 160 },
    { title: '供水温度(°C)', dataIndex: 'supplyTemp', key: 'supplyTemp', width: 120, sorter: (a: NetworkNode, b: NetworkNode) => a.supplyTemp - b.supplyTemp },
    { title: '回水温度(°C)', dataIndex: 'returnTemp', key: 'returnTemp', width: 120, sorter: (a: NetworkNode, b: NetworkNode) => a.returnTemp - b.returnTemp },
    { title: '压力(MPa)', dataIndex: 'pressure', key: 'pressure', width: 110, sorter: (a: NetworkNode, b: NetworkNode) => a.pressure - b.pressure },
    { title: '流量(t/h)', dataIndex: 'flow', key: 'flow', width: 100, sorter: (a: NetworkNode, b: NetworkNode) => a.flow - b.flow },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string) => <Tag color={statusColorMap[status]}>{statusLabelMap[status] || status}</Tag>,
    },
  ];

  const alertTableColumns = [
    { title: '时间', dataIndex: 'time', key: 'time', width: 160 },
    { title: '类型', dataIndex: 'type', key: 'type', width: 100, render: (t: string) => alertTypeLabelMap[t] || t },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      render: (level: string) => <Tag color={levelColorMap[level]}>{level.toUpperCase()}</Tag>,
    },
    { title: '来源', dataIndex: 'source', key: 'source', width: 140 },
    { title: '告警内容', dataIndex: 'message', key: 'message', width: 220 },
    {
      title: '调节建议',
      dataIndex: 'suggestion',
      key: 'suggestion',
      width: 200,
      render: (suggestion: string) => (
        <span style={{ color: '#1890ff', cursor: 'pointer' }} title={suggestion}>
          {suggestion.length > 12 ? suggestion.substring(0, 12) + '...' : suggestion}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: string) => <Tag color={status === 'resolved' ? 'green' : status === 'processing' ? 'blue' : 'red'}>{alertStatusLabelMap[status] || status}</Tag>,
    },
  ];

  const getBottomPressureOption = (): Record<string, unknown> => {
    const timeLabels = generateTimeLabels(24);
    return {
      title: { text: '管网压力趋势（近2小时）', left: 'center', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'axis' },
      legend: { data: ['一次网平均压力', '二次网平均压力'], bottom: 0 },
      grid: { left: 50, right: 30, top: 50, bottom: 40 },
      xAxis: { type: 'category', data: timeLabels },
      yAxis: { type: 'value', name: 'MPa' },
      series: [
        {
          name: '一次网平均压力',
          type: 'line',
          data: generateTrendData(0.9, 0.4, 24),
          smooth: true,
          areaStyle: { opacity: 0.15 },
        },
        {
          name: '二次网平均压力',
          type: 'line',
          data: generateTrendData(0.4, 0.2, 24),
          smooth: true,
          areaStyle: { opacity: 0.15 },
        },
      ],
    };
  };

  const getBottomTempOption = (): Record<string, unknown> => {
    const timeLabels = generateTimeLabels(24);
    return {
      title: { text: '管网温度趋势（近2小时）', left: 'center', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'axis' },
      legend: { data: ['一次网供水温度', '一次网回水温度', '二次网供水温度', '二次网回水温度'], bottom: 0 },
      grid: { left: 50, right: 30, top: 50, bottom: 40 },
      xAxis: { type: 'category', data: timeLabels },
      yAxis: { type: 'value', name: '°C' },
      series: [
        { name: '一次网供水温度', type: 'line', data: generateTrendData(95, 10, 24), smooth: true },
        { name: '一次网回水温度', type: 'line', data: generateTrendData(50, 8, 24), smooth: true },
        { name: '二次网供水温度', type: 'line', data: generateTrendData(55, 8, 24), smooth: true },
        { name: '二次网回水温度', type: 'line', data: generateTrendData(40, 5, 24), smooth: true },
      ],
    };
  };

  const recentAlerts = roleFilteredAlerts.slice(0, 8);

  const tabItems = [
    {
      key: 'overview',
      label: (
        <span>
          <DashboardOutlined /> 管网概览
        </span>
      ),
      children: (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Card>
                <Statistic title="总节点数" value={totalNodes} prefix={<EnvironmentOutlined />} />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic title="正常节点" value={normalNodes} valueStyle={{ color: '#52c41a' }} prefix={<CheckCircleOutlined />} />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic title="预警节点" value={warningNodes} valueStyle={{ color: '#faad14' }} prefix={<ExclamationCircleOutlined />} />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic title="故障节点" value={faultNodes} valueStyle={{ color: '#ff4d4f' }} prefix={<CloseCircleOutlined />} />
              </Card>
            </Col>
          </Row>
          <Card>
            <ReactECharts option={getTopologyOption()} style={{ height: 460 }} />
          </Card>
        </>
      ),
    },
    {
      key: 'primary',
      label: (
        <span>
          <ThunderboltOutlined /> 一次网监控
        </span>
      ),
      children: (
        <>
          <Card style={{ marginBottom: 16 }}>
            <Table
              rowKey="id"
              columns={networkTableColumns}
              dataSource={primaryNodes}
              pagination={{ pageSize: 8 }}
              size="small"
              onRow={(record) => ({
                onClick: () => setSelectedNodeId(record.id),
                style: { cursor: 'pointer', background: record.id === selectedNodeId ? '#e6f7ff' : undefined },
              })}
            />
          </Card>
          <Card>
            <ReactECharts option={getTrendChartOption(selectedNode?.type === 'primary' ? selectedNode : primaryNodes[0])} style={{ height: 320 }} />
          </Card>
        </>
      ),
    },
    {
      key: 'secondary',
      label: (
        <span>
          <ArrowDownOutlined /> 二次网监控
        </span>
      ),
      children: (
        <>
          <Card style={{ marginBottom: 16 }}>
            <Table
              rowKey="id"
              columns={networkTableColumns}
              dataSource={secondaryNodes}
              pagination={{ pageSize: 8 }}
              size="small"
              onRow={(record) => ({
                onClick: () => setSelectedNodeId(record.id),
                style: { cursor: 'pointer', background: record.id === selectedNodeId ? '#e6f7ff' : undefined },
              })}
            />
          </Card>
          <Card>
            <ReactECharts option={getTrendChartOption(selectedNode?.type === 'secondary' ? selectedNode : secondaryNodes[0])} style={{ height: 320 }} />
          </Card>
        </>
      ),
    },
    {
      key: 'alerts',
      label: (
        <span>
          <AlertOutlined /> 告警中心
          <Badge count={roleFilteredAlerts.filter((a) => a.status === 'pending').length} size="small" style={{ marginLeft: 6 }} />
        </span>
      ),
      children: (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={5}>
              <Card size="small">
                <Statistic title="压力异常" value={alertTypeStats.pressure} valueStyle={{ color: '#1890ff' }} prefix={<DashboardOutlined />} />
              </Card>
            </Col>
            <Col span={5}>
              <Card size="small">
                <Statistic title="温度异常" value={alertTypeStats.temperature} valueStyle={{ color: '#faad14' }} prefix={<WarningOutlined />} />
              </Card>
            </Col>
            <Col span={5}>
              <Card size="small">
                <Statistic title="流量异常" value={alertTypeStats.flow} valueStyle={{ color: '#13c2c2' }} prefix={<ThunderboltOutlined />} />
              </Card>
            </Col>
            <Col span={5}>
              <Card size="small">
                <Statistic title="设备故障" value={alertTypeStats.fault} valueStyle={{ color: '#ff4d4f' }} prefix={<CloseCircleOutlined />} />
              </Card>
            </Col>
            <Col span={4}>
              <Card size="small">
                <Statistic title="管网泄漏" value={alertTypeStats.leak} valueStyle={{ color: '#722ed1' }} prefix={<ExclamationCircleOutlined />} />
              </Card>
            </Col>
          </Row>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={4}>
              <Select
                placeholder="告警级别"
                allowClear
                style={{ width: '100%' }}
                value={alertLevelFilter}
                onChange={setAlertLevelFilter}
                options={[
                  { label: 'INFO', value: 'info' },
                  { label: 'WARNING', value: 'warning' },
                  { label: 'ERROR', value: 'error' },
                  { label: 'CRITICAL', value: 'critical' },
                ]}
              />
            </Col>
            <Col span={4}>
              <Select
                placeholder="告警状态"
                allowClear
                style={{ width: '100%' }}
                value={alertStatusFilter}
                onChange={setAlertStatusFilter}
                options={[
                  { label: '待处理', value: 'pending' },
                  { label: '处理中', value: 'processing' },
                  { label: '已解决', value: 'resolved' },
                ]}
              />
            </Col>
          </Row>
          <Card>
            <Table
              rowKey="id"
              columns={alertTableColumns}
              dataSource={filteredAlerts}
              pagination={{ pageSize: 8 }}
              size="small"
              expandable={{
                expandedRowRender: (record: AlertRecord) => (
                  <div style={{ padding: '8px 0' }}>
                    <Alert type="info" message="调节建议" description={record.suggestion} showIcon />
                  </div>
                ),
              }}
            />
          </Card>
        </>
      ),
    },
  ];

  return (
    <div style={{ padding: 16 }}>
      <Row gutter={16} style={{ marginBottom: 16 }} align="middle">
        <Col>
          <Select
            placeholder="选择区域"
            allowClear
            style={{ width: 150 }}
            value={region}
            onChange={setRegion}
            options={regionOptions}
            disabled={userRole === 'region_manager'}
          />
        </Col>
        <Col>
          <Select
            style={{ width: 150 }}
            value={networkType}
            onChange={setNetworkType}
            options={NETWORK_TYPES}
          />
        </Col>
        <Col>
          <Button icon={<ReloadOutlined />} onClick={refreshData}>
            刷新数据
          </Button>
        </Col>
        <Col flex="auto" />
        <Col>
          <Space>
            <Tag color="green">正常 {normalNodes}</Tag>
            <Tag color="orange">预警 {warningNodes}</Tag>
            <Tag color="red">故障 {faultNodes}</Tag>
          </Space>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col flex="1 1 0">
          <Card>
            <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
          </Card>
        </Col>
        <Col flex="320px">
          <Card title="实时调节建议" style={{ maxHeight: 700, overflow: 'auto' }}>
            <Timeline
              items={recentAlerts.map((alert) => ({
                color: levelColorMap[alert.level] === 'purple' ? 'red' : levelColorMap[alert.level],
                children: (
                  <div>
                    <div style={{ fontSize: 12, color: '#999' }}>{alert.time}</div>
                    <div style={{ fontWeight: 500 }}>{alert.source}</div>
                    <div>{alert.message}</div>
                    <div style={{ color: '#1890ff', fontSize: 12, marginTop: 4 }}>
                      💡 {alert.suggestion}
                    </div>
                  </div>
                ),
              }))}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card>
            <ReactECharts option={getBottomPressureOption()} style={{ height: 280 }} />
          </Card>
        </Col>
        <Col span={12}>
          <Card>
            <ReactECharts option={getBottomTempOption()} style={{ height: 280 }} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
