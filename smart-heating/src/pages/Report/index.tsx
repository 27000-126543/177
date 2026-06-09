import React, { useState, useMemo, useEffect } from 'react';
import { Row, Col, Card, Table, Button, Select, DatePicker, Statistic, Tabs, message } from 'antd';
import {
  DownloadOutlined,
  FileExcelOutlined,
  FireOutlined,
  HomeOutlined,
  ToolOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { generateMonthlyReports } from '../../mock/data';
import { useAuth } from '../../store/authStore';
import * as XLSX from 'xlsx';
import type { MonthlyReport } from '../../types';

const { MonthPicker } = DatePicker;

const REGIONS = ['朝阳区', '海淀区', '丰台区', '东城区', '西城区'];

const REGION_CODE_REVERSE: Record<string, string> = {
  '朝': '朝阳区',
  '海': '海淀区',
  '丰': '丰台区',
  '东': '东城区',
  '西': '西城区',
};

const regionOptions = [
  { value: '全部', label: '全部' },
  ...REGIONS.map((r) => ({ value: r, label: r })),
];

const COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1'];

const Report: React.FC = () => {
  const [region, setRegion] = useState('全部');
  const [month, setMonth] = useState<string | null>(null);
  const [reports] = useState<MonthlyReport[]>(generateMonthlyReports());
  const { currentUser, userRegion, userStationIds } = useAuth();
  const userRole = currentUser?.role || 'user';

  useEffect(() => {
    if (userRole === 'region_manager' && userRegion) {
      setRegion(userRegion);
    }
    if (userRole === 'station_admin' && userStationIds.length > 0) {
      const allowedRegions = [...new Set(userStationIds.map(sid => {
        const parts = sid.split('-');
        return REGION_CODE_REVERSE[parts[1]] || '';
      }).filter(Boolean))];
      if (allowedRegions.length === 1) {
        setRegion(allowedRegions[0]);
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
        { value: '全部', label: '全部' },
        ...allowedRegions.map(r => ({ value: r, label: r })),
      ];
    }
    return regionOptions;
  }, [userRole, userRegion, userStationIds]);

  const filteredReports = useMemo(() => {
    let data = reports;
    if (region !== '全部') {
      data = data.filter((r) => r.region === region);
    }
    if (month) {
      data = data.filter((r) => r.month === month);
    }
    return data;
  }, [reports, region, month]);

  const summaryStats = useMemo(() => {
    if (filteredReports.length === 0) {
      return { totalHeat: 0, avgRoom: 0, passRate: 0, avgRepair: 0 };
    }
    const totalHeat = filteredReports.reduce((s, r) => s + r.totalHeatSupply, 0);
    const avgRoom = filteredReports.reduce((s, r) => s + r.avgRoomTemp, 0) / filteredReports.length;
    const passRate = filteredReports.reduce((s, r) => s + r.roomTempPassRate, 0) / filteredReports.length;
    const avgRepair = filteredReports.reduce((s, r) => s + r.avgRepairTime, 0) / filteredReports.length;
    return { totalHeat, avgRoom, passRate, avgRepair };
  }, [filteredReports]);

  const months = useMemo(() => Array.from(new Set(reports.map((r) => r.month))).sort(), [reports]);

  const regionNames = useMemo(() => {
    if (region !== '全部') return [region];
    return REGIONS;
  }, [region]);

  const handleExportReport = () => {
    const wb = XLSX.utils.book_new();
    const data = filteredReports.map((r) => ({
      月份: r.month,
      区域: r.region,
      '总供热量(GJ)': r.totalHeatSupply,
      '耗煤量(t)': r.totalCoalConsumption,
      '耗电量(kWh)': r.totalPowerConsumption,
      平均供水温度: r.avgSupplyTemp,
      平均回水温度: r.avgReturnTemp,
      平均室温: r.avgRoomTemp,
      '室温达标率(%)': r.roomTempPassRate,
      告警总数: r.totalAlerts,
      '平均维修时长(h)': r.avgRepairTime,
      维修工单数: r.totalRepairOrders,
      '工单完成率(%)': r.completedRepairRate,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, '月度运行报告');
    XLSX.writeFile(wb, '月度运行分析报告.xlsx');
    message.success('月度运行分析报告导出成功');
  };

  const handleExportCost = () => {
    const wb = XLSX.utils.book_new();
    const data = filteredReports.map((r) => ({
      月份: r.month,
      区域: r.region,
      总供热量: r.totalHeatSupply,
      耗煤量: r.totalCoalConsumption,
      耗电量: r.totalPowerConsumption,
      总收入: r.totalRevenue,
      总成本: r.totalCost,
      利润: r.profit,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, '能耗成本明细');
    XLSX.writeFile(wb, '能耗成本明细.xlsx');
    message.success('能耗成本明细导出成功');
  };

  const supplyTempOption = useMemo(() => {
    const series = regionNames.map((rn, idx) => {
      const regionData = filteredReports.filter((r) => r.region === rn);
      return {
        name: rn,
        type: 'line' as const,
        data: months.map((m) => {
          const rec = regionData.find((r) => r.month === m);
          return rec ? rec.avgSupplyTemp : null;
        }),
        smooth: true,
        itemStyle: { color: COLORS[idx % COLORS.length] },
      };
    });
    return {
      tooltip: { trigger: 'axis' as const },
      legend: { data: regionNames },
      grid: { left: 60, right: 20, top: 40, bottom: 30 },
      xAxis: { type: 'category' as const, data: months },
      yAxis: { type: 'value' as const, name: '温度(°C)' },
      series,
    };
  }, [filteredReports, months, regionNames]);

  const roomTempPassOption = useMemo(() => {
    const series = regionNames.map((rn, idx) => {
      const regionData = filteredReports.filter((r) => r.region === rn);
      return {
        name: rn,
        type: 'bar' as const,
        data: months.map((m) => {
          const rec = regionData.find((r) => r.month === m);
          return rec ? rec.roomTempPassRate : 0;
        }),
        itemStyle: { color: COLORS[idx % COLORS.length] },
      };
    });
    return {
      tooltip: { trigger: 'axis' as const },
      legend: { data: regionNames },
      grid: { left: 60, right: 20, top: 40, bottom: 30 },
      xAxis: { type: 'category' as const, data: months },
      yAxis: { type: 'value' as const, name: '达标率(%)', min: 80 },
      series,
    };
  }, [filteredReports, months, regionNames]);

  const alertCountOption = useMemo(() => {
    const series = regionNames.map((rn, idx) => {
      const regionData = filteredReports.filter((r) => r.region === rn);
      return {
        name: rn,
        type: 'bar' as const,
        data: months.map((m) => {
          const rec = regionData.find((r) => r.month === m);
          return rec ? rec.totalAlerts : 0;
        }),
        itemStyle: { color: COLORS[idx % COLORS.length] },
      };
    });
    return {
      tooltip: { trigger: 'axis' as const },
      legend: { data: regionNames },
      grid: { left: 60, right: 20, top: 40, bottom: 30 },
      xAxis: { type: 'category' as const, data: months },
      yAxis: { type: 'value' as const, name: '告警数' },
      series,
    };
  }, [filteredReports, months, regionNames]);

  const coalTrendOption = useMemo(() => {
    const series = regionNames.map((rn, idx) => {
      const regionData = filteredReports.filter((r) => r.region === rn);
      return {
        name: rn,
        type: 'line' as const,
        data: months.map((m) => {
          const rec = regionData.find((r) => r.month === m);
          return rec ? rec.totalCoalConsumption : null;
        }),
        smooth: true,
        itemStyle: { color: COLORS[idx % COLORS.length] },
      };
    });
    return {
      tooltip: { trigger: 'axis' as const },
      legend: { data: regionNames },
      grid: { left: 60, right: 20, top: 40, bottom: 30 },
      xAxis: { type: 'category' as const, data: months },
      yAxis: { type: 'value' as const, name: '耗煤量(t)' },
      series,
    };
  }, [filteredReports, months, regionNames]);

  const powerTrendOption = useMemo(() => {
    const series = regionNames.map((rn, idx) => {
      const regionData = filteredReports.filter((r) => r.region === rn);
      return {
        name: rn,
        type: 'line' as const,
        data: months.map((m) => {
          const rec = regionData.find((r) => r.month === m);
          return rec ? rec.totalPowerConsumption : null;
        }),
        smooth: true,
        itemStyle: { color: COLORS[idx % COLORS.length] },
      };
    });
    return {
      tooltip: { trigger: 'axis' as const },
      legend: { data: regionNames },
      grid: { left: 60, right: 20, top: 40, bottom: 30 },
      xAxis: { type: 'category' as const, data: months },
      yAxis: { type: 'value' as const, name: '耗电量(kWh)' },
      series,
    };
  }, [filteredReports, months, regionNames]);

  const scatterOption = useMemo(() => {
    const scatterData = filteredReports.map((r) => [r.totalCoalConsumption, r.totalPowerConsumption, r.region]);
    return {
      tooltip: {
        formatter: (params: { data: (string | number)[] }) => {
          const d = params.data;
          return `${d[2]}<br/>耗煤量: ${d[0]}t<br/>耗电量: ${d[1]}kWh`;
        },
      },
      grid: { left: 60, right: 20, top: 30, bottom: 40 },
      xAxis: { type: 'value' as const, name: '耗煤量(t)' },
      yAxis: { type: 'value' as const, name: '耗电量(kWh)' },
      series: [
        {
          type: 'scatter' as const,
          data: scatterData,
          symbolSize: 12,
          itemStyle: { color: '#1890ff', opacity: 0.7 },
        },
      ],
    };
  }, [filteredReports]);

  const revenueCostProfitOption = useMemo(() => {
    const categories = regionNames;
    const revenueData = categories.map((rn) => {
      const regionData = filteredReports.filter((r) => r.region === rn);
      return regionData.reduce((s, r) => s + r.totalRevenue, 0);
    });
    const costData = categories.map((rn) => {
      const regionData = filteredReports.filter((r) => r.region === rn);
      return regionData.reduce((s, r) => s + r.totalCost, 0);
    });
    const profitData = categories.map((rn) => {
      const regionData = filteredReports.filter((r) => r.region === rn);
      return regionData.reduce((s, r) => s + r.profit, 0);
    });
    return {
      tooltip: { trigger: 'axis' as const },
      legend: { data: ['总收入', '总成本', '利润'] },
      grid: { left: 70, right: 20, top: 40, bottom: 30 },
      xAxis: { type: 'category' as const, data: categories },
      yAxis: { type: 'value' as const, name: '金额(元)' },
      series: [
        { name: '总收入', type: 'bar' as const, data: revenueData, itemStyle: { color: '#1890ff' } },
        { name: '总成本', type: 'bar' as const, data: costData, itemStyle: { color: '#faad14' } },
        { name: '利润', type: 'bar' as const, data: profitData, itemStyle: { color: '#52c41a' } },
      ],
    };
  }, [filteredReports, regionNames]);

  const profitMarginOption = useMemo(() => {
    const data = regionNames.map((rn) => {
      const regionData = filteredReports.filter((r) => r.region === rn);
      const totalRevenue = regionData.reduce((s, r) => s + r.totalRevenue, 0);
      const totalCost = regionData.reduce((s, r) => s + r.totalCost, 0);
      return totalRevenue > 0 ? Number((((totalRevenue - totalCost) / totalRevenue) * 100).toFixed(1)) : 0;
    });
    return {
      tooltip: { trigger: 'axis' as const },
      grid: { left: 60, right: 20, top: 30, bottom: 30 },
      xAxis: { type: 'category' as const, data: regionNames },
      yAxis: { type: 'value' as const, name: '利润率(%)' },
      series: [
        {
          type: 'bar' as const,
          data,
          itemStyle: { color: '#722ed1' },
          label: { show: true, position: 'top' as const, formatter: '{c}%' },
        },
      ],
    };
  }, [filteredReports, regionNames]);

  const revenueCostTrendOption = useMemo(() => {
    const revenueByMonth = months.map((m) => {
      const monthData = filteredReports.filter((r) => r.month === m);
      return monthData.reduce((s, r) => s + r.totalRevenue, 0);
    });
    const costByMonth = months.map((m) => {
      const monthData = filteredReports.filter((r) => r.month === m);
      return monthData.reduce((s, r) => s + r.totalCost, 0);
    });
    return {
      tooltip: { trigger: 'axis' as const },
      legend: { data: ['总收入', '总成本'] },
      grid: { left: 70, right: 20, top: 40, bottom: 30 },
      xAxis: { type: 'category' as const, data: months, boundaryGap: false },
      yAxis: { type: 'value' as const, name: '金额(元)' },
      series: [
        {
          name: '总收入',
          type: 'line' as const,
          data: revenueByMonth,
          smooth: true,
          areaStyle: { color: 'rgba(24,144,255,0.15)' },
          lineStyle: { color: '#1890ff' },
          itemStyle: { color: '#1890ff' },
        },
        {
          name: '总成本',
          type: 'line' as const,
          data: costByMonth,
          smooth: true,
          areaStyle: { color: 'rgba(250,173,20,0.15)' },
          lineStyle: { color: '#faad14' },
          itemStyle: { color: '#faad14' },
        },
      ],
    };
  }, [filteredReports, months]);

  const tableColumns = [
    { title: '月份', dataIndex: 'month', key: 'month', sorter: (a: MonthlyReport, b: MonthlyReport) => a.month.localeCompare(b.month) },
    { title: '区域', dataIndex: 'region', key: 'region', sorter: (a: MonthlyReport, b: MonthlyReport) => a.region.localeCompare(b.region) },
    { title: '总供热量(GJ)', dataIndex: 'totalHeatSupply', key: 'totalHeatSupply', sorter: (a: MonthlyReport, b: MonthlyReport) => a.totalHeatSupply - b.totalHeatSupply },
    { title: '耗煤量(t)', dataIndex: 'totalCoalConsumption', key: 'totalCoalConsumption', sorter: (a: MonthlyReport, b: MonthlyReport) => a.totalCoalConsumption - b.totalCoalConsumption },
    { title: '耗电量(kWh)', dataIndex: 'totalPowerConsumption', key: 'totalPowerConsumption', sorter: (a: MonthlyReport, b: MonthlyReport) => a.totalPowerConsumption - b.totalPowerConsumption },
    { title: '平均供水温度', dataIndex: 'avgSupplyTemp', key: 'avgSupplyTemp', sorter: (a: MonthlyReport, b: MonthlyReport) => a.avgSupplyTemp - b.avgSupplyTemp },
    { title: '平均回水温度', dataIndex: 'avgReturnTemp', key: 'avgReturnTemp', sorter: (a: MonthlyReport, b: MonthlyReport) => a.avgReturnTemp - b.avgReturnTemp },
    { title: '平均室温', dataIndex: 'avgRoomTemp', key: 'avgRoomTemp', sorter: (a: MonthlyReport, b: MonthlyReport) => a.avgRoomTemp - b.avgRoomTemp },
    { title: '室温达标率(%)', dataIndex: 'roomTempPassRate', key: 'roomTempPassRate', sorter: (a: MonthlyReport, b: MonthlyReport) => a.roomTempPassRate - b.roomTempPassRate },
    { title: '告警总数', dataIndex: 'totalAlerts', key: 'totalAlerts', sorter: (a: MonthlyReport, b: MonthlyReport) => a.totalAlerts - b.totalAlerts },
    { title: '平均维修时长(h)', dataIndex: 'avgRepairTime', key: 'avgRepairTime', sorter: (a: MonthlyReport, b: MonthlyReport) => a.avgRepairTime - b.avgRepairTime },
    { title: '维修工单数', dataIndex: 'totalRepairOrders', key: 'totalRepairOrders', sorter: (a: MonthlyReport, b: MonthlyReport) => a.totalRepairOrders - b.totalRepairOrders },
    { title: '工单完成率(%)', dataIndex: 'completedRepairRate', key: 'completedRepairRate', sorter: (a: MonthlyReport, b: MonthlyReport) => a.completedRepairRate - b.completedRepairRate },
  ];

  const summaryRow = useMemo(() => {
    if (filteredReports.length === 0) return null;
    const avg = (fn: (r: MonthlyReport) => number) =>
      Number((filteredReports.reduce((s, r) => s + fn(r), 0) / filteredReports.length).toFixed(1));
    return {
      key: 'summary',
      month: '平均',
      region: '-',
      totalHeatSupply: avg((r) => r.totalHeatSupply),
      totalCoalConsumption: avg((r) => r.totalCoalConsumption),
      totalPowerConsumption: avg((r) => r.totalPowerConsumption),
      avgSupplyTemp: avg((r) => r.avgSupplyTemp),
      avgReturnTemp: avg((r) => r.avgReturnTemp),
      avgRoomTemp: avg((r) => r.avgRoomTemp),
      roomTempPassRate: avg((r) => r.roomTempPassRate),
      totalAlerts: avg((r) => r.totalAlerts),
      avgRepairTime: avg((r) => r.avgRepairTime),
      totalRepairOrders: avg((r) => r.totalRepairOrders),
      completedRepairRate: avg((r) => r.completedRepairRate),
      totalRevenue: avg((r) => r.totalRevenue),
      totalCost: avg((r) => r.totalCost),
      profit: avg((r) => r.profit),
    };
  }, [filteredReports]);

  const tabItems = [
    {
      key: 'operation',
      label: '运行分析',
      children: (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="本月总供热量"
                  value={summaryStats.totalHeat}
                  suffix="GJ"
                  prefix={<FireOutlined style={{ color: '#f5222d' }} />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="平均室温"
                  value={summaryStats.avgRoom.toFixed(1)}
                  suffix="°C"
                  prefix={<HomeOutlined style={{ color: '#52c41a' }} />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="室温达标率"
                  value={summaryStats.passRate.toFixed(1)}
                  suffix="%"
                  prefix={<DashboardOutlined style={{ color: '#1890ff' }} />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="平均维修时长"
                  value={summaryStats.avgRepair.toFixed(1)}
                  suffix="h"
                  prefix={<ToolOutlined style={{ color: '#faad14' }} />}
                />
              </Card>
            </Col>
          </Row>
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col span={24}>
              <Card title="各区域供回水温度趋势">
                <ReactECharts option={supplyTempOption} style={{ height: 320 }} />
              </Card>
            </Col>
          </Row>
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col span={12}>
              <Card title="各区域室温达标率">
                <ReactECharts option={roomTempPassOption} style={{ height: 300 }} />
              </Card>
            </Col>
            <Col span={12}>
              <Card title="各区域告警数量">
                <ReactECharts option={alertCountOption} style={{ height: 300 }} />
              </Card>
            </Col>
          </Row>
        </>
      ),
    },
    {
      key: 'energy',
      label: '能耗分析',
      children: (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col span={24}>
              <Card title="各区域耗煤量趋势">
                <ReactECharts option={coalTrendOption} style={{ height: 320 }} />
              </Card>
            </Col>
          </Row>
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col span={24}>
              <Card title="各区域耗电量趋势">
                <ReactECharts option={powerTrendOption} style={{ height: 320 }} />
              </Card>
            </Col>
          </Row>
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Card title="耗煤量与耗电量相关性">
                <ReactECharts option={scatterOption} style={{ height: 360 }} />
              </Card>
            </Col>
          </Row>
        </>
      ),
    },
    {
      key: 'cost',
      label: '成本分析',
      children: (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col span={24}>
              <Card title="各区域收入、成本、利润">
                <ReactECharts option={revenueCostProfitOption} style={{ height: 320 }} />
              </Card>
            </Col>
          </Row>
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col span={12}>
              <Card title="各区域利润率">
                <ReactECharts option={profitMarginOption} style={{ height: 300 }} />
              </Card>
            </Col>
            <Col span={12}>
              <Card title="收入与成本趋势">
                <ReactECharts option={revenueCostTrendOption} style={{ height: 300 }} />
              </Card>
            </Col>
          </Row>
        </>
      ),
    },
    {
      key: 'comprehensive',
      label: '综合报表',
      children: (
        <Card title="月度综合数据报表">
          <Table
            dataSource={summaryRow ? [...filteredReports as (MonthlyReport & { key?: string })[], summaryRow] : filteredReports}
            columns={tableColumns}
            rowKey={(record) => (record as MonthlyReport & { key?: string }).key || `${record.month}-${record.region}`}
            scroll={{ x: 1600 }}
            pagination={{ pageSize: 10 }}
            size="middle"
            rowClassName={(record) =>
              (record as MonthlyReport & { key?: string }).key === 'summary' ? 'ant-table-row-summary' : ''
            }
          />
        </Card>
      ),
    },
  ];

  return (
    <div style={{ padding: 16 }}>
      <Row gutter={16} style={{ marginBottom: 16 }} align="middle">
        <Col>
          <Select
            value={region}
            onChange={setRegion}
            options={allowedRegionOptions}
            style={{ width: 140 }}
            disabled={userRole === 'region_manager' || userRole === 'station_admin'}
          />
        </Col>
        <Col>
          <MonthPicker
            placeholder="选择月份"
            onChange={(_date, dateString) => setMonth(dateString as string)}
            style={{ width: 160 }}
            allowClear
          />
        </Col>
        <Col>
          <Button icon={<FileExcelOutlined />} onClick={handleExportReport}>
            导出月度运行分析报告
          </Button>
        </Col>
        <Col>
          <Button icon={<DownloadOutlined />} onClick={handleExportCost}>
            导出能耗成本明细
          </Button>
        </Col>
      </Row>

      <Tabs items={tabItems} />
    </div>
  );
};

export default Report;
