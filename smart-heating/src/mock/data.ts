import dayjs from 'dayjs';
import type {
  HeatSourcePlant,
  HeatStation,
  NetworkNode,
  AlertRecord,
  RoomTempData,
  WorkOrder,
  RepairRequest,
  BillingRecord,
  InstallationRequest,
  MonthlyReport,
} from '../types';

const REGIONS = ['朝阳区', '海淀区', '丰台区', '东城区', '西城区'];
const COMMUNITIES: Record<string, string[]> = {
  '朝阳区': ['望京花园', '朝阳新城', '建国里小区', '团结湖北口', '劲松小区'],
  '海淀区': ['中关村南', '清河新城', '西二旗家园', '上地东里', '万柳公寓'],
  '丰台区': ['丰台科技园', '方庄小区', '马家堡东里', '六里桥北', '丽泽家园'],
  '东城区': ['东直门北里', '和平里小区', '建国门南', '北新桥东', '景山东街'],
  '西城区': ['金融街小区', '月坛北里', '西直门南', '广安门内', '牛街东里'],
};

function rand(min: number, max: number, decimals = 1): number {
  return Number((Math.random() * (max - min) + min).toFixed(decimals));
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateBoiler(id: string, idx: number): HeatSourcePlant['boilers'][0] {
  const statuses: HeatSourcePlant['boilers'][0]['status'][] = ['running', 'running', 'running', 'stopped', 'maintenance'];
  const status = pick(statuses);
  return {
    id,
    name: `${idx}号锅炉`,
    status,
    load: status === 'running' ? rand(40, 100) : 0,
    maxLoad: rand(80, 120, 0),
    outWaterTemp: status === 'running' ? rand(85, 115) : 0,
    efficiency: status === 'running' ? rand(85, 96) : 0,
    runningHours: status === 'running' ? randInt(1000, 8000) : 0,
    recommended: status === 'stopped' && Math.random() > 0.5,
  };
}

export function generateHeatSourcePlants(): HeatSourcePlant[] {
  const plants: HeatSourcePlant[] = [];
  REGIONS.forEach((region, rIdx) => {
    const plantCount = randInt(1, 2);
    for (let i = 0; i < plantCount; i++) {
      const id = `HS-${rIdx + 1}-${i + 1}`;
      const boilers = Array.from({ length: randInt(3, 6) }, (_, bIdx) =>
        generateBoiler(`${id}-B${bIdx + 1}`, bIdx + 1)
      );
      const runningBoilers = boilers.filter(b => b.status === 'running');
      plants.push({
        id,
        name: `${region}热源厂${i + 1}号`,
        region,
        status: runningBoilers.length > 0 ? 'running' : 'stopped',
        load: runningBoilers.reduce((s, b) => s + b.load, 0),
        maxLoad: boilers.reduce((s, b) => s + b.maxLoad, 0),
        boilers,
        outWaterTemp: runningBoilers.length > 0 ? rand(85, 115) : 0,
        returnWaterTemp: runningBoilers.length > 0 ? rand(45, 60) : 0,
        outWaterPressure: runningBoilers.length > 0 ? rand(0.8, 1.6) : 0,
        flow: runningBoilers.length > 0 ? rand(200, 800, 0) : 0,
        coalConsumption: runningBoilers.length > 0 ? rand(5, 25, 2) : 0,
        powerConsumption: runningBoilers.length > 0 ? rand(100, 500, 0) : 0,
      });
    }
  });
  return plants;
}

export function generateHeatStations(): HeatStation[] {
  const stations: HeatStation[] = [];
  REGIONS.forEach((region) => {
    COMMUNITIES[region].forEach((community, cIdx) => {
      const id = `ST-${region.substring(0, 1)}-${cIdx + 1}`;
      const statuses: HeatStation['status'][] = ['normal', 'normal', 'normal', 'normal', 'warning', 'fault', 'offline'];
      const status = pick(statuses);
      stations.push({
        id,
        name: `${community}换热站`,
        region,
        community,
        status,
        unmanned: true,
        primarySupplyTemp: rand(80, 110),
        primaryReturnTemp: rand(40, 55),
        primaryPressure: rand(0.6, 1.4),
        primaryFlow: rand(50, 200, 0),
        secondarySupplyTemp: rand(45, 65),
        secondaryReturnTemp: rand(35, 45),
        secondaryPressure: rand(0.3, 0.6),
        secondaryFlow: rand(30, 150, 0),
        heatExchangeEfficiency: rand(85, 98),
        lastMaintenance: dayjs().subtract(randInt(1, 30), 'day').format('YYYY-MM-DD'),
        devices: [
          { id: `${id}-D1`, name: '循环泵1', type: 'pump', status: pick(['normal', 'normal', 'warning', 'fault']), runningHours: randInt(1000, 8000), lastCheck: dayjs().subtract(randInt(1, 7), 'day').format('YYYY-MM-DD') },
          { id: `${id}-D2`, name: '循环泵2', type: 'pump', status: pick(['normal', 'normal', 'fault']), runningHours: randInt(1000, 8000), lastCheck: dayjs().subtract(randInt(1, 7), 'day').format('YYYY-MM-DD') },
          { id: `${id}-D3`, name: '补水泵', type: 'pump', status: pick(['normal', 'normal', 'warning']), runningHours: randInt(500, 3000), lastCheck: dayjs().subtract(randInt(1, 7), 'day').format('YYYY-MM-DD') },
          { id: `${id}-D4`, name: '电动调节阀', type: 'valve', status: pick(['normal', 'normal', 'fault']), runningHours: randInt(2000, 10000), lastCheck: dayjs().subtract(randInt(1, 7), 'day').format('YYYY-MM-DD') },
          { id: `${id}-D5`, name: '板式换热器', type: 'heat_exchanger', status: pick(['normal', 'normal', 'warning']), runningHours: randInt(5000, 20000), lastCheck: dayjs().subtract(randInt(1, 15), 'day').format('YYYY-MM-DD') },
          { id: `${id}-D6`, name: '温度传感器组', type: 'sensor', status: pick(['normal', 'normal', 'fault']), runningHours: randInt(3000, 15000), lastCheck: dayjs().subtract(randInt(1, 7), 'day').format('YYYY-MM-DD') },
          { id: `${id}-D7`, name: 'PLC控制器', type: 'controller', status: pick(['normal', 'normal', 'warning']), runningHours: randInt(5000, 20000), lastCheck: dayjs().subtract(randInt(1, 7), 'day').format('YYYY-MM-DD') },
        ],
      });
    });
  });
  return stations;
}

export function generateNetworkNodes(): NetworkNode[] {
  const nodes: NetworkNode[] = [];
  REGIONS.forEach((region) => {
    for (let i = 0; i < 6; i++) {
      nodes.push({
        id: `PN-${region.substring(0, 1)}-${i + 1}`,
        name: `${region}一次网节点${i + 1}`,
        type: 'primary',
        supplyTemp: rand(85, 110),
        returnTemp: rand(45, 60),
        pressure: rand(0.6, 1.4),
        flow: rand(100, 500, 0),
        status: pick(['normal', 'normal', 'normal', 'warning', 'fault']),
      });
    }
    for (let i = 0; i < 8; i++) {
      nodes.push({
        id: `SN-${region.substring(0, 1)}-${i + 1}`,
        name: `${region}二次网节点${i + 1}`,
        type: 'secondary',
        supplyTemp: rand(45, 65),
        returnTemp: rand(35, 45),
        pressure: rand(0.3, 0.6),
        flow: rand(30, 150, 0),
        status: pick(['normal', 'normal', 'normal', 'warning', 'fault']),
      });
    }
  });
  return nodes;
}

export function generateAlerts(): AlertRecord[] {
  const alerts: AlertRecord[] = [];
  const types: AlertRecord['type'][] = ['pressure', 'temperature', 'flow', 'fault', 'leak'];
  const levels: AlertRecord['level'][] = ['info', 'warning', 'error', 'critical'];
  const suggestions: Record<string, string> = {
    pressure: '建议检查补水系统，调整定压值',
    temperature: '建议调整供水温度设定值，检查换热器效率',
    flow: '建议检查管网阀门开度，排查堵塞',
    fault: '建议立即安排维修人员现场检查',
    leak: '建议关闭相关管段阀门，紧急抢修',
  };

  for (let i = 0; i < 30; i++) {
    const type = pick(types);
    const region = pick(REGIONS);
    const community = pick(COMMUNITIES[region]);
    alerts.push({
      id: `ALT-${String(i + 1).padStart(4, '0')}`,
      type,
      level: pick(levels),
      source: `${community}换热站`,
      sourceId: `ST-${region.substring(0, 1)}-${randInt(1, 5)}`,
      message: `${community}换热站${type === 'pressure' ? '压力' : type === 'temperature' ? '温度' : type === 'flow' ? '流量' : type === 'fault' ? '设备故障' : '管网泄漏'}异常`,
      suggestion: suggestions[type],
      time: dayjs().subtract(randInt(0, 1440), 'minute').format('YYYY-MM-DD HH:mm:ss'),
      status: pick(['pending', 'processing', 'resolved', 'resolved']),
    });
  }
  return alerts.sort((a, b) => dayjs(b.time).unix() - dayjs(a.time).unix());
}

export function generateRoomTempData(): RoomTempData[] {
  const data: RoomTempData[] = [];
  REGIONS.forEach((region) => {
    COMMUNITIES[region].forEach((community, cIdx) => {
      for (let u = 0; u < randInt(5, 15); u++) {
        const currentTemp = rand(16, 26);
        const targetTemp = 20;
        const violationTypes: RoomTempData['violationType'][] = ['none', 'none', 'none', 'none', 'water_drain', 'heat_theft'];
        const violation: RoomTempData['violationType'] = currentTemp < 16 ? pick<RoomTempData['violationType']>(['water_drain', 'none']) : pick(violationTypes);
        data.push({
          id: `RT-${region.substring(0, 1)}-${cIdx + 1}-${u + 1}`,
          userId: `U-${randInt(1000, 9999)}`,
          userName: `${String.fromCharCode(0x4e00 + randInt(0, 200))}${String.fromCharCode(0x4e00 + randInt(0, 200))}`,
          address: `${community}${randInt(1, 20)}号楼${randInt(1, 6)}单元${randInt(101, 1801)}室`,
          stationId: `ST-${region.substring(0, 1)}-${cIdx + 1}`,
          stationName: `${community}换热站`,
          community,
          currentTemp,
          targetTemp,
          status: currentTemp < 18 ? 'low' : currentTemp > 24 ? 'high' : 'normal',
          lastUpdate: dayjs().subtract(randInt(0, 60), 'minute').format('YYYY-MM-DD HH:mm:ss'),
          violationType: violation,
        });
      }
    });
  });
  return data;
}

export function generateWorkOrders(): WorkOrder[] {
  const orders: WorkOrder[] = [];
  const types: WorkOrder['type'][] = ['repair', 'maintenance', 'inspection', 'installation'];
  const statuses: WorkOrder['status'][] = ['pending', 'assigned', 'in_progress', 'completed', 'escalated'];
  const priorities: WorkOrder['priority'][] = ['low', 'medium', 'high', 'urgent'];
  const teams = ['朝阳维修一组', '朝阳维修二组', '海淀维修一组', '海淀维修二组', '丰台维修一组', '东城维修组', '西城维修组'];

  for (let i = 0; i < 40; i++) {
    const region = pick(REGIONS);
    const community = pick(COMMUNITIES[region]);
    const status = pick(statuses);
    const priority = pick(priorities);
    const type = pick(types);
    const createdAt = dayjs().subtract(randInt(0, 7200), 'minute');
    const stationId = `ST-${region.substring(0, 1)}-${randInt(1, 5)}`;

    orders.push({
      id: `WO-${String(i + 1).padStart(4, '0')}`,
      type,
      title: type === 'repair' ? `${community}换热站设备维修` : type === 'maintenance' ? `${community}换热站定期维护` : type === 'inspection' ? `${community}换热站巡检` : `${community}新用户接入`,
      description: `${community}换热站${type === 'repair' ? '设备运行异常，需要维修' : type === 'maintenance' ? '按计划进行定期维护保养' : type === 'inspection' ? '例行巡检' : '新用户报装接入施工'}`,
      status,
      priority,
      source: 'system',
      sourceId: stationId,
      stationId,
      stationName: `${community}换热站`,
      assignee: status !== 'pending' ? `维修员${randInt(1, 20)}` : undefined,
      assigneeTeam: status !== 'pending' ? pick(teams) : undefined,
      createdAt: createdAt.format('YYYY-MM-DD HH:mm:ss'),
      assignedAt: status !== 'pending' ? createdAt.add(randInt(5, 30), 'minute').format('YYYY-MM-DD HH:mm:ss') : undefined,
      completedAt: status === 'completed' ? createdAt.add(randInt(1, 48), 'hour').format('YYYY-MM-DD HH:mm:ss') : undefined,
      escalatedAt: status === 'escalated' ? createdAt.add(2, 'hour').format('YYYY-MM-DD HH:mm:ss') : undefined,
      escalatedTo: status === 'escalated' ? `${region}区域主管` : undefined,
      userRating: status === 'completed' ? randInt(3, 5) : undefined,
      userComment: status === 'completed' ? '维修及时，效果满意' : undefined,
    });
  }
  return orders.sort((a, b) => dayjs(b.createdAt).unix() - dayjs(a.createdAt).unix());
}

export function generateRepairRequests(): RepairRequest[] {
  const requests: RepairRequest[] = [];
  for (let i = 0; i < 20; i++) {
    const region = pick(REGIONS);
    const community = pick(COMMUNITIES[region]);
    const stationId = `ST-${region.substring(0, 1)}-${randInt(1, 5)}`;
    const createdAt = dayjs().subtract(randInt(0, 4320), 'minute');
    const status = pick<RepairRequest['status']>(['pending', 'assigned', 'in_progress', 'completed']);

    requests.push({
      id: `RR-${String(i + 1).padStart(4, '0')}`,
      userId: `U-${randInt(1000, 9999)}`,
      userName: `${String.fromCharCode(0x4e00 + randInt(0, 200))}${String.fromCharCode(0x4e00 + randInt(0, 200))}`,
      address: `${community}${randInt(1, 20)}号楼${randInt(1, 6)}单元${randInt(101, 1801)}室`,
      stationId,
      stationName: `${community}换热站`,
      description: pick(['暖气不热', '管道漏水', '阀门故障', '温度偏低', '有异响', '压力不足']),
      status,
      workOrderId: `WO-${String(randInt(1, 40)).padStart(4, '0')}`,
      createdAt: createdAt.format('YYYY-MM-DD HH:mm:ss'),
      assignee: status !== 'pending' ? `维修员${randInt(1, 20)}` : undefined,
      completedAt: status === 'completed' ? createdAt.add(randInt(1, 48), 'hour').format('YYYY-MM-DD HH:mm:ss') : undefined,
      userRating: status === 'completed' ? randInt(3, 5) : undefined,
      userComment: status === 'completed' ? '处理及时' : undefined,
    });
  }
  return requests.sort((a, b) => dayjs(b.createdAt).unix() - dayjs(a.createdAt).unix());
}

export function generateBillingRecords(): BillingRecord[] {
  const records: BillingRecord[] = [];
  for (let i = 0; i < 50; i++) {
    const region = pick(REGIONS);
    const community = pick(COMMUNITIES[region]);
    const overdueDays = randInt(0, 90);
    const totalAmount = rand(1000, 5000, 2);
    const paidAmount = overdueDays === 0 ? totalAmount : rand(0, totalAmount, 2);
    const isRestricted = overdueDays > 30 && Math.random() > 0.3;

    records.push({
      id: `BL-${String(i + 1).padStart(4, '0')}`,
      userId: `U-${randInt(1000, 9999)}`,
      userName: `${String.fromCharCode(0x4e00 + randInt(0, 200))}${String.fromCharCode(0x4e00 + randInt(0, 200))}`,
      address: `${community}${randInt(1, 20)}号楼${randInt(1, 6)}单元${randInt(101, 1801)}室`,
      stationId: `ST-${region.substring(0, 1)}-${randInt(1, 5)}`,
      area: rand(50, 200, 1),
      unitPrice: 28,
      totalAmount,
      paidAmount,
      overdueDays,
      status: paidAmount >= totalAmount ? 'paid' : paidAmount > 0 ? 'partial' : isRestricted ? 'restricted' : 'overdue',
      lastPaymentDate: paidAmount > 0 ? dayjs().subtract(randInt(1, 60), 'day').format('YYYY-MM-DD') : undefined,
      dueDate: dayjs().subtract(overdueDays, 'day').format('YYYY-MM-DD'),
      valveStatus: isRestricted ? 'closed' : 'open',
    });
  }
  return records;
}

export function generateInstallationRequests(): InstallationRequest[] {
  const requests: InstallationRequest[] = [];
  const statuses: InstallationRequest['status'][] = ['submitted', 'checking', 'design_review', 'construction', 'inspection', 'completed', 'rejected'];

  for (let i = 0; i < 15; i++) {
    const region = pick(REGIONS);
    const community = pick(COMMUNITIES[region]);
    const status = pick(statuses);
    const submittedAt = dayjs().subtract(randInt(1, 60), 'day');
    const stationId = `ST-${region.substring(0, 1)}-${randInt(1, 5)}`;

    requests.push({
      id: `IN-${String(i + 1).padStart(4, '0')}`,
      applicantName: `${String.fromCharCode(0x4e00 + randInt(0, 200))}${String.fromCharCode(0x4e00 + randInt(0, 200))}`,
      phone: `1${randInt(30, 99)}${String(randInt(10000000, 99999999))}`,
      address: `${community}${randInt(1, 20)}号楼${randInt(1, 6)}单元${randInt(101, 1801)}室`,
      area: rand(60, 200, 1),
      heatingType: pick(['radiator', 'floor', 'mixed']),
      status,
      submittedAt: submittedAt.format('YYYY-MM-DD HH:mm:ss'),
      recommendedStation: status !== 'submitted' ? stationId : undefined,
      recommendedStationName: status !== 'submitted' ? `${community}换热站` : undefined,
      checkResult: ['design_review', 'construction', 'inspection', 'completed'].includes(status) ? 'pass' : status === 'rejected' ? 'fail' : undefined,
      checkNote: status === 'rejected' ? '管网容量不足，暂无法接入' : undefined,
      designApproved: ['construction', 'inspection', 'completed'].includes(status) ? true : undefined,
      designNote: ['construction', 'inspection', 'completed'].includes(status) ? '设计方案审核通过' : undefined,
      constructionCompleted: ['inspection', 'completed'].includes(status) ? true : undefined,
      constructionNote: ['inspection', 'completed'].includes(status) ? '施工已完成' : undefined,
      inspectionPassed: status === 'completed' ? true : undefined,
      inspectionNote: status === 'completed' ? '验收合格，已接入供暖系统' : undefined,
    });
  }
  return requests.sort((a, b) => dayjs(b.submittedAt).unix() - dayjs(a.submittedAt).unix());
}

export function generateMonthlyReports(): MonthlyReport[] {
  const reports: MonthlyReport[] = [];
  REGIONS.forEach((region) => {
    for (let m = 1; m <= 6; m++) {
      reports.push({
        month: `2026-${String(m).padStart(2, '0')}`,
        region,
        totalHeatSupply: rand(5000, 20000, 0),
        totalCoalConsumption: rand(1000, 5000, 0),
        totalPowerConsumption: rand(50000, 200000, 0),
        avgSupplyTemp: rand(85, 105),
        avgReturnTemp: rand(45, 55),
        avgRoomTemp: rand(19, 22),
        roomTempPassRate: rand(88, 99),
        totalAlerts: randInt(10, 100),
        avgRepairTime: rand(1, 8),
        totalRepairOrders: randInt(20, 100),
        completedRepairRate: rand(85, 99),
        totalRevenue: rand(500000, 2000000, 0),
        totalCost: rand(300000, 1500000, 0),
        profit: rand(100000, 500000, 0),
      });
    }
  });
  return reports;
}

export function getDashboardSummary() {
  const stations = generateHeatStations();
  const roomData = generateRoomTempData();
  const alerts = generateAlerts();
  const billing = generateBillingRecords();

  return {
    totalPlants: 8,
    runningPlants: 7,
    totalLoad: rand(400, 800, 0),
    maxLoad: 1200,
    totalStations: stations.length,
    normalStations: stations.filter(s => s.status === 'normal').length,
    warningStations: stations.filter(s => s.status === 'warning').length,
    faultStations: stations.filter(s => s.status === 'fault').length,
    offlineStations: stations.filter(s => s.status === 'offline').length,
    roomTempPassRate: ((roomData.filter(r => r.status === 'normal').length / roomData.length) * 100).toFixed(1),
    avgRepairTime: rand(2.5, 6.0),
    overdueCount: billing.filter(b => b.overdueDays > 30).length,
    totalOverdueAmount: billing.filter(b => b.overdueDays > 30).reduce((s, b) => s + (b.totalAmount - b.paidAmount), 0),
    pendingAlerts: alerts.filter(a => a.status === 'pending').length,
    avgSupplyTemp: rand(85, 100),
    avgReturnTemp: rand(45, 55),
  };
}

export const MOCK_USERS = [
  { id: 'U-001', name: '张三', role: 'user' as const, region: '', stationIds: [] as string[] },
  { id: 'U-002', name: '李管理', role: 'station_admin' as const, region: '朝阳区', stationIds: ['ST-朝-1', 'ST-朝-2', 'ST-朝-3', 'ST-朝-4', 'ST-朝-5'] },
  { id: 'U-003', name: '王主管', role: 'region_manager' as const, region: '海淀区', stationIds: [] as string[] },
  { id: 'U-004', name: '赵总', role: 'company_admin' as const, region: '', stationIds: [] as string[] },
];
