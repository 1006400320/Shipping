export const shipment = {
  no: 'FH202605180001',
  customer: '深圳捷顺项目部',
  receiver: '王工',
  phone: '138****8021',
  address: '广东省深圳市南山区科技园',
  currentNode: '完善',
  progress: { done: 18, total: 20 },
  boxes: { total: 3, sealed: 2, active: 1 },
  feeStatus: '未对账'
}

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

export const carriers = [
  { name: '顺丰速运', contact: '刘经理', phone: '139****4510', status: '启用' },
  { name: '德邦物流', contact: '赵经理', phone: '137****6691', status: '启用' },
  { name: '跨越速运', contact: '何经理', phone: '136****2205', status: '停用' }
]
