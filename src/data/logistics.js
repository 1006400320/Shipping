export const shipment = {
  no: 'FH202605180001',
  customer: '深圳捷顺项目部',
  receiver: '王工',
  phone: '13800108021',
  address: '广东省深圳市南山区科技园',
  currentNode: '完善',
  progress: { done: 18, total: 20 },
  boxes: { total: 3, sealed: 2, active: 1 },
  feeStatus: '未对账'
}

export const shipmentTasks = [
  {
    no: '2604030001',
    customer: '上海第一分公司',
    receiver: '王工',
    phone: '13800108021',
    address: '上海市浦东新区张江高科园区',
    applicationNo: '13245678',
    deliveryNo: '81113001',
    transferNo: '',
    requiredDate: '2026-02-15',
    contractNo: '94126000001',
    salesOrderNo: '1033001',
    receiverCompany: '上海第一分公司',
    carrier: '顺丰速运',
    currentNode: '完善',
    status: '待完善',
    priority: '加急',
    plannedDate: '2026-02-15',
    progress: { done: 18, total: 20 },
    boxes: { total: 3, sealed: 2, active: 1 },
    feeStatus: '未对账',
    tone: 'amber'
  },
  {
    no: '2604030002',
    customer: '广州荣实物业管理有限公司',
    receiver: '陈工',
    phone: '13600102190',
    address: '广东省广州市番禺区亚运大道',
    applicationNo: '13245678',
    deliveryNo: '',
    transferNo: '4501030001',
    requiredDate: '2026-02-11',
    contractNo: '680026031001',
    salesOrderNo: '1033002',
    receiverCompany: '广州荣实物业管理有限公司',
    carrier: '德邦物流',
    currentNode: '打印',
    status: '待打印',
    priority: '普通',
    plannedDate: '2026-02-11',
    progress: { done: 6, total: 16 },
    boxes: { total: 2, sealed: 0, active: 1 },
    feeStatus: '未对账',
    tone: 'blue'
  },
  {
    no: '2604030003',
    customer: '惠州市荣物业管理有限公司',
    receiver: '刘工',
    phone: '13900106502',
    address: '广东省惠州市惠城区江北片区',
    applicationNo: '13245678',
    deliveryNo: '81113003',
    transferNo: '',
    requiredDate: '2026-02-10',
    contractNo: '680026031002',
    salesOrderNo: '1033003',
    receiverCompany: '惠州市荣物业管理有限公司',
    carrier: '跨越速运',
    currentNode: '拣配',
    status: '待拣配',
    priority: '普通',
    plannedDate: '2026-02-10',
    progress: { done: 24, total: 24 },
    boxes: { total: 4, sealed: 2, active: 0 },
    feeStatus: '未对账',
    tone: 'neutral'
  },
  {
    no: '2604030004',
    customer: '惠州市荣物业管理有限公司',
    receiver: '赵工',
    phone: '13700108821',
    address: '广东省惠州市仲恺高新区',
    applicationNo: '13245678',
    deliveryNo: '',
    transferNo: '4501030002',
    requiredDate: '2026-02-01',
    contractNo: '680026031003',
    salesOrderNo: '1033004',
    receiverCompany: '惠州市荣物业管理有限公司',
    carrier: '顺丰速运',
    currentNode: '拣配',
    status: '待拣配',
    priority: '普通',
    plannedDate: '2026-02-01',
    progress: { done: 12, total: 12 },
    boxes: { total: 2, sealed: 2, active: 0 },
    feeStatus: '待物流上传',
    tone: 'green'
  },
  {
    no: '2604030005',
    customer: '上海第一分公司',
    receiver: '周工',
    phone: '13800109088',
    address: '上海市闵行区虹梅南路',
    applicationNo: '13245678',
    deliveryNo: '81113001',
    transferNo: '',
    requiredDate: '2026-02-15',
    contractNo: '94126000001',
    salesOrderNo: '1033001',
    receiverCompany: '上海第一分公司',
    carrier: '德邦物流',
    currentNode: '抽检',
    status: '待抽检',
    priority: '普通',
    plannedDate: '2026-02-15',
    progress: { done: 14, total: 18 },
    boxes: { total: 3, sealed: 1, active: 1 },
    feeStatus: '未对账',
    tone: 'neutral'
  },
  {
    no: '2604030006',
    customer: '上海第一分公司',
    receiver: '钱工',
    phone: '13500103002',
    address: '上海市嘉定区安亭镇',
    applicationNo: '13245678',
    deliveryNo: '81113002',
    transferNo: '',
    requiredDate: '2026-02-15',
    contractNo: '94126000001',
    salesOrderNo: '1033001',
    receiverCompany: '上海第一分公司',
    carrier: '跨越速运',
    currentNode: '封箱',
    status: '待封箱贴单',
    priority: '普通',
    plannedDate: '2026-02-15',
    progress: { done: 20, total: 22 },
    boxes: { total: 4, sealed: 3, active: 1 },
    feeStatus: '未对账',
    tone: 'blue'
  },
  {
    no: '2604030007',
    customer: '上海第一分公司',
    receiver: '孙工',
    phone: '13900101207',
    address: '上海市青浦区徐泾镇',
    applicationNo: '13245678',
    deliveryNo: '81113003',
    transferNo: '',
    requiredDate: '2026-02-15',
    contractNo: '94126000001',
    salesOrderNo: '1033001',
    receiverCompany: '上海第一分公司',
    carrier: '顺丰速运',
    currentNode: 'DNA',
    status: '待录入DNA',
    priority: '普通',
    plannedDate: '2026-02-15',
    progress: { done: 8, total: 8 },
    boxes: { total: 2, sealed: 2, active: 0 },
    feeStatus: '未对账',
    tone: 'amber'
  },
  {
    no: '2604030008',
    customer: '上海第一分公司',
    receiver: '李工',
    phone: '13700105518',
    address: '上海市松江区九亭镇',
    applicationNo: '13245678',
    deliveryNo: '81113003',
    transferNo: '',
    requiredDate: '2026-02-26',
    contractNo: '94126000001',
    salesOrderNo: '1033001',
    receiverCompany: '上海第一分公司',
    carrier: '德邦物流',
    currentNode: '物流取货',
    status: '待物流取货',
    priority: '普通',
    plannedDate: '2026-02-26',
    progress: { done: 10, total: 10 },
    boxes: { total: 2, sealed: 2, active: 0 },
    feeStatus: '待物流上传',
    tone: 'green'
  },
  {
    no: '2604030009',
    customer: '上海第一分公司',
    receiver: '吴工',
    phone: '13600107742',
    address: '上海市宝山区友谊路',
    applicationNo: '13245678',
    deliveryNo: '81113003',
    transferNo: '',
    requiredDate: '2026-02-26',
    contractNo: '94126000001',
    salesOrderNo: '1033001',
    receiverCompany: '上海第一分公司',
    carrier: '跨越速运',
    currentNode: '发厂',
    status: '待装车离厂',
    priority: '普通',
    plannedDate: '2026-02-26',
    progress: { done: 16, total: 16 },
    boxes: { total: 3, sealed: 3, active: 0 },
    feeStatus: '待物流上传',
    tone: 'green'
  },
  {
    no: '2604030010',
    customer: '上海第一分公司',
    receiver: '郑工',
    phone: '13800100091',
    address: '上海市徐汇区漕河泾',
    applicationNo: '13245678',
    deliveryNo: '81113003',
    transferNo: '',
    requiredDate: '2026-02-25',
    contractNo: '94126000001',
    salesOrderNo: '1033001',
    receiverCompany: '上海第一分公司',
    carrier: '顺丰速运',
    currentNode: '对账',
    status: '待上传对账单',
    priority: '普通',
    plannedDate: '2026-02-25',
    progress: { done: 12, total: 12 },
    boxes: { total: 2, sealed: 2, active: 0 },
    feeStatus: '待上传对账单',
    tone: 'neutral'
  }
]

export const tags = [
  { text: '待完善', tone: 'amber' },
  { text: '未打印', tone: 'neutral' },
  { text: '待拣配', tone: 'neutral' },
  { text: '待抽检', tone: 'neutral' },
  { text: '包含大件', tone: 'amber' },
  { text: '待 DNA', tone: 'neutral' }
]

export const steps = [
  { name: '完善', owner: '资料员', state: 'current' },
  { name: '打印', owner: '资料员', state: 'todo' },
  { name: '拣配', owner: '包管员扫码', state: 'todo' },
  { name: '抽检', owner: '质量员扫码', state: 'todo' },
  { name: '封箱', owner: '封箱员扫码', state: 'todo' },
  { name: 'DNA', owner: '大件必填', state: 'todo' },
  { name: '发厂', owner: '物控确认', state: 'todo' },
  { name: '运输', owner: '物流单号', state: 'todo' },
  { name: '对账', owner: '财务核价', state: 'todo' },
  { name: '报销', owner: '总部财务', state: 'todo' }
]

export const materials = [
  {
    code: 'MAT-A1001',
    name: '通道闸机主控板',
    planned: 4,
    picked: 4,
    checked: 4,
    packed: 4,
    box: 'BOX-001',
    status: '完成',
    tone: 'ok',
    large: false
  },
  {
    code: 'MAT-A2008',
    name: '闸机外壳组件',
    planned: 6,
    picked: 6,
    checked: 6,
    packed: 6,
    box: 'BOX-002',
    status: '完成',
    tone: 'ok',
    large: false
  },
  {
    code: 'MAT-L3002',
    name: '大件立柱组件',
    planned: 8,
    picked: 8,
    checked: 8,
    packed: 6,
    box: 'BOX-003',
    status: '待补扫',
    tone: 'warn',
    large: true
  },
  {
    code: 'MAT-C0099',
    name: '线缆包',
    planned: 2,
    picked: 2,
    checked: 2,
    packed: 2,
    box: 'BOX-003',
    status: '完成',
    tone: 'ok',
    large: false
  }
]

export const scanEvents = [
  {
    time: '10:42:18',
    title: '封箱扫码失败',
    note: 'MAT-AX009 重复装箱，设备 SCAN-03',
    tone: 'danger'
  },
  {
    time: '10:41:55',
    title: '箱码绑定成功',
    note: 'BOX-20260518-003，封箱员李明'
  },
  {
    time: '10:38:21',
    title: '抽检通过',
    note: '质量员周洁，抽检 20 件'
  },
  {
    time: '10:22:09',
    title: '拣配完成',
    note: '包管员陈强，应拣 20 件'
  }
]

export const boxes = [
  { no: 'BOX-001', status: '已封箱', operator: '李明', quantity: '4 / 4' },
  { no: 'BOX-002', status: '已封箱', operator: '李明', quantity: '6 / 6' },
  { no: 'BOX-003', status: '封箱中', operator: '李明', quantity: '8 / 10' }
]

export const dnaRecords = [
  { material: 'MAT-L3002', name: '大件立柱组件', dnaNo: '待录入', verifier: '未校验', status: '待处理' }
]

export const feeItems = [
  { name: '基础运费', amount: '1,680.00', status: '待核价' },
  { name: '送货费', amount: '260.00', status: '待核价' },
  { name: '中转费', amount: '0.00', status: '无' },
  { name: '延误扣费', amount: '0.00', status: '无' }
]

export const freightConfigs = [
  {
    id: 'FREIGHT-001',
    carrier: '路达物流',
    type: '物流',
    status: '正常',
    fromProvince: '广东省',
    fromCity: '深圳市',
    toProvince: '广东省',
    toCity: '湛江市',
    volumeFee: 105,
    weightFee: 0.33,
    leadDays: 2,
    updateTime: '2026-04-01 12:00:00',
    updater: '张三'
  },
  {
    id: 'FREIGHT-002',
    carrier: '深圳市联卡运捷有限公司',
    type: '快递',
    status: '停用',
    fromProvince: '广东省',
    fromCity: '深圳市',
    toProvince: '广西壮族自治区',
    toCity: '南宁市',
    volumeFee: 100,
    weightFee: 0.36,
    leadDays: 3,
    updateTime: '2026-01-01 12:00:00',
    updater: '张三'
  },
  {
    id: 'FREIGHT-003',
    carrier: '深圳市路达运捷有限公司',
    type: '物流',
    status: '正常',
    fromProvince: '广东省',
    fromCity: '深圳市',
    toProvince: '河北省',
    toCity: '石家庄市',
    volumeFee: 150,
    weightFee: 0.56,
    leadDays: 4,
    updateTime: '2026-01-01 12:00:00',
    updater: '张三'
  },
  {
    id: 'FREIGHT-004',
    carrier: '顺丰速运有限公司',
    type: '物流',
    status: '正常',
    fromProvince: '广东省',
    fromCity: '深圳市',
    toProvince: '河北省',
    toCity: '唐山市',
    volumeFee: 200,
    weightFee: 0.71,
    leadDays: 5,
    updateTime: '2026-01-01 12:00:00',
    updater: '张三'
  }
]

export const packageBoxConfigs = [
  {
    id: 'BOXCFG-001',
    model: '1号纸箱',
    description: '配件箱xxx长xxx宽380*270*130',
    status: '正常',
    length: 380,
    width: 270,
    height: 130,
    volume: 0.01,
    fromProvince: '广东省',
    fromCity: '深圳市',
    toProvince: '广东省',
    toCity: '湛江市',
    updateTime: '2026-04-01 12:00:00',
    updater: '张三'
  },
  {
    id: 'BOXCFG-002',
    model: '2号纸箱',
    description: '配件箱xxx长xxx宽360*265*215',
    status: '停用',
    length: 360,
    width: 265,
    height: 215,
    volume: 0.02,
    fromProvince: '广东省',
    fromCity: '深圳市',
    toProvince: '广西壮族自治区',
    toCity: '南宁市',
    updateTime: '2026-01-01 12:00:00',
    updater: '张三'
  },
  {
    id: 'BOXCFG-003',
    model: '3号纸箱',
    description: '配件箱xxx长xxx宽450*350*300',
    status: '正常',
    length: 450,
    width: 350,
    height: 300,
    volume: 0.05,
    fromProvince: '广东省',
    fromCity: '深圳市',
    toProvince: '河北省',
    toCity: '石家庄市',
    updateTime: '2026-01-01 12:00:00',
    updater: '张三'
  },
  {
    id: 'BOXCFG-004',
    model: '4号纸箱',
    description: '配件箱xxx长xxx宽880*380*260',
    status: '正常',
    length: 880,
    width: 380,
    height: 260,
    volume: 0.09,
    fromProvince: '广东省',
    fromCity: '深圳市',
    toProvince: '河北省',
    toCity: '唐山市',
    updateTime: '2026-01-01 12:00:00',
    updater: '张三'
  }
]

export const carrierConfigs = [
  {
    id: 'CARRIERCFG-001',
    carrier: '路达物流',
    type: '物流',
    weightRatio: 6000,
    freightAuthorizationLetter: '路达物流货运委托书.pdf',
    pickupPeople: [
      {
        id: 'PICKUP-001-001',
        name: '刘强',
        status: '正常',
        phone: '13800110001',
        idCard: '440305198801012011',
        applicationFlow: 'FLOW-PICKUP-20260401001'
      }
    ],
    status: '正常',
    updateTime: '2026-04-01 12:00:00',
    updater: '张三'
  },
  {
    id: 'CARRIERCFG-002',
    carrier: '深圳市联卡运捷有限公司',
    type: '快递',
    weightRatio: 5000,
    freightAuthorizationLetter: '',
    pickupPeople: [
      {
        id: 'PICKUP-002-001',
        name: '陈明',
        status: '停用',
        phone: '13900110002',
        idCard: '440306199002022022',
        applicationFlow: 'FLOW-PICKUP-20260101002'
      }
    ],
    status: '停用',
    updateTime: '2026-01-01 12:00:00',
    updater: '张三'
  },
  {
    id: 'CARRIERCFG-003',
    carrier: '深圳市路达运捷有限公司',
    type: '物流',
    weightRatio: 6000,
    freightAuthorizationLetter: '路达运捷货运委托书.pdf',
    pickupPeople: [
      {
        id: 'PICKUP-003-001',
        name: '赵磊',
        status: '正常',
        phone: '13700110003',
        idCard: '440307198703033033',
        applicationFlow: 'FLOW-PICKUP-20260101003'
      }
    ],
    status: '正常',
    updateTime: '2026-01-01 12:00:00',
    updater: '张三'
  },
  {
    id: 'CARRIERCFG-004',
    carrier: '顺丰速运有限公司',
    type: '物流',
    weightRatio: 4000,
    freightAuthorizationLetter: '',
    pickupPeople: [],
    status: '正常',
    updateTime: '2026-01-01 12:00:00',
    updater: '张三'
  }
]

export const senderConfigs = [
  {
    id: 'SENDER-001',
    sender: '张三',
    employeeNo: '111456',
    phone: '13800134561',
    remark: '默认发货人',
    status: '正常',
    updateTime: '2026-04-01 12:00:00',
    updater: '张三'
  },
  {
    id: 'SENDER-002',
    sender: '李四',
    employeeNo: '111457',
    phone: '13900134562',
    remark: '备用联系人',
    status: '停用',
    updateTime: '2026-01-01 12:00:00',
    updater: '张三'
  },
  {
    id: 'SENDER-003',
    sender: '王五',
    employeeNo: '111458',
    phone: '13700134563',
    remark: '华南仓',
    status: '正常',
    updateTime: '2026-01-01 12:00:00',
    updater: '张三'
  },
  {
    id: 'SENDER-004',
    sender: '赵六',
    employeeNo: '111459',
    phone: '13600134564',
    remark: '',
    status: '正常',
    updateTime: '2026-01-01 12:00:00',
    updater: '张三'
  }
]

export const carriers = [
  { name: '顺丰速运', contact: '刘经理', phone: '13900104510', status: '启用' },
  { name: '德邦物流', contact: '赵经理', phone: '13700106691', status: '启用' },
  { name: '跨越速运', contact: '何经理', phone: '13600102205', status: '停用' }
]
