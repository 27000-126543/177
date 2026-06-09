import { useState, useEffect, useMemo } from 'react';
import { Row, Col, Card, Table, Tag, Button, Progress, Descriptions, Badge, Modal, message, Tooltip, Statistic } from 'antd';
import {
  FireOutlined,
  ThunderboltOutlined,
  ReloadOutlined,
  EnvironmentOutlined,
  PoweroffOutlined,
  ToolOutlined,
  RobotOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { generateHeatSourcePlants } from '../../mock/data';
import type { HeatSourcePlant, Boiler } from '../../types';
import { useAuth } from '../../store/authStore';

const REGIONS = ['全部', '朝阳区', '海淀区', '丰台区', '东城区', '西城区'];

const STATUS_CONFIG: Record<string, { color: string; text: string }> = {
  running: { color: 'green', text: '运行中' },
  stopped: { color: 'default', text: '已停机' },
  maintenance: { color: 'orange', text: '维护中' },
  fault: { color: 'red', text: '故障' },
};

const BOILER_TAG_COLORS: Record<string, string> = {
  running: 'green',
  stopped: 'default',
  maintenance: 'orange',
  fault: 'red',
};

function HeatSource() {
  const { currentUser, userRegion, userStationIds } = useAuth();
  const userRole = currentUser?.role || 'user';
  const [plants, setPlants] = useState<HeatSourcePlant[]>([]);
  const [selectedRegion, setSelectedRegion] = useState('全部');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBoiler, setSelectedBoiler] = useState<Boiler | null>(null);

  useEffect(() => {
    if (userRole === 'region_manager') {
      setSelectedRegion(userRegion);
    }
  }, [userRole, userRegion]);

  const refreshData = () => {
    setPlants(generateHeatSourcePlants());
  };

  useEffect(() => {
    refreshData();
    const timer = setInterval(refreshData, 5000);
    return () => clearInterval(timer);
  }, []);

  const roleFilteredPlants = useMemo(() => {
    if (userRole === 'company_admin') return plants;
    if (userRole === 'region_manager') return plants.filter(p => p.region === userRegion);
    if (userRole === 'station_admin') {
      const regions = new Set<string>();
      userStationIds.forEach(sid => {
        if (sid.startsWith('ST-朝-')) regions.add('朝阳区');
        else if (sid.startsWith('ST-海-')) regions.add('海淀区');
        else if (sid.startsWith('ST-丰-')) regions.add('丰台区');
        else if (sid.startsWith('ST-东-')) regions.add('东城区');
        else if (sid.startsWith('ST-西-')) regions.add('西城区');
      });
      return plants.filter(p => regions.has(p.region));
    }
    return plants;
  }, [plants, userRole, userRegion, userStationIds]);

  const filteredPlants = selectedRegion === '全部'
    ? roleFilteredPlants
    : roleFilteredPlants.filter(p => p.region === selectedRegion);

  const handleRecommendStart = (boiler: Boiler) => {
    setSelectedBoiler(boiler);
    setModalVisible(true);
  };

  const handleConfirmStart = () => {
    if (selectedBoiler) {
      message.success(`${selectedBoiler.name}已启动`);
    }
    setModalVisible(false);
    setSelectedBoiler(null);
  };

  const boilerColumns = [
    {
      title: '锅炉名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={BOILER_TAG_COLORS[status]}>
          {STATUS_CONFIG[status]?.text || status}
        </Tag>
      ),
    },
    {
      title: '负荷(%)',
      dataIndex: 'load',
      key: 'load',
      render: (load: number) => load > 0 ? `${load}%` : '-',
    },
    {
      title: '出水温度(°C)',
      dataIndex: 'outWaterTemp',
      key: 'outWaterTemp',
      render: (temp: number) => temp > 0 ? `${temp}°C` : '-',
    },
    {
      title: '热效率(%)',
      dataIndex: 'efficiency',
      key: 'efficiency',
      render: (eff: number) => eff > 0 ? `${eff}%` : '-',
    },
    {
      title: '运行时长(h)',
      dataIndex: 'runningHours',
      key: 'runningHours',
      render: (hours: number) => hours > 0 ? `${hours}` : '-',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: Boiler) => {
        if (record.status === 'stopped' && record.recommended) {
          return (
            <Tooltip title="系统根据室外温度和历史用热推荐启动此锅炉">
              <Button
                type="primary"
                size="small"
                icon={<PoweroffOutlined />}
                onClick={() => handleRecommendStart(record)}
              >
                推荐启动
              </Button>
            </Tooltip>
          );
        }
        if (record.status === 'running') {
          return (
            <Button size="small" danger icon={<PoweroffOutlined />}>
              停止
            </Button>
          );
        }
        if (record.status === 'fault') {
          return (
            <Button size="small" icon={<ToolOutlined />}>
              维修
            </Button>
          );
        }
        return null;
      },
    },
  ];

  const totalLoad = filteredPlants.reduce((s, p) => s + p.load, 0);
  const totalMaxLoad = filteredPlants.reduce((s, p) => s + p.maxLoad, 0);

  const loadTempChartOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['预测负荷', '实际数据'] },
    grid: { left: 60, right: 30, bottom: 30, top: 40 },
    xAxis: {
      type: 'category',
      name: '室外温度(°C)',
      data: Array.from({ length: 31 }, (_, i) => -20 + i),
    },
    yAxis: {
      type: 'value',
      name: '热负荷(MW)',
    },
    series: [
      {
        name: '预测负荷',
        type: 'line',
        smooth: true,
        lineStyle: { color: '#1890ff', width: 2 },
        itemStyle: { color: '#1890ff' },
        data: Array.from({ length: 31 }, (_, i) => {
          const temp = -20 + i;
          return Number((800 - temp * 30 + Math.random() * 20).toFixed(1));
        }),
      },
      {
        name: '实际数据',
        type: 'scatter',
        itemStyle: { color: '#ff4d4f' },
        data: Array.from({ length: 20 }, () => {
          const temp = -20 + Math.floor(Math.random() * 31);
          const load = 800 - temp * 30 + (Math.random() - 0.5) * 80;
          return [temp, Number(load.toFixed(1))];
        }),
      },
    ],
  };

  const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
  const coalData = Array.from({ length: 24 }, () => Number((5 + Math.random() * 20).toFixed(1)));
  const powerData = Array.from({ length: 24 }, () => Number((100 + Math.random() * 400).toFixed(0)));

  const consumptionChartOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['耗煤量(t/h)', '耗电量(kWh)'] },
    grid: { left: 60, right: 60, bottom: 30, top: 40 },
    xAxis: { type: 'category', data: hours },
    yAxis: [
      {
        type: 'value',
        name: '耗煤量(t/h)',
        position: 'left',
      },
      {
        type: 'value',
        name: '耗电量(kWh)',
        position: 'right',
      },
    ],
    series: [
      {
        name: '耗煤量(t/h)',
        type: 'line',
        smooth: true,
        yAxisIndex: 0,
        lineStyle: { color: '#fa8c16' },
        itemStyle: { color: '#fa8c16' },
        areaStyle: { color: 'rgba(250, 140, 22, 0.15)' },
        data: coalData,
      },
      {
        name: '耗电量(kWh)',
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        lineStyle: { color: '#1890ff' },
        itemStyle: { color: '#1890ff' },
        areaStyle: { color: 'rgba(24, 144, 255, 0.15)' },
        data: powerData,
      },
    ],
  };

  const recommendTemp = selectedBoiler ? Number((85 + Math.random() * 15).toFixed(1)) : 95;

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={16}>
          <Card size="small">
            <Row align="middle" gutter={16}>
              <Col>
                <EnvironmentOutlined style={{ marginRight: 4 }} />
                区域筛选：
              </Col>
              {REGIONS.map(region => {
                const isDisabled = userRole === 'region_manager' && region !== userRegion && region !== '全部';
                const isHidden = userRole === 'region_manager' && region !== userRegion && region !== '全部';
                if (isHidden) return null;
                return (
                  <Col key={region}>
                    <Button
                      type={selectedRegion === region ? 'primary' : 'default'}
                      size="small"
                      onClick={() => !isDisabled && setSelectedRegion(region)}
                      disabled={isDisabled}
                    >
                      {region}
                    </Button>
                  </Col>
                );
              })}
              <Col flex="auto" />
              <Col>
                <Button icon={<ReloadOutlined />} size="small" onClick={refreshData}>
                  刷新数据
                </Button>
              </Col>
            </Row>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Row justify="space-around">
              <Statistic title="总负荷" value={totalLoad} suffix={`/${totalMaxLoad}MW`} valueStyle={{ fontSize: 16 }} />
              <Statistic title="热源厂数" value={filteredPlants.length} suffix="个" valueStyle={{ fontSize: 16 }} />
              <Statistic title="运行中" value={filteredPlants.filter(p => p.status === 'running').length} suffix="个" valueStyle={{ fontSize: 16, color: '#52c41a' }} />
            </Row>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col span={16}>
          {filteredPlants.map(plant => {
            const loadPercent = plant.maxLoad > 0 ? Math.round((plant.load / plant.maxLoad) * 100) : 0;
            return (
              <Card
                key={plant.id}
                title={
                  <span>
                    <FireOutlined style={{ marginRight: 8, color: '#fa541c' }} />
                    {plant.name}
                    <Badge
                      status={plant.status === 'running' ? 'success' : plant.status === 'maintenance' ? 'warning' : 'default'}
                      text={STATUS_CONFIG[plant.status]?.text}
                      style={{ marginLeft: 12 }}
                    />
                  </span>
                }
                style={{ marginBottom: 16 }}
              >
                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col span={6}>
                    <Statistic
                      title="出水温度"
                      value={plant.outWaterTemp}
                      suffix="°C"
                      prefix={<FireOutlined />}
                      valueStyle={{ color: '#fa541c' }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="回水温度"
                      value={plant.returnWaterTemp}
                      suffix="°C"
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="出水压力"
                      value={plant.outWaterPressure}
                      suffix="MPa"
                      prefix={<ThunderboltOutlined />}
                      valueStyle={{ color: '#722ed1' }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="流量"
                      value={plant.flow}
                      suffix="t/h"
                      valueStyle={{ color: '#13c2c2' }}
                    />
                  </Col>
                </Row>

                <Descriptions size="small" column={1} style={{ marginBottom: 12 }}>
                  <Descriptions.Item label="当前负荷">
                    <Progress
                      percent={loadPercent}
                      status={loadPercent > 90 ? 'exception' : loadPercent > 70 ? 'active' : 'normal'}
                      format={() => `${plant.load}/${plant.maxLoad}MW (${loadPercent}%)`}
                    />
                  </Descriptions.Item>
                </Descriptions>

                <Table
                  dataSource={plant.boilers}
                  columns={boilerColumns}
                  rowKey="id"
                  size="small"
                  pagination={false}
                />
              </Card>
            );
          })}
        </Col>

        <Col span={8}>
          <Card
            title={
              <span>
                <RobotOutlined style={{ marginRight: 8 }} />
                智能调度建议
              </span>
            }
            style={{ marginBottom: 16 }}
          >
            <Descriptions column={1} size="small">
              <Descriptions.Item label="当前室外温度">
                <span style={{ fontSize: 20, fontWeight: 600, color: '#1890ff' }}>-5°C</span>
              </Descriptions.Item>
              <Descriptions.Item label="AI调度建议">
                <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 4, padding: 12 }}>
                  <WarningOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                  当前室外温度-5°C，预测供热负荷需求为{totalLoad}MW。建议运行锅炉组合：1号+3号+5号，建议总出水温度95°C
                </div>
              </Descriptions.Item>
            </Descriptions>

            <div style={{ marginTop: 16 }}>
              <ReactECharts option={loadTempChartOption} style={{ height: 280 }} />
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title="能耗趋势（近24小时）">
            <ReactECharts option={consumptionChartOption} style={{ height: 300 }} />
          </Card>
        </Col>
      </Row>

      <Modal
        title="确认启动锅炉"
        open={modalVisible}
        onOk={handleConfirmStart}
        onCancel={() => {
          setModalVisible(false);
          setSelectedBoiler(null);
        }}
        okText="确认启动"
        cancelText="取消"
      >
        {selectedBoiler && (
          <div>
            <p>
              <RobotOutlined style={{ color: '#1890ff', marginRight: 8 }} />
              AI智能推荐
            </p>
            <p style={{ background: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: 4, padding: 12 }}>
              根据当前室外温度-5°C及历史用热数据分析，建议启动{selectedBoiler.name}，建议出水温度设定为{recommendTemp}°C
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default HeatSource;
