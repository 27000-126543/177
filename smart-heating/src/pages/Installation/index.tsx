declare global {
  interface Window {
    __newRoomData?: Array<{id:string;userId:string;userName:string;address:string;stationId:string;stationName:string;community:string;currentTemp:number;targetTemp:number;status:string;lastUpdate:string}>;
    __newBilling?: Array<{id:string;userId:string;userName:string;address:string;stationId:string;area:number;unitPrice:number;totalAmount:number;paidAmount:number;overdueDays:number;status:string;dueDate:string;valveStatus:string}>;
  }
}

import { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Table, Tag, Button, Modal, Descriptions, Select, Input, Form, message, Steps, Statistic, Result, Upload, Radio, Tabs, InputNumber, Spin } from 'antd';
import {
  FileAddOutlined,
  AuditOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  SearchOutlined,
  EyeOutlined,
  SafetyCertificateOutlined,
  BuildOutlined,
  ThunderboltOutlined,
  UploadOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { generateInstallationRequests } from '../../mock/data';
import type { InstallationRequest } from '../../types';

if (!window.__newRoomData) window.__newRoomData = [];
if (!window.__newBilling) window.__newBilling = [];

const STORAGE_KEY = 'heating_installation_data';

const STATUS_CONFIG: Record<InstallationRequest['status'], { color: string; text: string }> = {
  submitted: { color: 'blue', text: '已提交' },
  checking: { color: 'cyan', text: '条件校验' },
  design_review: { color: 'orange', text: '设计审核' },
  construction: { color: 'geekblue', text: '施工中' },
  inspection: { color: 'purple', text: '待验收' },
  completed: { color: 'green', text: '已完成' },
  rejected: { color: 'red', text: '已驳回' },
};

const HEATING_TYPE_MAP: Record<string, string> = {
  radiator: '散热器',
  floor: '地暖',
  mixed: '混合',
};

const PROCESS_STEPS = [
  { title: '提交申请', description: '在线填写报装资料' },
  { title: '接入条件校验', description: '自动校验管网容量与接入条件' },
  { title: '设计审核', description: '审核供热设计方案' },
  { title: '施工', description: '现场施工安装' },
  { title: '验收接入', description: '验收合格后正式接入' },
];

const STATUS_STEP_INDEX: Record<InstallationRequest['status'], number> = {
  submitted: 0,
  checking: 1,
  design_review: 2,
  construction: 3,
  inspection: 4,
  completed: 5,
  rejected: 1,
};

const statusOptions = [
  { value: 'all', label: '全部状态' },
  { value: 'submitted', label: '已提交' },
  { value: 'checking', label: '条件校验' },
  { value: 'design_review', label: '设计审核' },
  { value: 'construction', label: '施工中' },
  { value: 'inspection', label: '待验收' },
  { value: 'completed', label: '已完成' },
  { value: 'rejected', label: '已驳回' },
];

function Installation() {
  const [data, setDataRaw] = useState<InstallationRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<InstallationRequest | null>(null);
  const [activeTab, setActiveTab] = useState('list');
  const [form] = Form.useForm();
  const [verifyState, setVerifyState] = useState<'idle' | 'verifying' | 'passed' | 'failed'>('idle');
  const [reviewForms, setReviewForms] = useState<Record<string, { result?: string; note?: string }>>({});
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [constructionForms, setConstructionForms] = useState<Record<string, { manager?: string; startDate?: string; endDate?: string; attachments?: string[] }>>({});

  const setData = useCallback((updater: InstallationRequest[] | ((prev: InstallationRequest[]) => InstallationRequest[])) => {
    setDataRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as InstallationRequest[];
        setDataRaw(parsed);
        return;
      }
    } catch {}
    const initialData = generateInstallationRequests().map(d =>
      d.status === 'submitted'
        ? { ...d, status: 'checking' as const, checkResult: 'pass' as const, checkNote: '接入条件校验通过，管网容量充足', recommendedStation: 'ST-朝-1', recommendedStationName: '望京花园换热站' }
        : d
    );
    setDataRaw(initialData);
  }, []);

  const filteredData = data.filter(item => {
    const matchStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchSearch = !searchText || item.applicantName.includes(searchText) || item.address.includes(searchText) || item.id.includes(searchText);
    return matchStatus && matchSearch;
  });

  const totalCount = data.length;
  const pendingCount = data.filter(d => d.status === 'submitted' || d.status === 'checking' || d.status === 'design_review').length;
  const constructionCount = data.filter(d => d.status === 'construction').length;
  const completedCount = data.filter(d => d.status === 'completed').length;
  const rejectedCount = data.filter(d => d.status === 'rejected').length;

  const handleView = (record: InstallationRequest) => {
    setSelectedRecord(record);
    setDetailModalVisible(true);
  };

  const handleNewSubmit = () => {
    form.validateFields().then(() => {
      setVerifyState('verifying');
      setTimeout(() => {
        const passed = Math.random() > 0.2;
        setVerifyState(passed ? 'passed' : 'failed');
      }, 2000);
    });
  };

  const handleFinalSubmit = () => {
    const values = form.getFieldsValue();
    const newRequest: InstallationRequest = {
      id: `IN-${String(data.length + 1).padStart(4, '0')}`,
      applicantName: values.applicantName,
      phone: values.phone,
      address: values.address,
      area: values.area,
      heatingType: values.heatingType,
      status: 'checking',
      checkResult: 'pass',
      checkNote: '接入条件校验通过，管网容量充足',
      recommendedStation: 'ST-朝-1',
      recommendedStationName: '望京花园换热站',
      submittedAt: new Date().toLocaleString('zh-CN').replace(/\//g, '-'),
      documents: uploadedFiles.length > 0 ? [...uploadedFiles] : undefined,
    };
    setData(prev => [newRequest, ...prev]);
    message.success('报装申请已提交成功');
    form.resetFields();
    setVerifyState('idle');
    setUploadedFiles([]);
    setActiveTab('list');
  };

  const handleReviewSubmit = (record: InstallationRequest) => {
    const formVal = reviewForms[record.id];
    if (!formVal?.result) {
      message.warning('请选择审核结果');
      return;
    }

    if (record.status === 'inspection' && formVal.result === 'pass') {
      if (!window.__newRoomData) window.__newRoomData = [];
      if (!window.__newBilling) window.__newBilling = [];
      window.__newRoomData.push({
        id: 'room-' + record.id,
        userId: 'U-' + record.id,
        userName: record.applicantName,
        address: record.address,
        stationId: record.recommendedStation || 'ST-朝-1',
        stationName: record.recommendedStationName || '望京花园换热站',
        community: '新接入用户',
        currentTemp: 20,
        targetTemp: 20,
        status: 'normal',
        lastUpdate: new Date().toLocaleString('zh-CN'),
      });
      window.__newBilling.push({
        id: 'bill-' + record.id,
        userId: 'U-' + record.id,
        userName: record.applicantName,
        address: record.address,
        stationId: record.recommendedStation || 'ST-朝-1',
        area: record.area,
        unitPrice: 28,
        totalAmount: record.area * 28,
        paidAmount: 0,
        overdueDays: 0,
        status: 'overdue',
        dueDate: new Date(Date.now() + 30 * 86400000).toLocaleDateString('zh-CN'),
        valveStatus: 'open',
      });
    }

    const cForm = constructionForms[record.id];
    const constructionUpdate = record.status === 'construction' && cForm ? {
      constructionManager: cForm.manager,
      constructionStartDate: cForm.startDate,
      constructionEndDate: cForm.endDate,
      constructionAttachments: cForm.attachments,
    } : {};

    setData(prev => prev.map(d => {
      if (d.id !== record.id) return d;
      if (record.status === 'checking') {
        return {
          ...d,
          checkResult: formVal.result === 'pass' ? 'pass' as const : 'fail' as const,
          checkNote: formVal.note,
          status: formVal.result === 'pass' ? 'design_review' as const : 'rejected' as const,
        };
      }
      if (record.status === 'design_review') {
        return {
          ...d,
          designApproved: formVal.result === 'approve',
          designNote: formVal.note,
          status: formVal.result === 'approve' ? 'construction' as const : 'rejected' as const,
        };
      }
      if (record.status === 'construction') {
        return {
          ...d,
          ...constructionUpdate,
          constructionCompleted: formVal.result === 'complete',
          constructionNote: formVal.note,
          status: formVal.result === 'complete' ? 'inspection' as const : 'construction' as const,
        };
      }
      if (record.status === 'inspection') {
        return {
          ...d,
          inspectionPassed: formVal.result === 'pass',
          inspectionNote: formVal.note,
          status: formVal.result === 'pass' ? 'completed' as const : 'construction' as const,
        };
      }
      return d;
    }));
    message.success('审核已提交');
  };

  const reviewData = data.filter(d => ['checking', 'design_review', 'construction', 'inspection'].includes(d.status));

  const trendChartOption = {
    tooltip: { trigger: 'axis' as const },
    legend: { data: ['已提交', '条件校验', '设计审核', '施工中', '已完成', '已驳回'] },
    grid: { left: 60, right: 20, top: 40, bottom: 30 },
    xAxis: {
      type: 'category' as const,
      data: ['1月', '2月', '3月', '4月', '5月', '6月'],
    },
    yAxis: { type: 'value' as const, name: '申请数' },
    series: [
      { name: '已提交', type: 'bar' as const, stack: 'total', data: [5, 3, 7, 4, 6, 2], itemStyle: { color: '#1890ff' } },
      { name: '条件校验', type: 'bar' as const, stack: 'total', data: [2, 1, 3, 2, 1, 0], itemStyle: { color: '#13c2c2' } },
      { name: '设计审核', type: 'bar' as const, stack: 'total', data: [1, 2, 2, 1, 2, 1], itemStyle: { color: '#fa8c16' } },
      { name: '施工中', type: 'bar' as const, stack: 'total', data: [3, 2, 4, 2, 3, 1], itemStyle: { color: '#2f54eb' } },
      { name: '已完成', type: 'bar' as const, stack: 'total', data: [8, 6, 10, 7, 9, 4], itemStyle: { color: '#52c41a' } },
      { name: '已驳回', type: 'bar' as const, stack: 'total', data: [1, 0, 2, 1, 0, 1], itemStyle: { color: '#f5222d' } },
    ],
  };

  const listColumns = [
    { title: '申请编号', dataIndex: 'id', key: 'id', width: 120 },
    { title: '申请人', dataIndex: 'applicantName', key: 'applicantName', width: 90 },
    { title: '电话', dataIndex: 'phone', key: 'phone', width: 130 },
    { title: '地址', dataIndex: 'address', key: 'address', ellipsis: true },
    {
      title: '面积(m²)',
      dataIndex: 'area',
      key: 'area',
      width: 90,
      render: (v: number) => v,
    },
    {
      title: '供暖方式',
      dataIndex: 'heatingType',
      key: 'heatingType',
      width: 90,
      render: (v: string) => <Tag>{HEATING_TYPE_MAP[v]}</Tag>,
    },
    { title: '申请时间', dataIndex: 'submittedAt', key: 'submittedAt', width: 160 },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: InstallationRequest['status']) => (
        <Tag color={STATUS_CONFIG[status].color}>{STATUS_CONFIG[status].text}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      render: (_: unknown, record: InstallationRequest) => (
        <div style={{ display: 'flex', gap: 4 }}>
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleView(record)}>查看</Button>
          {(record.status === 'submitted' || record.status === 'checking') && (
            <Button size="small" type="primary" icon={<AuditOutlined />} onClick={() => handleView(record)}>审核</Button>
          )}
          {record.status === 'design_review' && (
            <Button size="small" type="primary" icon={<SafetyCertificateOutlined />} onClick={() => handleView(record)}>设计审核</Button>
          )}
          {record.status === 'construction' && (
            <Button size="small" type="primary" icon={<BuildOutlined />} onClick={() => handleView(record)}>施工完成</Button>
          )}
          {record.status === 'inspection' && (
            <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => handleView(record)}>施工验收</Button>
          )}
        </div>
      ),
    },
  ];

  const reviewColumns = [
    { title: '申请编号', dataIndex: 'id', key: 'id', width: 120 },
    { title: '申请人', dataIndex: 'applicantName', key: 'applicantName', width: 90 },
    { title: '地址', dataIndex: 'address', key: 'address', ellipsis: true },
    {
      title: '当前阶段',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: InstallationRequest['status']) => (
        <Tag color={STATUS_CONFIG[status].color}>{STATUS_CONFIG[status].text}</Tag>
      ),
    },
    {
      title: '资料',
      dataIndex: 'documents',
      key: 'documents',
      width: 70,
      render: (documents?: string[]) => documents && documents.length > 0 ? <Tag color="blue">{documents.length}</Tag> : '-',
    },
    {
      title: '审核操作',
      key: 'action',
      width: 600,
      render: (_: unknown, record: InstallationRequest) => {
        const formData = reviewForms[record.id] || {};
        const radioOptions = record.status === 'checking'
          ? [{ label: '通过', value: 'pass' }, { label: '不通过', value: 'fail' }]
          : record.status === 'design_review'
            ? [{ label: '批准', value: 'approve' }, { label: '驳回', value: 'reject' }]
            : record.status === 'construction'
              ? [{ label: '施工完成', value: 'complete' }, { label: '继续施工', value: 'continue' }]
              : [{ label: '验收通过', value: 'pass' }, { label: '验收不通过', value: 'fail' }];
        const cFormData = constructionForms[record.id] || {};
        return (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
            <Radio.Group
              size="small"
              options={radioOptions}
              value={formData.result}
              onChange={e => setReviewForms({ ...reviewForms, [record.id]: { ...formData, result: e.target.value } })}
            />
            <Input
              size="small"
              placeholder="审核意见"
              style={{ width: 140 }}
              value={formData.note}
              onChange={e => setReviewForms({ ...reviewForms, [record.id]: { ...formData, note: e.target.value } })}
            />
            <Button size="small" type="primary" onClick={() => handleReviewSubmit(record)}>提交审核</Button>
            {record.documents && record.documents.length > 0 && (
              <Button size="small" icon={<EyeOutlined />} onClick={() => handleView(record)}>查看资料</Button>
            )}
            {record.status === 'construction' && (
              <Button size="small" type="primary" icon={<BuildOutlined />} onClick={() => {
                const cForm2 = constructionForms[record.id];
                const cUpdate = cForm2 ? {
                  constructionManager: cForm2.manager,
                  constructionStartDate: cForm2.startDate,
                  constructionEndDate: cForm2.endDate,
                  constructionAttachments: cForm2.attachments,
                } : {};
                setData(prev => prev.map(d => d.id !== record.id ? d : {
                  ...d,
                  ...cUpdate,
                  constructionCompleted: true,
                  status: 'inspection' as const,
                }));
                message.success('施工已完成');
              }}>施工完成</Button>
            )}
            {record.status === 'construction' && (
              <div style={{ width: '100%', display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4, paddingTop: 4, borderTop: '1px dashed #d9d9d9' }}>
                <Input
                  size="small"
                  placeholder="施工负责人"
                  style={{ width: 120 }}
                  value={cFormData.manager}
                  onChange={e => setConstructionForms({ ...constructionForms, [record.id]: { ...cFormData, manager: e.target.value } })}
                />
                <Input
                  size="small"
                  placeholder="开工日期"
                  style={{ width: 120 }}
                  value={cFormData.startDate}
                  onChange={e => setConstructionForms({ ...constructionForms, [record.id]: { ...cFormData, startDate: e.target.value } })}
                />
                <Input
                  size="small"
                  placeholder="完工日期"
                  style={{ width: 120 }}
                  value={cFormData.endDate}
                  onChange={e => setConstructionForms({ ...constructionForms, [record.id]: { ...cFormData, endDate: e.target.value } })}
                />
                <Upload
                  beforeUpload={(file) => {
                    setConstructionForms({
                      ...constructionForms,
                      [record.id]: { ...cFormData, attachments: [...(cFormData.attachments || []), file.name] },
                    });
                    return false;
                  }}
                  onRemove={(file) => {
                    setConstructionForms({
                      ...constructionForms,
                      [record.id]: { ...cFormData, attachments: (cFormData.attachments || []).filter(f => f !== file.name) },
                    });
                  }}
                  fileList={(cFormData.attachments || []).map((name, idx) => ({ uid: String(idx), name, status: 'done' as const }))}
                >
                  <Button size="small" icon={<UploadOutlined />}>上传附件</Button>
                </Upload>
              </div>
            )}
          </div>
        );
      },
    },
  ];

  const recommendedStation = verifyState === 'passed'
    ? { name: '望京花园换热站', distance: '1.2km', loadRate: '68%' }
    : null;

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={5}>
          <Card size="small">
            <Statistic title="总申请数" value={totalCount} prefix={<FileAddOutlined style={{ color: '#1890ff' }} />} />
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small">
            <Statistic title="待审核" value={pendingCount} prefix={<ClockCircleOutlined style={{ color: '#fa8c16' }} />} valueStyle={{ color: '#fa8c16' }} />
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small">
            <Statistic title="施工中" value={constructionCount} prefix={<BuildOutlined style={{ color: '#2f54eb' }} />} valueStyle={{ color: '#2f54eb' }} />
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small">
            <Statistic title="已完成" value={completedCount} prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="已驳回" value={rejectedCount} prefix={<CloseCircleOutlined style={{ color: '#f5222d' }} />} valueStyle={{ color: '#f5222d' }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col>
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            options={statusOptions}
            style={{ width: 140 }}
          />
        </Col>
        <Col>
          <Input
            placeholder="搜索申请人/地址/编号"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            style={{ width: 240 }}
            allowClear
          />
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={18}>
          <Card>
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={[
                {
                  key: 'list',
                  label: '报装列表',
                  children: (
                    <Table
                      dataSource={filteredData}
                      columns={listColumns}
                      rowKey="id"
                      size="small"
                      pagination={{ pageSize: 8 }}
                    />
                  ),
                },
                {
                  key: 'new',
                  label: '新增报装',
                  children: (
                    <div style={{ maxWidth: 600 }}>
                      {verifyState === 'idle' && (
                        <Form form={form} layout="vertical">
                          <Form.Item name="applicantName" label="申请人" rules={[{ required: true, message: '请输入申请人' }]}>
                            <Input />
                          </Form.Item>
                          <Form.Item name="phone" label="联系电话" rules={[{ required: true, message: '请输入联系电话' }]}>
                            <Input />
                          </Form.Item>
                          <Form.Item name="address" label="地址" rules={[{ required: true, message: '请输入地址' }]}>
                            <Input />
                          </Form.Item>
                          <Form.Item name="area" label="供暖面积" rules={[{ required: true, message: '请输入供暖面积' }]}>
                            <InputNumber style={{ width: '100%' }} addonAfter="m²" min={1} />
                          </Form.Item>
                          <Form.Item name="heatingType" label="供暖方式" rules={[{ required: true, message: '请选择供暖方式' }]}>
                            <Radio.Group>
                              <Radio value="radiator">散热器</Radio>
                              <Radio value="floor">地暖</Radio>
                              <Radio value="mixed">混合</Radio>
                            </Radio.Group>
                          </Form.Item>
                          <Form.Item name="documents" label="资料上传">
                            <Upload
                              listType="text"
                              beforeUpload={(file) => {
                                setUploadedFiles(prev => [...prev, file.name]);
                                return false;
                              }}
                              onRemove={(file) => {
                                setUploadedFiles(prev => prev.filter(f => f !== file.name));
                              }}
                            >
                              <Button icon={<UploadOutlined />}>上传身份证明/房产证明</Button>
                            </Upload>
                          </Form.Item>
                          <Form.Item>
                            <Button type="primary" icon={<ThunderboltOutlined />} onClick={handleNewSubmit}>
                              提交并校验接入条件
                            </Button>
                          </Form.Item>
                        </Form>
                      )}
                      {verifyState === 'verifying' && (
                        <div style={{ textAlign: 'center', padding: '60px 0' }}>
                          <Spin size="large" />
                          <p style={{ marginTop: 24, fontSize: 16, color: '#1890ff' }}>系统正在校验接入条件...</p>
                        </div>
                      )}
                      {verifyState === 'passed' && recommendedStation && (
                        <Result
                          status="success"
                          title="接入条件校验通过"
                          subTitle={
                            <div>
                              <p>推荐换热站：<strong>{recommendedStation.name}</strong>（距离最近，当前负荷率{recommendedStation.loadRate}，可接入）</p>
                            </div>
                          }
                          extra={<Button type="primary" onClick={handleFinalSubmit}>提交申请</Button>}
                        />
                      )}
                      {verifyState === 'failed' && (
                        <Result
                          status="error"
                          title="接入条件不满足"
                          subTitle="当前管网容量不足或距离过远，暂无法接入，请稍后再试或联系客服"
                          extra={<Button onClick={() => setVerifyState('idle')}>返回修改</Button>}
                        />
                      )}
                    </div>
                  ),
                },
                {
                  key: 'review',
                  label: '审核管理',
                  children: (
                    <Table
                      dataSource={reviewData}
                      columns={reviewColumns}
                      rowKey="id"
                      size="small"
                      pagination={{ pageSize: 8 }}
                    />
                  ),
                },
              ]}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card title={<><HomeOutlined /> 报装流程说明</>}>
            <Steps
              direction="vertical"
              size="small"
              current={-1}
              items={PROCESS_STEPS.map((step, idx) => ({
                title: step.title,
                description: step.description,
                icon: <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: '50%', background: '#1890ff', color: '#fff', fontSize: 12 }}>{idx + 1}</span>,
              }))}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="报装申请趋势">
            <ReactECharts option={trendChartOption} style={{ height: 300 }} />
          </Card>
        </Col>
      </Row>

      <Modal
        title="报装详情"
        open={detailModalVisible}
        onCancel={() => { setDetailModalVisible(false); setSelectedRecord(null); }}
        footer={null}
        width={720}
      >
        {selectedRecord && (
          <div>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 24 }}>
              <Descriptions.Item label="申请编号">{selectedRecord.id}</Descriptions.Item>
              <Descriptions.Item label="申请人">{selectedRecord.applicantName}</Descriptions.Item>
              <Descriptions.Item label="联系电话">{selectedRecord.phone}</Descriptions.Item>
              <Descriptions.Item label="地址" span={2}>{selectedRecord.address}</Descriptions.Item>
              <Descriptions.Item label="供暖面积">{selectedRecord.area} m²</Descriptions.Item>
              <Descriptions.Item label="供暖方式">{HEATING_TYPE_MAP[selectedRecord.heatingType]}</Descriptions.Item>
              <Descriptions.Item label="申请时间" span={2}>{selectedRecord.submittedAt}</Descriptions.Item>
              <Descriptions.Item label="推荐换热站" span={2}>
                {selectedRecord.recommendedStationName || '-'}
              </Descriptions.Item>
              {selectedRecord.checkResult && (
                <Descriptions.Item label="校验结果" span={2}>
                  <Tag color={selectedRecord.checkResult === 'pass' ? 'green' : 'red'}>
                    {selectedRecord.checkResult === 'pass' ? '通过' : '不通过'}
                  </Tag>
                  {selectedRecord.checkNote}
                </Descriptions.Item>
              )}
              {selectedRecord.designApproved !== undefined && (
                <Descriptions.Item label="设计审核" span={2}>
                  <Tag color={selectedRecord.designApproved ? 'green' : 'red'}>
                    {selectedRecord.designApproved ? '批准' : '驳回'}
                  </Tag>
                  {selectedRecord.designNote}
                </Descriptions.Item>
              )}
              {selectedRecord.inspectionPassed !== undefined && (
                <Descriptions.Item label="验收结果" span={2}>
                  <Tag color={selectedRecord.inspectionPassed ? 'green' : 'red'}>
                    {selectedRecord.inspectionPassed ? '验收通过' : '验收不通过'}
                  </Tag>
                  {selectedRecord.inspectionNote}
                </Descriptions.Item>
              )}
              {selectedRecord.constructionCompleted !== undefined && (
                <Descriptions.Item label="施工状态" span={2}>
                  <Tag color={selectedRecord.constructionCompleted ? 'green' : 'blue'}>
                    {selectedRecord.constructionCompleted ? '施工完成' : '施工中'}
                  </Tag>
                  {selectedRecord.constructionNote}
                </Descriptions.Item>
              )}
              {(selectedRecord.constructionManager || selectedRecord.constructionStartDate || selectedRecord.constructionEndDate) && (
                <Descriptions.Item label="施工详情" span={2}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {selectedRecord.constructionManager && <span>负责人：{selectedRecord.constructionManager}</span>}
                    {selectedRecord.constructionStartDate && <span>开工日期：{selectedRecord.constructionStartDate}</span>}
                    {selectedRecord.constructionEndDate && <span>完工日期：{selectedRecord.constructionEndDate}</span>}
                  </div>
                </Descriptions.Item>
              )}
              {selectedRecord.constructionAttachments && selectedRecord.constructionAttachments.length > 0 && (
                <Descriptions.Item label="施工附件" span={2}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {selectedRecord.constructionAttachments.map((doc, idx) => (
                      <Tag key={idx} icon={<FileAddOutlined />} color="blue">{doc}</Tag>
                    ))}
                  </div>
                </Descriptions.Item>
              )}
              {selectedRecord.documents && selectedRecord.documents.length > 0 && (
                <Descriptions.Item label="申请资料" span={2}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {selectedRecord.documents.map((doc, idx) => (
                      <Tag key={idx} icon={<FileAddOutlined />} color="blue">{doc}</Tag>
                    ))}
                  </div>
                </Descriptions.Item>
              )}
            </Descriptions>
            <Steps
              direction="vertical"
              size="small"
              current={STATUS_STEP_INDEX[selectedRecord.status]}
              status={selectedRecord.status === 'rejected' ? 'error' : 'process'}
              items={PROCESS_STEPS}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}

export default Installation;
