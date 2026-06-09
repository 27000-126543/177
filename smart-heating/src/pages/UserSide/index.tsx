import { useState, useEffect, useMemo } from 'react';
import {
  Row,
  Col,
  Card,
  Table,
  Tag,
  Button,
  Modal,
  Descriptions,
  Select,
  Input,
  Rate,
  Form,
  message,
  Statistic,
  Progress,
  Tabs,
} from 'antd';
import {
  TeamOutlined,
  CheckCircleOutlined,
  ArrowDownOutlined,
  WarningOutlined,
  SearchOutlined,
  ReloadOutlined,
  MedicineBoxOutlined,
  BellOutlined,
  PlusOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { generateRoomTempData, generateRepairRequests } from '../../mock/data';
import type { RoomTempData, RepairRequest } from '../../types';
import { useAuth } from '../../store/authStore';

const REGIONS = ['全部', '朝阳区', '海淀区', '丰台区', '东城区', '西城区'];

const REGION_CODE_REVERSE: Record<string, string> = {
  '朝': '朝阳区',
  '海': '海淀区',
  '丰': '丰台区',
  '东': '东城区',
  '西': '西城区',
};

const STATUS_OPTIONS = [
  { value: '全部', label: '全部状态' },
  { value: 'normal', label: '正常' },
  { value: 'low', label: '温度偏低' },
  { value: 'high', label: '温度偏高' },
  { value: 'offline', label: '离线' },
];

const STATUS_TAG_MAP: Record<string, { color: string; text: string }> = {
  normal: { color: 'green', text: '正常' },
  low: { color: 'blue', text: '偏低' },
  high: { color: 'orange', text: '偏高' },
  offline: { color: 'default', text: '离线' },
};

const REPAIR_STATUS_TAG_MAP: Record<string, { color: string; text: string }> = {
  pending: { color: 'default', text: '待分配' },
  assigned: { color: 'processing', text: '已分配' },
  in_progress: { color: 'orange', text: '处理中' },
  completed: { color: 'green', text: '已完成' },
};

const VIOLATION_MAP: Record<string, string> = {
  water_drain: '疑似放水',
  heat_theft: '疑似窃热',
  valve_tampering: '疑似违规调节阀门',
};

const TEAM_STATION_MAP: Record<string, string[]> = {
  '朝阳维修一组': ['ST-朝'],
  '海淀维修一组': ['ST-海'],
  '丰台维修一组': ['ST-丰'],
  '东城维修组': ['ST-东'],
  '西城维修组': ['ST-西'],
};

function generateTrendData(currentTemp: number) {
  const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
  const data = hours.map((_, i) => {
    const variation = (Math.random() - 0.5) * 4;
    const timeEffect = i < 6 ? -1.5 : i < 10 ? 0.5 : i < 18 ? 1 : -0.5;
    return Number((currentTemp + variation + timeEffect).toFixed(1));
  });
  return { hours, data };
}

function findAssignee(stationId: string): string {
  for (const [team, prefixes] of Object.entries(TEAM_STATION_MAP)) {
    if (prefixes.some(prefix => stationId.startsWith(prefix))) {
      return team;
    }
  }
  return '朝阳维修一组';
}

function UserSide() {
  const { currentUser, userRegion, userStationIds } = useAuth();
  const userRole = currentUser?.role || 'user';
  const [roomData, setRoomData] = useState<RoomTempData[]>([]);
  const [repairData, setRepairData] = useState<RepairRequest[]>([]);
  const [selectedRegion, setSelectedRegion] = useState('全部');
  const [selectedStatus, setSelectedStatus] = useState('全部');
  const [searchText, setSearchText] = useState('');
  const [diagnosisModalVisible, setDiagnosisModalVisible] = useState(false);
  const [selectedRoomRecord, setSelectedRoomRecord] = useState<RoomTempData | null>(null);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState<RepairRequest | null>(null);
  const [newRepairModalVisible, setNewRepairModalVisible] = useState(false);
  const [selectedTrendUser, setSelectedTrendUser] = useState<RoomTempData | null>(null);
  const [trendInfo, setTrendInfo] = useState<{ hours: string[]; data: number[] }>({ hours: [], data: [] });
  const [form] = Form.useForm();
  const [ratingForm] = Form.useForm();
  const [submitRatingModalVisible, setSubmitRatingModalVisible] = useState(false);
  const [ratingRepair, setRatingRepair] = useState<RepairRequest | null>(null);

  const refreshData = () => {
    const mockRoomData = generateRoomTempData();
    const newRoomData = (window as unknown as Record<string, unknown>).__newRoomData as Array<RoomTempData> | undefined;
    if (newRoomData && newRoomData.length > 0) {
      setRoomData([...newRoomData, ...mockRoomData]);
    } else {
      setRoomData(mockRoomData);
    }
  };

  useEffect(() => {
    const mockRoomData = generateRoomTempData();
    const newRoomData = (window as unknown as Record<string, unknown>).__newRoomData as Array<RoomTempData> | undefined;
    if (newRoomData && newRoomData.length > 0) {
      setRoomData([...newRoomData, ...mockRoomData]);
    } else {
      setRoomData(mockRoomData);
    }
    setRepairData(generateRepairRequests());
  }, []);

  useEffect(() => {
    if (userRole === 'region_manager' && userRegion) {
      setSelectedRegion(userRegion);
    }
    if (userRole === 'station_admin' && userStationIds.length > 0) {
      const allowedRegions = [...new Set(userStationIds.map(sid => {
        const parts = sid.split('-');
        return REGION_CODE_REVERSE[parts[1]] || '';
      }).filter(Boolean))];
      if (allowedRegions.length === 1) {
        setSelectedRegion(allowedRegions[0]);
      }
    }
  }, [userRole, userRegion, userStationIds]);

  const regionOptions = useMemo(() => {
    if (userRole === 'region_manager') {
      return [{ value: userRegion, label: userRegion }];
    }
    if (userRole === 'station_admin' && userStationIds.length > 0) {
      const allowedRegions = [...new Set(userStationIds.map(sid => {
        const parts = sid.split('-');
        return REGION_CODE_REVERSE[parts[1]] || '';
      }).filter(Boolean))];
      return [
        { value: '全部', label: '全部' },
        ...allowedRegions.map(r => ({ value: r, label: r })),
      ];
    }
    return REGIONS.map(r => ({ value: r, label: r }));
  }, [userRole, userRegion, userStationIds]);

  const roleFilteredRoomData = roomData.filter(item => {
    if (userRole === 'company_admin') return true;
    if (userRole === 'region_manager') return item.address.includes(userRegion) || item.stationName.includes(userRegion);
    if (userRole === 'station_admin') return userStationIds.includes(item.stationId);
    return item.userName === currentUser?.name;
  });

  const roleFilteredRepairData = repairData.filter(item => {
    if (userRole === 'company_admin') return true;
    if (userRole === 'region_manager') return item.address.includes(userRegion) || item.stationName.includes(userRegion);
    if (userRole === 'station_admin') return userStationIds.includes(item.stationId);
    return item.userName === currentUser?.name;
  });

  const filteredRoomData = roleFilteredRoomData.filter(item => {
    if (selectedRegion !== '全部' && item.stationName.includes(selectedRegion) === false) {
      const regionMatch = item.address.includes(selectedRegion) || item.stationName.includes(selectedRegion);
      if (!regionMatch) return false;
    }
    if (selectedStatus !== '全部' && item.status !== selectedStatus) return false;
    if (searchText) {
      const lower = searchText.toLowerCase();
      return (
        item.userName.toLowerCase().includes(lower) ||
        item.address.toLowerCase().includes(lower) ||
        item.stationName.toLowerCase().includes(lower)
      );
    }
    return true;
  });

  const filteredRepairData = roleFilteredRepairData.filter(item => {
    if (selectedRegion !== '全部') {
      const regionMatch = item.address.includes(selectedRegion) || item.stationName.includes(selectedRegion);
      if (!regionMatch) return false;
    }
    if (searchText) {
      const lower = searchText.toLowerCase();
      return (
        item.userName.toLowerCase().includes(lower) ||
        item.address.toLowerCase().includes(lower) ||
        item.description.toLowerCase().includes(lower)
      );
    }
    return true;
  });

  const monitoredCount = filteredRoomData.length;
  const passRate = filteredRoomData.length > 0
    ? Number(((filteredRoomData.filter(r => r.status === 'normal').length / filteredRoomData.length) * 100).toFixed(1))
    : 0;
  const lowTempCount = filteredRoomData.filter(r => r.status === 'low').length;
  const violationCount = filteredRoomData.filter(r => r.violationType && r.violationType !== 'none').length;

  const handleDiagnosis = (record: RoomTempData) => {
    setSelectedRoomRecord(record);
    setDiagnosisModalVisible(true);
  };

  const handlePushReminder = () => {
    message.success('已推送提醒至用户');
  };

  const handleViewRating = (record: RepairRequest) => {
    setSelectedRepair(record);
    setRatingModalVisible(true);
  };

  const handleShowTrend = (record: RoomTempData) => {
    setSelectedTrendUser(record);
    setTrendInfo(generateTrendData(record.currentTemp));
  };

  const handleNewRepair = () => {
    form.resetFields();
    setNewRepairModalVisible(true);
  };

  const handleSubmitRepair = () => {
    form.validateFields().then(values => {
      const now = Date.now();
      const matchingRoom = roomData.find(r => r.stationName === values.stationName);
      const stationId = matchingRoom ? matchingRoom.stationId : 'ST-朝-1';
      const assignee = findAssignee(stationId);

      const newRepair: RepairRequest = {
        id: 'RR-' + now,
        userId: 'U-' + now,
        userName: values.userName,
        address: values.address,
        description: values.description,
        stationId,
        stationName: values.stationName,
        status: 'assigned',
        workOrderId: 'WO-' + now,
        createdAt: new Date().toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\//g, '-'),
        assignee,
      };

      setRepairData(prev => [newRepair, ...prev]);
      message.success('报修已提交，系统已自动分配到对应换热站负责班组');
      setNewRepairModalVisible(false);
      form.resetFields();
    });
  };

  const handleCompleteRepair = (record: RepairRequest) => {
    Modal.confirm({
      title: '确认完工',
      content: `确认将报修单 ${record.id} 标记为已完成？`,
      onOk: () => {
        const now = new Date().toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\//g, '-');
        setRepairData(prev => prev.map(r =>
          r.id === record.id
            ? { ...r, status: 'completed' as const, completedAt: now }
            : r
        ));
        setRatingRepair({ ...record, status: 'completed', completedAt: now });
        ratingForm.resetFields();
        setSubmitRatingModalVisible(true);
      },
    });
  };

  const handleSubmitRating = () => {
    ratingForm.validateFields().then(values => {
      setRepairData(prev => prev.map(r =>
        r.id === ratingRepair?.id
          ? { ...r, userRating: values.rating, userComment: values.comment }
          : r
      ));
      message.success('评价已提交');
      setSubmitRatingModalVisible(false);
      setRatingRepair(null);
      ratingForm.resetFields();
    });
  };

  const tempRanges = ['16°C以下', '16-18°C', '18-20°C', '20-22°C', '22-24°C', '24°C以上'];
  const tempRangeCounts = [
    filteredRoomData.filter(r => r.currentTemp < 16).length,
    filteredRoomData.filter(r => r.currentTemp >= 16 && r.currentTemp < 18).length,
    filteredRoomData.filter(r => r.currentTemp >= 18 && r.currentTemp < 20).length,
    filteredRoomData.filter(r => r.currentTemp >= 20 && r.currentTemp < 22).length,
    filteredRoomData.filter(r => r.currentTemp >= 22 && r.currentTemp < 24).length,
    filteredRoomData.filter(r => r.currentTemp >= 24).length,
  ];

  const distributionChartOption = {
    tooltip: { trigger: 'axis' as const },
    grid: { left: 60, right: 30, bottom: 30, top: 20 },
    xAxis: { type: 'category' as const, data: tempRanges, axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value' as const, name: '用户数' },
    series: [{
      type: 'bar' as const,
      data: tempRangeCounts.map((val, idx) => ({
        value: val,
        itemStyle: {
          color: idx === 0 ? '#ff4d4f' : idx === 1 ? '#faad14' : idx === 2 ? '#1890ff' : idx === 3 ? '#52c41a' : idx === 4 ? '#52c41a' : '#fa541c',
        },
      })),
      barWidth: '40%',
    }],
  };

  const trendChartOption = selectedTrendUser
    ? {
        tooltip: { trigger: 'axis' as const },
        grid: { left: 60, right: 30, bottom: 30, top: 30 },
        title: { text: `${selectedTrendUser.userName} - ${selectedTrendUser.address} 近24小时室温趋势`, textStyle: { fontSize: 14 } },
        xAxis: { type: 'category' as const, data: trendInfo.hours },
        yAxis: { type: 'value' as const, name: '温度(°C)', min: 14, max: 28 },
        series: [
          {
            type: 'line' as const,
            data: trendInfo.data,
            smooth: true,
            lineStyle: { color: '#1890ff', width: 2 },
            itemStyle: { color: '#1890ff' },
            areaStyle: { color: 'rgba(24, 144, 255, 0.15)' },
            markLine: {
              silent: true,
              data: [{ yAxis: 20, lineStyle: { color: '#52c41a', type: 'dashed' as const }, label: { formatter: '目标温度 20°C' } }],
            },
          },
        ],
      }
    : {};

  const communities = [...new Set(filteredRoomData.map(r => r.community))];
  const hoursForHeatmap = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
  const heatmapData: [number, number, number][] = [];
  communities.forEach((community, cIdx) => {
    hoursForHeatmap.forEach((_, hIdx) => {
      const communityRecords = filteredRoomData.filter(r => r.community === community);
      const avgTemp = communityRecords.length > 0
        ? Number((communityRecords.reduce((s, r) => s + r.currentTemp, 0) / communityRecords.length + (Math.random() - 0.5) * 3).toFixed(1))
        : 0;
      heatmapData.push([hIdx, cIdx, avgTemp]);
    });
  });

  const heatmapOption = {
    tooltip: {
      position: 'top' as const,
      formatter: (params: { data: number[] }) => {
        const [hour, communityIdx, temp] = params.data;
        return `${communities[communityIdx]} ${hoursForHeatmap[hour]}<br/>平均室温: ${temp}°C`;
      },
    },
    grid: { left: 120, right: 40, bottom: 40, top: 10 },
    xAxis: { type: 'category' as const, data: hoursForHeatmap, splitArea: { show: true } },
    yAxis: { type: 'category' as const, data: communities, splitArea: { show: true } },
    visualMap: { min: 16, max: 26, calculable: true, orient: 'horizontal' as const, left: 'center' as const, bottom: 0, inRange: { color: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#fee090', '#fdae61', '#f46d43', '#d73027'] } },
    series: [{
      type: 'heatmap' as const,
      data: heatmapData,
      label: { show: false },
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' } },
    }],
  };

  const violationNone = filteredRoomData.filter(r => !r.violationType || r.violationType === 'none').length;
  const violationWaterDrain = filteredRoomData.filter(r => r.violationType === 'water_drain').length;
  const violationHeatTheft = filteredRoomData.filter(r => r.violationType === 'heat_theft').length;
  const violationValve = filteredRoomData.filter(r => r.violationType === 'valve_tampering').length;

  const violationPieOption = {
    tooltip: { trigger: 'item' as const },
    legend: { bottom: 0, data: ['无违规', '疑似放水', '疑似窃热', '疑似违规调节'] },
    series: [{
      type: 'pie' as const,
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, formatter: '{b}: {c}' },
      data: [
        { value: violationNone, name: '无违规', itemStyle: { color: '#52c41a' } },
        { value: violationWaterDrain, name: '疑似放水', itemStyle: { color: '#ff4d4f' } },
        { value: violationHeatTheft, name: '疑似窃热', itemStyle: { color: '#fa541c' } },
        { value: violationValve, name: '疑似违规调节', itemStyle: { color: '#faad14' } },
      ],
    }],
  };

  const stationNames = [...new Set(filteredRoomData.map(r => r.stationName))];
  const stationPassRates = stationNames.map(station => {
    const stationRecords = filteredRoomData.filter(r => r.stationName === station);
    return stationRecords.length > 0
      ? Number(((stationRecords.filter(r => r.status === 'normal').length / stationRecords.length) * 100).toFixed(1))
      : 0;
  });

  const stationBarOption = {
    tooltip: { trigger: 'axis' as const, formatter: (params: { name: string; value: number }[]) => `${params[0].name}<br/>达标率: ${params[0].value}%` },
    grid: { left: 120, right: 30, bottom: 30, top: 20 },
    xAxis: { type: 'value' as const, max: 100, name: '达标率(%)' },
    yAxis: { type: 'category' as const, data: stationNames, inverse: true, axisLabel: { fontSize: 11 } },
    series: [{
      type: 'bar' as const,
      data: stationPassRates.map(rate => ({
        value: rate,
        itemStyle: { color: rate >= 90 ? '#52c41a' : rate >= 70 ? '#faad14' : '#ff4d4f' },
      })),
      barWidth: '50%',
      label: { show: true, position: 'right' as const, formatter: '{c}%' },
    }],
  };

  const roomTempColumns = [
    { title: '用户', dataIndex: 'userName', key: 'userName', width: 80 },
    { title: '地址', dataIndex: 'address', key: 'address', width: 200, ellipsis: true },
    { title: '所属换热站', dataIndex: 'stationName', key: 'stationName', width: 130 },
    {
      title: '当前室温(°C)',
      dataIndex: 'currentTemp',
      key: 'currentTemp',
      width: 110,
      render: (temp: number) => (
        <span style={{ color: temp < 18 ? '#1890ff' : temp > 24 ? '#fa541c' : '#52c41a', fontWeight: 600 }}>
          {temp}°C
        </span>
      ),
    },
    { title: '目标温度(°C)', dataIndex: 'targetTemp', key: 'targetTemp', width: 110, render: (temp: number) => `${temp}°C` },
    {
      title: '偏差',
      key: 'deviation',
      width: 80,
      render: (_: unknown, record: RoomTempData) => {
        const dev = Number((record.currentTemp - record.targetTemp).toFixed(1));
        return <span style={{ color: dev < 0 ? '#1890ff' : dev > 0 ? '#fa541c' : '#52c41a' }}>{dev > 0 ? `+${dev}` : dev}°C</span>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string) => <Tag color={STATUS_TAG_MAP[status]?.color}>{STATUS_TAG_MAP[status]?.text}</Tag>,
    },
    {
      title: '违规类型',
      dataIndex: 'violationType',
      key: 'violationType',
      width: 110,
      render: (type: string) => {
        if (!type || type === 'none') return '-';
        return <Tag color="red">{VIOLATION_MAP[type] || type}</Tag>;
      },
    },
    { title: '最后更新', dataIndex: 'lastUpdate', key: 'lastUpdate', width: 160 },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: unknown, record: RoomTempData) => (
        <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {record.status === 'low' && (
            <Button type="link" size="small" icon={<MedicineBoxOutlined />} onClick={() => handleDiagnosis(record)}>
              诊断
            </Button>
          )}
          {record.violationType && record.violationType !== 'none' && (
            <Button type="link" size="small" danger icon={<BellOutlined />} onClick={handlePushReminder}>
              推送提醒
            </Button>
          )}
          <Button type="link" size="small" icon={<SearchOutlined />} onClick={() => handleShowTrend(record)}>
            趋势
          </Button>
        </span>
      ),
    },
  ];

  const repairColumns = [
    { title: '报修单号', dataIndex: 'id', key: 'id', width: 120 },
    { title: '用户', dataIndex: 'userName', key: 'userName', width: 80 },
    { title: '地址', dataIndex: 'address', key: 'address', width: 200, ellipsis: true },
    { title: '问题描述', dataIndex: 'description', key: 'description', width: 120 },
    { title: '所属换热站', dataIndex: 'stationName', key: 'stationName', width: 130 },
    { title: '负责人', dataIndex: 'assignee', key: 'assignee', width: 100, render: (v: string) => v || '-' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: string) => <Tag color={REPAIR_STATUS_TAG_MAP[status]?.color}>{REPAIR_STATUS_TAG_MAP[status]?.text}</Tag>,
    },
    {
      title: '评分',
      key: 'rating',
      width: 160,
      render: (_: unknown, record: RepairRequest) => {
        if (record.status === 'completed' && record.userRating) {
          return (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Rate disabled value={record.userRating} style={{ fontSize: 14 }} />
              <Button type="link" size="small" onClick={() => handleViewRating(record)}>查看评价</Button>
            </span>
          );
        }
        return '-';
      },
    },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 160 },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: unknown, record: RepairRequest) => (
        <span style={{ display: 'flex', gap: 4 }}>
          {(record.status === 'assigned' || record.status === 'in_progress') && (
            <Button type="link" size="small" onClick={() => handleCompleteRepair(record)}>完工</Button>
          )}
          {record.status === 'completed' && (
            <Button type="link" size="small" onClick={() => handleViewRating(record)}>查看评价</Button>
          )}
        </span>
      ),
    },
  ];

  const stationOptions = [...new Set(roomData.map(r => r.stationName))].map(s => ({ value: s, label: s }));

  const tabItems = [
    {
      key: '1',
      label: '室温监测',
      children: (
        <div>
          <Table
            dataSource={filteredRoomData}
            columns={roomTempColumns}
            rowKey="id"
            size="small"
            scroll={{ x: 1400 }}
            pagination={{ pageSize: 10, showSizeChanger: true, showTotal: t => `共 ${t} 条` }}
          />
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col span={12}>
              <Card title="室温分布" size="small">
                <ReactECharts option={distributionChartOption} style={{ height: 300 }} />
              </Card>
            </Col>
            <Col span={12}>
              <Card title="用户室温趋势" size="small">
                {selectedTrendUser ? (
                  <ReactECharts option={trendChartOption} style={{ height: 300 }} />
                ) : (
                  <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                    点击表格中"趋势"按钮查看用户24小时室温变化
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        </div>
      ),
    },
    {
      key: '2',
      label: '报修管理',
      children: (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleNewRepair}>新增报修</Button>
          </div>
          <Table
            dataSource={filteredRepairData}
            columns={repairColumns}
            rowKey="id"
            size="small"
            scroll={{ x: 1400 }}
            pagination={{ pageSize: 10, showSizeChanger: true, showTotal: t => `共 ${t} 条` }}
          />
        </div>
      ),
    },
    {
      key: '3',
      label: '用热分析',
      children: (
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card title="各小区室温热力图" size="small">
              <ReactECharts option={heatmapOption} style={{ height: Math.max(300, communities.length * 40 + 80) }} />
            </Card>
          </Col>
          <Col span={12}>
            <Card title="违规类型统计" size="small">
              <ReactECharts option={violationPieOption} style={{ height: 350 }} />
            </Card>
          </Col>
          <Col span={12}>
            <Card title="各换热站室温达标率" size="small">
              <ReactECharts option={stationBarOption} style={{ height: Math.max(350, stationNames.length * 35 + 60) }} />
            </Card>
          </Col>
        </Row>
      ),
    },
  ];

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
                <Select
                value={selectedRegion}
                onChange={setSelectedRegion}
                style={{ width: 140 }}
                options={regionOptions}
                disabled={userRole === 'region_manager' || (userRole === 'station_admin' && regionOptions.length <= 2)}
              />
              </Col>
              <Col>状态：</Col>
              <Col>
                <Select
                  value={selectedStatus}
                  onChange={setSelectedStatus}
                  style={{ width: 140 }}
                  options={STATUS_OPTIONS}
                />
              </Col>
              <Col>
                <Input
                  placeholder="搜索用户/地址/换热站"
                  prefix={<SearchOutlined />}
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  style={{ width: 220 }}
                  allowClear
                />
              </Col>
              <Col flex="auto" />
              <Col>
                <Button icon={<ReloadOutlined />} size="small" onClick={refreshData}>刷新数据</Button>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="监测用户数"
              value={monitoredCount}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="室温达标率"
              value={passRate}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
            <Progress percent={passRate} showInfo={false} size="small" strokeColor={passRate >= 90 ? '#52c41a' : passRate >= 70 ? '#faad14' : '#ff4d4f'} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="温度偏低数"
              value={lowTempCount}
              prefix={<ArrowDownOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="异常违规数"
              value={violationCount}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Tabs items={tabItems} />
      </Card>

      <Modal
        title="室温诊断分析"
        open={diagnosisModalVisible}
        onCancel={() => { setDiagnosisModalVisible(false); setSelectedRoomRecord(null); }}
        footer={<Button onClick={() => { setDiagnosisModalVisible(false); setSelectedRoomRecord(null); }}>关闭</Button>}
        width={560}
      >
        {selectedRoomRecord && (
          <div>
            <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="用户">{selectedRoomRecord.userName}</Descriptions.Item>
              <Descriptions.Item label="地址">{selectedRoomRecord.address}</Descriptions.Item>
              <Descriptions.Item label="当前室温">{selectedRoomRecord.currentTemp}°C</Descriptions.Item>
              <Descriptions.Item label="目标温度">{selectedRoomRecord.targetTemp}°C</Descriptions.Item>
            </Descriptions>
            <div style={{ background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 4, padding: 16 }}>
              <WarningOutlined style={{ color: '#fa8c16', marginRight: 8 }} />
              <strong>诊断结果</strong>
              <p style={{ marginTop: 8, marginBottom: 0 }}>
                当前室温{selectedRoomRecord.currentTemp}°C低于目标温度，可能原因：
                <br />1.管网末端流量不足
                <br />2.户内散热器堵塞
                <br />3.违规放水导致热量流失
                <br />
                <br />建议：检查入户阀门开度，排查放水行为
              </p>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title="用户评价"
        open={ratingModalVisible}
        onCancel={() => { setRatingModalVisible(false); setSelectedRepair(null); }}
        footer={<Button onClick={() => { setRatingModalVisible(false); setSelectedRepair(null); }}>关闭</Button>}
      >
        {selectedRepair && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="报修单号">{selectedRepair.id}</Descriptions.Item>
            <Descriptions.Item label="用户">{selectedRepair.userName}</Descriptions.Item>
            <Descriptions.Item label="问题描述">{selectedRepair.description}</Descriptions.Item>
            <Descriptions.Item label="负责人">{selectedRepair.assignee || '-'}</Descriptions.Item>
            <Descriptions.Item label="评分">
              <Rate disabled value={selectedRepair.userRating || 0} />
              <span style={{ marginLeft: 8 }}>{selectedRepair.userRating} 分</span>
            </Descriptions.Item>
            <Descriptions.Item label="评价内容">{selectedRepair.userComment || '暂无评价'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      <Modal
        title="新增报修"
        open={newRepairModalVisible}
        onOk={handleSubmitRepair}
        onCancel={() => { setNewRepairModalVisible(false); form.resetFields(); }}
        okText="提交"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="userName" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item name="address" label="地址" rules={[{ required: true, message: '请输入地址' }]}>
            <Input placeholder="请输入地址" />
          </Form.Item>
          <Form.Item name="description" label="问题描述" rules={[{ required: true, message: '请输入问题描述' }]}>
            <Input.TextArea rows={4} placeholder="请描述报修问题" />
          </Form.Item>
          <Form.Item name="stationName" label="所属换热站" rules={[{ required: true, message: '请选择换热站' }]}>
            <Select placeholder="请选择换热站" options={stationOptions} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="评价维修服务"
        open={submitRatingModalVisible}
        onOk={handleSubmitRating}
        onCancel={() => { setSubmitRatingModalVisible(false); setRatingRepair(null); ratingForm.resetFields(); }}
        okText="提交评价"
        cancelText="跳过"
      >
        {ratingRepair && (
          <div style={{ marginBottom: 16, color: '#666' }}>
            报修单号：{ratingRepair.id} | {ratingRepair.description}
          </div>
        )}
        <Form form={ratingForm} layout="vertical">
          <Form.Item name="rating" label="评分" rules={[{ required: true, message: '请选择评分' }]}>
            <Rate />
          </Form.Item>
          <Form.Item name="comment" label="评价内容">
            <Input.TextArea rows={3} placeholder="请输入评价内容（选填）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default UserSide;
