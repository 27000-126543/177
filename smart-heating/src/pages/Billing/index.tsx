import React, { useState, useEffect, useMemo } from 'react';
import { Row, Col, Card, Table, Tag, Button, Modal, Descriptions, Select, Input, message, Statistic, Badge, Steps, Tabs } from 'antd';
import {
  DollarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  StopOutlined,
  SearchOutlined,
  BellOutlined,
  PoweroffOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { useLocation } from 'react-router-dom';
import { generateBillingRecords } from '../../mock/data';
import type { BillingRecord } from '../../types';
import { useAuth } from '../../store/authStore';

const REGION_CODE: Record<string, string> = {
  '朝阳区': '朝',
  '海淀区': '海',
  '丰台区': '丰',
  '东城区': '东',
  '西城区': '西',
};

const REGION_CODE_REVERSE: Record<string, string> = {
  '朝': '朝阳区',
  '海': '海淀区',
  '丰': '丰台区',
  '东': '东城区',
  '西': '西城区',
};

const REGION_OPTIONS = [
  { value: '全部', label: '全部区域' },
  { value: '朝阳区', label: '朝阳区' },
  { value: '海淀区', label: '海淀区' },
  { value: '丰台区', label: '丰台区' },
  { value: '东城区', label: '东城区' },
  { value: '西城区', label: '西城区' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'paid', label: '已缴费' },
  { value: 'partial', label: '部分缴费' },
  { value: 'overdue', label: '欠费中' },
  { value: 'restricted', label: '已限制用热' },
];

const STATUS_TAG_COLOR: Record<string, string> = {
  paid: 'green',
  partial: 'orange',
  overdue: 'red',
  restricted: 'purple',
};

const STATUS_TEXT: Record<string, string> = {
  paid: '已缴费',
  partial: '部分缴费',
  overdue: '欠费中',
  restricted: '已限制用热',
};

const VALVE_TAG_COLOR: Record<string, string> = {
  open: 'green',
  closed: 'red',
};

const VALVE_TEXT: Record<string, string> = {
  open: '开启',
  closed: '关闭',
};

interface CollectionLog {
  id: string;
  userName: string;
  address: string;
  overdueAmount: number;
  overdueDays: number;
  method: string;
  sendTime: string;
  status: 'sent' | 'delivered' | 'read';
}

interface ValveLog {
  id: string;
  userName: string;
  address: string;
  operation: 'close' | 'open';
  operator: string;
  time: string;
  reason: string;
}

function Billing() {
  const { currentUser, userRegion, userStationIds } = useAuth();
  const userRole = currentUser?.role || 'user';
  const location = useLocation();
  const [records, setRecords] = useState<BillingRecord[]>([]);
  const [regionFilter, setRegionFilter] = useState('全部');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchName, setSearchName] = useState('');
  const [paymentModal, setPaymentModal] = useState(false);
  const [paymentRecord, setPaymentRecord] = useState<BillingRecord | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('wechat');
  const [collectionLogs, setCollectionLogs] = useState<CollectionLog[]>([]);
  const [valveLogs, setValveLogs] = useState<ValveLog[]>([]);

  const refreshData = () => {
    const mockRecords = generateBillingRecords();
    const newBilling = (window as unknown as Record<string, unknown>).__newBilling as Array<BillingRecord> | undefined;
    if (newBilling && newBilling.length > 0) {
      setRecords([...newBilling, ...mockRecords]);
    } else {
      setRecords(mockRecords);
    }
  };

  useEffect(() => {
    refreshData();
    const navState = location.state as { region?: string; community?: string; stationId?: string } | null;
    if (navState?.region) {
      setRegionFilter(navState.region);
    }
  }, []);

  useEffect(() => {
    if (userRole === 'region_manager' && userRegion) {
      setRegionFilter(userRegion);
    }
    if (userRole === 'station_admin' && userStationIds.length > 0) {
      const allowedRegions = [...new Set(userStationIds.map(sid => {
        const parts = sid.split('-');
        return REGION_CODE_REVERSE[parts[1]] || '';
      }).filter(Boolean))];
      if (allowedRegions.length === 1) {
        setRegionFilter(allowedRegions[0]);
      }
    }
  }, [userRole, userRegion, userStationIds]);

  const allowedRegionOptions = useMemo(() => {
    if (userRole === 'region_manager') {
      return [{ value: userRegion, label: userRegion }];
    }
    if (userRole === 'station_admin' && userStationIds.length > 0) {
      const allowedRegions = [...new Set(userStationIds.map(sid => {
        const parts = sid.split('-');
        return REGION_CODE_REVERSE[parts[1]] || '';
      }).filter(Boolean))];
      return [
        { value: '全部', label: '全部区域' },
        ...allowedRegions.map(r => ({ value: r, label: r })),
      ];
    }
    return REGION_OPTIONS;
  }, [userRole, userRegion, userStationIds]);

  const roleFilteredRecords = records.filter(r => {
    if (userRole === 'company_admin') return true;
    if (userRole === 'region_manager') return r.stationId.includes(REGION_CODE[userRegion] || '');
    if (userRole === 'station_admin') return userStationIds.includes(r.stationId);
    return r.userName === currentUser?.name;
  });

  const filteredRecords = roleFilteredRecords.filter(r => {
    if (regionFilter !== '全部' && !r.stationId.includes(REGION_CODE[regionFilter])) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (searchName && !r.userName.includes(searchName)) return false;
    return true;
  });

  const totalCount = filteredRecords.length;
  const paidCount = filteredRecords.filter(r => r.status === 'paid').length;
  const partialCount = filteredRecords.filter(r => r.status === 'partial').length;
  const overdueCount = filteredRecords.filter(r => r.status === 'overdue').length;
  const restrictedCount = filteredRecords.filter(r => r.status === 'restricted').length;

  const handleCollectionNotice = (record: BillingRecord) => {
    Modal.confirm({
      title: '催缴通知',
      content: `确认向该用户发送催缴通知？欠费已超30天。`,
      okText: '确认发送',
      cancelText: '取消',
      onOk: () => {
        message.success('催缴通知已发送');
        const newLog: CollectionLog = {
          id: `CL-${Date.now()}`,
          userName: record.userName,
          address: record.address,
          overdueAmount: record.totalAmount - record.paidAmount,
          overdueDays: record.overdueDays,
          method: '短信+APP推送',
          sendTime: new Date().toLocaleString(),
          status: 'sent',
        };
        setCollectionLogs(prev => [newLog, ...prev]);
      },
    });
  };

  const handleRestrictHeat = (record: BillingRecord) => {
    Modal.confirm({
      title: '限制用热',
      content: '确认关闭该用户供暖阀门？缴费后可自动恢复。',
      okText: '确认关阀',
      cancelText: '取消',
      onOk: () => {
        message.success('阀门已关闭');
        setRecords(prev => prev.map(r =>
          r.id === record.id ? { ...r, valveStatus: 'closed' as const, status: 'restricted' as const } : r
        ));
        const newLog: ValveLog = {
          id: `VL-${Date.now()}`,
          userName: record.userName,
          address: record.address,
          operation: 'close',
          operator: '系统自动',
          time: new Date().toLocaleString(),
          reason: '欠费超30天自动关阀',
        };
        setValveLogs(prev => [newLog, ...prev]);
      },
    });
  };

  const handleRestoreHeat = (record: BillingRecord) => {
    Modal.confirm({
      title: '恢复用热',
      content: '确认恢复该用户供暖？',
      okText: '确认恢复',
      cancelText: '取消',
      onOk: () => {
        message.success('阀门已开启，供暖已恢复');
        setRecords(prev => prev.map(r => {
          if (r.id !== record.id) return r;
          const newStatus = r.paidAmount >= r.totalAmount ? 'paid' as const : 'overdue' as const;
          return { ...r, valveStatus: 'open' as const, status: newStatus };
        }));
        const newLog: ValveLog = {
          id: `VL-${Date.now()}`,
          userName: record.userName,
          address: record.address,
          operation: 'open',
          operator: '系统自动',
          time: new Date().toLocaleString(),
          reason: '缴费后自动恢复供暖',
        };
        setValveLogs(prev => [newLog, ...prev]);
      },
    });
  };

  const handlePayment = (record: BillingRecord) => {
    setPaymentRecord(record);
    setPaymentAmount(String((record.totalAmount - record.paidAmount).toFixed(2)));
    setPaymentMethod('wechat');
    setPaymentModal(true);
  };

  const handlePaymentConfirm = () => {
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      message.warning('请输入有效的缴费金额');
      return;
    }
    if (!paymentRecord) return;
    const amount = Number(paymentAmount);
    const targetId = paymentRecord.id;
    setRecords(prev => prev.map(r => {
      if (r.id !== targetId) return r;
      const newPaid = Number((r.paidAmount + amount).toFixed(2));
      const fullyPaid = newPaid >= r.totalAmount;
      return {
        ...r,
        paidAmount: newPaid,
        status: fullyPaid ? 'paid' as const : 'partial' as const,
        valveStatus: fullyPaid ? 'open' as const : r.valveStatus,
        overdueDays: fullyPaid ? 0 : r.overdueDays,
      };
    }));
    message.success(`缴费成功，金额：¥${amount.toFixed(2)}`);
    setPaymentModal(false);
    setPaymentRecord(null);
    setPaymentAmount('');
  };

  const billingColumns = [
    { title: '用户', dataIndex: 'userName', key: 'userName', width: 80 },
    { title: '地址', dataIndex: 'address', key: 'address', width: 200, ellipsis: true },
    { title: '面积(m²)', dataIndex: 'area', key: 'area', width: 90, render: (v: number) => v.toFixed(1) },
    { title: '单价(元/m²)', dataIndex: 'unitPrice', key: 'unitPrice', width: 100 },
    { title: '应缴金额', dataIndex: 'totalAmount', key: 'totalAmount', width: 100, render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '已缴金额', dataIndex: 'paidAmount', key: 'paidAmount', width: 100, render: (v: number) => `¥${v.toFixed(2)}` },
    {
      title: '欠缴金额',
      key: 'overdueAmount',
      width: 100,
      render: (_: unknown, r: BillingRecord) => {
        const owe = r.totalAmount - r.paidAmount;
        return <span style={{ color: owe > 0 ? '#f5222d' : undefined }}>¥{owe.toFixed(2)}</span>;
      },
    },
    { title: '逾期天数', dataIndex: 'overdueDays', key: 'overdueDays', width: 90, render: (v: number) => v > 0 ? <span style={{ color: '#f5222d' }}>{v}天</span> : '-' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v: string) => <Tag color={STATUS_TAG_COLOR[v]}>{STATUS_TEXT[v]}</Tag>,
    },
    {
      title: '阀门状态',
      dataIndex: 'valveStatus',
      key: 'valveStatus',
      width: 90,
      render: (v: string) => <Tag color={VALVE_TAG_COLOR[v]}>{VALVE_TEXT[v]}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 260,
      render: (_: unknown, record: BillingRecord) => {
        const buttons: React.ReactNode[] = [];
        if (record.overdueDays > 30 && (record.status === 'overdue' || record.status === 'partial')) {
          buttons.push(
            <Button key="notice" size="small" style={{ background: '#faad14', borderColor: '#faad14', color: '#fff' }} icon={<BellOutlined />} onClick={() => handleCollectionNotice(record)}>
              催缴通知
            </Button>
          );
          if (record.valveStatus === 'open') {
            buttons.push(
              <Button key="restrict" size="small" danger icon={<StopOutlined />} onClick={() => handleRestrictHeat(record)}>
                限制用热
              </Button>
            );
          }
        }
        if (record.status === 'restricted' && record.valveStatus === 'closed') {
          buttons.push(
            <Button key="restore" size="small" type="primary" style={{ background: '#52c41a', borderColor: '#52c41a' }} icon={<PoweroffOutlined />} onClick={() => handleRestoreHeat(record)}>
              恢复用热
            </Button>
          );
        }
        buttons.push(
          <Button key="pay" size="small" type="primary" icon={<DollarOutlined />} onClick={() => handlePayment(record)}>
            缴费
          </Button>
        );
        return <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>{buttons}</div>;
      },
    },
  ];

  const overdueDistribution = () => {
    const ranges = ['0-7', '7-15', '15-30', '30-60', '60-90', '90+'];
    const counts = [0, 0, 0, 0, 0, 0];
    records.forEach(r => {
      if (r.overdueDays <= 7) counts[0]++;
      else if (r.overdueDays <= 15) counts[1]++;
      else if (r.overdueDays <= 30) counts[2]++;
      else if (r.overdueDays <= 60) counts[3]++;
      else if (r.overdueDays <= 90) counts[4]++;
      else counts[5]++;
    });
    return {
      tooltip: { trigger: 'axis' as const },
      grid: { left: 50, right: 20, top: 30, bottom: 30 },
      xAxis: { type: 'category' as const, data: ranges, name: '逾期天数' },
      yAxis: { type: 'value' as const, name: '户数' },
      series: [{
        type: 'bar' as const,
        data: counts,
        itemStyle: {
          color: (params: { dataIndex: number }) => {
            const colors = ['#52c41a', '#73d13d', '#faad14', '#fa8c16', '#ff4d4f', '#cf1322'];
            return colors[params.dataIndex];
          },
        },
        barWidth: '50%',
      }],
    };
  };

  const overdueByRegion = () => {
    const regionNames = ['朝阳区', '海淀区', '丰台区', '东城区', '西城区'];
    const amounts = regionNames.map(region =>
      Number(records.filter(r => r.stationId.includes(REGION_CODE[region]) && r.status !== 'paid').reduce((s, r) => s + (r.totalAmount - r.paidAmount), 0).toFixed(2))
    );
    return {
      tooltip: { trigger: 'axis' as const },
      grid: { left: 80, right: 20, top: 30, bottom: 30 },
      xAxis: { type: 'category' as const, data: regionNames },
      yAxis: { type: 'value' as const, name: '欠费金额(元)' },
      series: [{
        type: 'bar' as const,
        data: amounts,
        itemStyle: { color: '#ff4d4f' },
        barWidth: '40%',
      }],
    };
  };

  const collectionRateTrend = () => {
    const months = ['1月', '2月', '3月', '4月', '5月', '6月'];
    const rates = [82.5, 85.3, 88.1, 86.7, 90.2, 91.5];
    return {
      tooltip: { trigger: 'axis' as const, formatter: '{b}: {c}%' },
      grid: { left: 50, right: 20, top: 30, bottom: 30 },
      xAxis: { type: 'category' as const, data: months },
      yAxis: { type: 'value' as const, name: '回收率(%)', min: 70, max: 100 },
      series: [{
        type: 'line' as const,
        data: rates,
        smooth: true,
        lineStyle: { color: '#1890ff', width: 2 },
        itemStyle: { color: '#1890ff' },
        areaStyle: { color: 'rgba(24,144,255,0.15)' },
        markLine: { data: [{ yAxis: 90, name: '目标线', lineStyle: { color: '#f5222d', type: 'dashed' as const } }] },
      }],
    };
  };

  const collectionLogColumns = [
    { title: '用户', dataIndex: 'userName', key: 'userName', width: 80 },
    { title: '地址', dataIndex: 'address', key: 'address', width: 180, ellipsis: true },
    { title: '欠费金额', dataIndex: 'overdueAmount', key: 'overdueAmount', width: 100, render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '逾期天数', dataIndex: 'overdueDays', key: 'overdueDays', width: 90, render: (v: number) => `${v}天` },
    { title: '通知方式', dataIndex: 'method', key: 'method', width: 120 },
    { title: '发送时间', dataIndex: 'sendTime', key: 'sendTime', width: 160 },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (v: string) => {
        const map: Record<string, { color: string; text: string }> = {
          sent: { color: 'blue', text: '已发送' },
          delivered: { color: 'green', text: '已送达' },
          read: { color: 'cyan', text: '已读' },
        };
        const s = map[v] || { color: 'default', text: v };
        return <Tag color={s.color}>{s.text}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: () => <Button size="small" type="link">重发</Button>,
    },
  ];

  const valveLogColumns = [
    { title: '用户', dataIndex: 'userName', key: 'userName', width: 80 },
    { title: '地址', dataIndex: 'address', key: 'address', width: 180, ellipsis: true },
    {
      title: '操作类型',
      dataIndex: 'operation',
      key: 'operation',
      width: 100,
      render: (v: string) => <Tag color={v === 'close' ? 'red' : 'green'}>{v === 'close' ? '关阀' : '开阀'}</Tag>,
    },
    { title: '操作人', dataIndex: 'operator', key: 'operator', width: 100 },
    { title: '操作时间', dataIndex: 'time', key: 'time', width: 160 },
    { title: '原因', dataIndex: 'reason', key: 'reason', ellipsis: true },
  ];

  const revenueTrendOption = () => {
    const months = ['1月', '2月', '3月', '4月', '5月', '6月'];
    const revenue = [1850000, 1920000, 1780000, 1650000, 1580000, 1720000];
    const cost = [1200000, 1250000, 1180000, 1100000, 1050000, 1120000];
    const profit = revenue.map((r, i) => r - cost[i]);
    return {
      tooltip: { trigger: 'axis' as const },
      legend: { data: ['营收', '成本', '利润'] },
      grid: { left: 80, right: 20, top: 40, bottom: 30 },
      xAxis: { type: 'category' as const, data: months },
      yAxis: { type: 'value' as const, name: '金额(元)' },
      series: [
        {
          name: '营收',
          type: 'bar' as const,
          data: revenue,
          itemStyle: { color: '#1890ff' },
        },
        {
          name: '成本',
          type: 'bar' as const,
          data: cost,
          itemStyle: { color: '#faad14' },
        },
        {
          name: '利润',
          type: 'line' as const,
          data: profit,
          smooth: true,
          lineStyle: { color: '#52c41a', width: 2 },
          itemStyle: { color: '#52c41a' },
          areaStyle: { color: 'rgba(82,196,26,0.1)' },
        },
      ],
    };
  };

  const tabItems = [
    {
      key: 'list',
      label: '费用列表',
      children: (
        <Table
          dataSource={filteredRecords}
          columns={billingColumns}
          rowKey="id"
          size="small"
          scroll={{ x: 1400 }}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: t => `共 ${t} 条` }}
        />
      ),
    },
    {
      key: 'analysis',
      label: '欠费分析',
      children: (
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Card title="逾期天数分布" size="small">
              <ReactECharts option={overdueDistribution()} style={{ height: 280 }} />
            </Card>
          </Col>
          <Col span={8}>
            <Card title="各区欠费金额" size="small">
              <ReactECharts option={overdueByRegion()} style={{ height: 280 }} />
            </Card>
          </Col>
          <Col span={8}>
            <Card title="回收率趋势(近6个月)" size="small">
              <ReactECharts option={collectionRateTrend()} style={{ height: 280 }} />
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'collection',
      label: '催缴记录',
      children: (
        <>
          <Card title="催缴通知记录" size="small" style={{ marginBottom: 16 }}>
            <Table
              dataSource={collectionLogs}
              columns={collectionLogColumns}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 5 }}
            />
          </Card>
          <Card title="阀门操作记录" size="small">
            <Table
              dataSource={valveLogs}
              columns={valveLogColumns}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 5 }}
            />
          </Card>
        </>
      ),
    },
  ];

  return (
    <div style={{ padding: 16 }}>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col>
          <Select
            value={regionFilter}
            onChange={setRegionFilter}
            options={allowedRegionOptions}
            style={{ width: 140 }}
            disabled={userRole === 'region_manager' || (userRole === 'station_admin' && allowedRegionOptions.length <= 2)}
          />
        </Col>
        <Col>
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_OPTIONS}
            style={{ width: 140 }}
          />
        </Col>
        <Col>
          <Input
            placeholder="搜索用户姓名"
            prefix={<SearchOutlined />}
            value={searchName}
            onChange={e => setSearchName(e.target.value)}
            style={{ width: 180 }}
            allowClear
          />
        </Col>
        <Col>
          <Button icon={<ReloadOutlined />} onClick={refreshData}>刷新</Button>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={5}>
          <Card size="small">
            <Statistic title="总户数" value={totalCount} prefix={<DollarOutlined />} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small">
            <Statistic title="已缴费" value={paidCount} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small">
            <Statistic title="部分缴费" value={partialCount} prefix={<ClockCircleOutlined />} valueStyle={{ color: '#faad14' }} />
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small">
            <Statistic title="欠费中" value={overdueCount} prefix={<ExclamationCircleOutlined />} valueStyle={{ color: '#f5222d' }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="已限制用热" value={restrictedCount} prefix={<StopOutlined />} valueStyle={{ color: '#722ed1' }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={18}>
          <Card size="small">
            <Tabs items={tabItems} />
          </Card>
        </Col>
        <Col span={6}>
          <Card title="自动催缴规则" size="small" style={{ marginBottom: 16 }}>
            <Steps
              direction="vertical"
              size="small"
              current={-1}
              items={[
                { title: '欠费超30天', description: '自动发送催缴通知' },
                { title: '7天未缴费', description: '自动关阀限制用热' },
                { title: '缴费后', description: '自动恢复供暖' },
              ]}
            />
          </Card>
          <Card title="本月统计" size="small">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="催缴通知数">
                <Badge count={collectionLogs.length} showZero color="blue" style={{ backgroundColor: '#1890ff' }} />
              </Descriptions.Item>
              <Descriptions.Item label="关阀数">
                <Badge count={valveLogs.filter(v => v.operation === 'close').length} showZero color="red" style={{ backgroundColor: '#f5222d' }} />
              </Descriptions.Item>
              <Descriptions.Item label="恢复数">
                <Badge count={valveLogs.filter(v => v.operation === 'open').length} showZero color="green" style={{ backgroundColor: '#52c41a' }} />
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      <Row style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="营收趋势(近6个月)" size="small">
            <ReactECharts option={revenueTrendOption()} style={{ height: 300 }} />
          </Card>
        </Col>
      </Row>

      <Modal
        title="缴费"
        open={paymentModal}
        onOk={handlePaymentConfirm}
        onCancel={() => {
          setPaymentModal(false);
          setPaymentRecord(null);
          setPaymentAmount('');
        }}
        okText="确认缴费"
        cancelText="取消"
      >
        {paymentRecord && (
          <div>
            <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="用户">{paymentRecord.userName}</Descriptions.Item>
              <Descriptions.Item label="地址">{paymentRecord.address}</Descriptions.Item>
              <Descriptions.Item label="应缴金额">¥{paymentRecord.totalAmount.toFixed(2)}</Descriptions.Item>
              <Descriptions.Item label="已缴金额">¥{paymentRecord.paidAmount.toFixed(2)}</Descriptions.Item>
              <Descriptions.Item label="欠缴金额">
                <span style={{ color: '#f5222d' }}>¥{(paymentRecord.totalAmount - paymentRecord.paidAmount).toFixed(2)}</span>
              </Descriptions.Item>
            </Descriptions>
            <div style={{ marginBottom: 12 }}>
              <span>缴费金额：</span>
              <Input
                prefix="¥"
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                style={{ width: 200 }}
                type="number"
              />
            </div>
            <div>
              <span>支付方式：</span>
              <Select
                value={paymentMethod}
                onChange={setPaymentMethod}
                style={{ width: 200 }}
                options={[
                  { value: 'wechat', label: '微信支付' },
                  { value: 'alipay', label: '支付宝' },
                  { value: 'bank', label: '银行转账' },
                  { value: 'cash', label: '现金' },
                ]}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default Billing;
