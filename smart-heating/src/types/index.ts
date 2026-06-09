export type UserRole = 'user' | 'station_admin' | 'region_manager' | 'company_admin';

export interface UserInfo {
  id: string;
  name: string;
  role: UserRole;
  region?: string;
  stationIds?: string[];
}

export interface HeatSourcePlant {
  id: string;
  name: string;
  region: string;
  status: 'running' | 'stopped' | 'maintenance';
  load: number;
  maxLoad: number;
  boilers: Boiler[];
  outWaterTemp: number;
  returnWaterTemp: number;
  outWaterPressure: number;
  flow: number;
  coalConsumption: number;
  powerConsumption: number;
}

export interface Boiler {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'maintenance' | 'fault';
  load: number;
  maxLoad: number;
  outWaterTemp: number;
  efficiency: number;
  runningHours: number;
  recommended: boolean;
}

export interface HeatStation {
  id: string;
  name: string;
  region: string;
  community: string;
  status: 'normal' | 'warning' | 'fault' | 'offline';
  unmanned: boolean;
  primarySupplyTemp: number;
  primaryReturnTemp: number;
  primaryPressure: number;
  primaryFlow: number;
  secondarySupplyTemp: number;
  secondaryReturnTemp: number;
  secondaryPressure: number;
  secondaryFlow: number;
  heatExchangeEfficiency: number;
  lastMaintenance: string;
  devices: Device[];
}

export interface Device {
  id: string;
  name: string;
  type: 'pump' | 'valve' | 'heat_exchanger' | 'sensor' | 'controller';
  status: 'normal' | 'warning' | 'fault';
  runningHours: number;
  lastCheck: string;
}

export interface NetworkNode {
  id: string;
  name: string;
  type: 'primary' | 'secondary';
  supplyTemp: number;
  returnTemp: number;
  pressure: number;
  flow: number;
  status: 'normal' | 'warning' | 'fault';
}

export interface AlertRecord {
  id: string;
  type: 'pressure' | 'temperature' | 'flow' | 'fault' | 'leak' | 'other';
  level: 'info' | 'warning' | 'error' | 'critical';
  source: string;
  sourceId: string;
  message: string;
  suggestion: string;
  time: string;
  status: 'pending' | 'processing' | 'resolved';
}

export interface RoomTempData {
  id: string;
  userId: string;
  userName: string;
  address: string;
  stationId: string;
  stationName: string;
  community: string;
  currentTemp: number;
  targetTemp: number;
  status: 'normal' | 'low' | 'high' | 'offline';
  lastUpdate: string;
  violationType?: 'none' | 'water_drain' | 'heat_theft' | 'valve_tampering';
}

export interface WorkOrder {
  id: string;
  type: 'repair' | 'maintenance' | 'inspection' | 'installation';
  title: string;
  description: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'escalated';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  source: string;
  sourceId: string;
  stationId: string;
  stationName: string;
  assignee?: string;
  assigneeTeam?: string;
  createdAt: string;
  assignedAt?: string;
  completedAt?: string;
  escalatedAt?: string;
  escalatedTo?: string;
  userRating?: number;
  userComment?: string;
}

export interface RepairRequest {
  id: string;
  userId: string;
  userName: string;
  address: string;
  stationId: string;
  stationName: string;
  description: string;
  images?: string[];
  status: 'pending' | 'assigned' | 'in_progress' | 'completed';
  workOrderId: string;
  createdAt: string;
  assignee?: string;
  completedAt?: string;
  userRating?: number;
  userComment?: string;
}

export interface BillingRecord {
  id: string;
  userId: string;
  userName: string;
  address: string;
  stationId: string;
  area: number;
  unitPrice: number;
  totalAmount: number;
  paidAmount: number;
  overdueDays: number;
  status: 'paid' | 'partial' | 'overdue' | 'restricted';
  lastPaymentDate?: string;
  dueDate: string;
  valveStatus: 'open' | 'closed';
}

export interface InstallationRequest {
  id: string;
  applicantName: string;
  phone: string;
  address: string;
  area: number;
  heatingType: 'radiator' | 'floor' | 'mixed';
  status: 'submitted' | 'checking' | 'design_review' | 'construction' | 'inspection' | 'completed' | 'rejected';
  submittedAt: string;
  recommendedStation?: string;
  recommendedStationName?: string;
  checkResult?: 'pass' | 'fail';
  checkNote?: string;
  designApproved?: boolean;
  designNote?: string;
  constructionCompleted?: boolean;
  constructionNote?: string;
  inspectionPassed?: boolean;
  inspectionNote?: string;
  documents?: string[];
}

export interface MonthlyReport {
  month: string;
  region: string;
  totalHeatSupply: number;
  totalCoalConsumption: number;
  totalPowerConsumption: number;
  avgSupplyTemp: number;
  avgReturnTemp: number;
  avgRoomTemp: number;
  roomTempPassRate: number;
  totalAlerts: number;
  avgRepairTime: number;
  totalRepairOrders: number;
  completedRepairRate: number;
  totalRevenue: number;
  totalCost: number;
  profit: number;
}

export interface FilterParams {
  region?: string;
  community?: string;
  stationId?: string;
  dateRange?: [string, string];
}

export const ROLE_LABELS: Record<UserRole, string> = {
  user: '普通用户',
  station_admin: '换热站管理员',
  region_manager: '区域主管',
  company_admin: '热力公司管理员',
};

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  user: ['view_own_data', 'submit_repair', 'view_billing', 'submit_installation'],
  station_admin: ['view_own_data', 'submit_repair', 'view_billing', 'submit_installation', 'manage_station', 'view_station_alerts', 'assign_work_orders'],
  region_manager: ['view_own_data', 'submit_repair', 'view_billing', 'submit_installation', 'manage_station', 'view_station_alerts', 'assign_work_orders', 'view_region_data', 'manage_region_stations', 'adjust_dispatch'],
  company_admin: ['view_own_data', 'submit_repair', 'view_billing', 'submit_installation', 'manage_station', 'view_station_alerts', 'assign_work_orders', 'view_region_data', 'manage_region_stations', 'adjust_dispatch', 'view_all_data', 'manage_all_stations', 'adjust_all_dispatch', 'export_reports', 'manage_users'],
};
