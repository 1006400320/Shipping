<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { feeChangeApprovalSteps, feeChangeFlows, feeChangeTypes, materials, shipmentTasks } from '../data/logistics'
import { idbGet } from '../storage/indexedDb'

const emit = defineEmits(['open-complete', 'open-print', 'open-pick', 'open-qc', 'open-pack', 'open-dna', 'open-shipment-application', 'open-leave', 'open-reconcile', 'detail-change'])

const selectedTaskNo = ref('')
const activeTaskTab = ref('all')
const keyword = ref('')
const quickScanInput = ref(null)
const quickScanCode = ref('')
const startDate = ref('2026-02-01')
const endDate = ref('2026-02-28')
const carrierFilter = ref('')
const toolbarNotice = ref('')
const pickScanDialogOpen = ref(false)
const pickShipmentScanInput = ref(null)
const pickShipmentScanCode = ref('')
const pickScanMessage = ref('请使用扫码枪扫描送货单号。')
const pickScanMessageType = ref('neutral')
const selectedTaskNos = ref([])
const alertDialogOpen = ref(false)
const alertDialogMessage = ref('')
const currentPage = ref(1)
const feeChangeDialogOpen = ref(false)
const activeFeeTask = ref(null)
const voidConfirmDialogOpen = ref(false)
const activeVoidTask = ref(null)
const detailDeliveryInfo = ref(null)
const feeChangeForm = ref({
  feeType: feeChangeTypes[0],
  amount: '',
  reason: ''
})
const pageSize = 20

const feeChangeEnabledStatuses = [
  '待抽检',
  '待封箱贴单',
  '待交接装车',
  '待装车离厂',
  '待预约送货',
  '待用户签收',
  '确认对账单',
  '待仓管对账',
  '待财务对账'
]

const taskStatusTabs = [
  { key: 'draft', label: '待完善', status: '待完善' },
  { key: 'print', label: '待打印', status: '待打印' },
  { key: 'dna', label: '待录入DNA', status: '待录入DNA' },
  { key: 'pick', label: '待拣配', status: '待拣配' },
  { key: 'qc', label: '待抽检', status: '待抽检' },
  { key: 'pack', label: '待封箱贴单', status: '待封箱贴单' },
  { key: 'pickup', label: '待交接装车', status: '待交接装车' },
  { key: 'leave', label: '待装车离厂', status: '待装车离厂' },
  { key: 'appointment', label: '待预约送货', status: '待预约送货' },
  { key: 'user-sign', label: '待用户签收', status: '待用户签收' },
  { key: 'confirm-statement', label: '确认对账单', status: '确认对账单' },
  { key: 'reconcile', label: '待仓管对账', status: '待仓管对账' },
  { key: 'warehouse-reconcile', label: '待仓管对账', status: '待仓管对账' },
  { key: 'finance-reconcile', label: '待财务对账', status: '待财务对账' },
  { key: 'voided', label: '作废', status: '作废' }
]

const taskStatusOrder = new Map(taskStatusTabs.map((tab, index) => [tab.status, index]))
const sampleTotalFees = new Map([
  ['2604030001', 286.20],
  ['2604030002', 184.80],
  ['2604030003', 312.34],
  ['2604030004', 168.45],
  ['2604030005', 245.60],
  ['2604030006', 298.20],
  ['2604030007', 156.90],
  ['2604030008', 132.50],
  ['2604030009', 226.70],
  ['2604030010', 118.40],
  ['2604030011', 128.00],
  ['2604030012', 136.80],
  ['2604030013', 142.60],
  ['2604030014', 205.10],
  ['2604030015', 176.30]
])
const sampleMaterialFees = new Map([
  ['MAT-A1001', 28.65],
  ['MAT-A2008', 96.78],
  ['MAT-L3002', 164.52],
  ['MAT-C0099', 22.39]
])
const logisticsOperationStatuses = new Set([
  '待装车离厂',
  '待预约送货',
  '待用户签收',
  '确认对账单'
])

const selectedShipment = computed(() => shipmentTasks.find((task) => task.no === selectedTaskNo.value) || null)
const isTaskList = computed(() => !selectedShipment.value)
const carrierOptions = computed(() => [...new Set(shipmentTasks.map((task) => task.carrier))])
const taskTabs = computed(() => [
  { key: 'all', label: '全部', count: shipmentTasks.length },
  ...taskStatusTabs.map((tab) => ({
    key: tab.key,
    label: tab.label,
    count: shipmentTasks.filter((task) => task.status === tab.status).length
  }))
])

const filteredTasks = computed(() => {
  const query = keyword.value.trim().toLowerCase()
  const activeStatus = taskStatusTabs.find((tab) => tab.key === activeTaskTab.value)?.status

  return shipmentTasks.filter((task) => {
    if (activeStatus && task.status !== activeStatus) return false
    if (carrierFilter.value && task.carrier !== carrierFilter.value) return false
    if (startDate.value && task.requiredDate < startDate.value) return false
    if (endDate.value && task.requiredDate > endDate.value) return false
    if (!query) return true

    return [
      task.no,
      task.applicationNo,
      task.deliveryNo,
      task.transferNo,
      task.contractNo,
      task.salesOrderNo,
      task.receiverCompany
    ].some((value) => String(value || '').toLowerCase().includes(query))
  }).sort((a, b) => {
    const statusDiff = (taskStatusOrder.get(a.status) ?? taskStatusOrder.size) - (taskStatusOrder.get(b.status) ?? taskStatusOrder.size)
    return statusDiff || a.no.localeCompare(b.no)
  })
})
const pageCount = computed(() => Math.max(1, Math.ceil(filteredTasks.value.length / pageSize)))
const pagedTasks = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredTasks.value.slice(start, start + pageSize)
})
const selectedTasks = computed(() => shipmentTasks.filter((task) => selectedTaskNos.value.includes(task.no)))
const allPagedSelected = computed(() => pagedTasks.value.length > 0 && pagedTasks.value.every((task) => selectedTaskNos.value.includes(task.no)))
const feeChangeTitle = computed(() => {
  const date = new Date()
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-')
  return `费用变更流程${stamp} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:00`
})

watch(filteredTasks, () => {
  if (currentPage.value > pageCount.value) currentPage.value = pageCount.value
})

const detailSummary = computed(() => {
  const task = selectedShipment.value
  if (!task) return []

  const summary = [
    { label: '送货单状态', value: task.status, note: '按当前流程节点显示' },
    { label: '物料进度', value: `${task.progress.done} / ${task.progress.total}`, note: '按扫码结果汇总' },
    { label: '箱数', value: `${task.boxes.total} 箱`, note: `${task.boxes.sealed} 箱已封，${task.boxes.active} 箱进行中` },
    { label: '费用状态', value: task.feeStatus, note: ['待用户签收', '确认对账单'].includes(task.status) ? '用户签收后由物流公司确认并进入对账' : '对账流程按当前状态推进' }
  ]

  summary.push({ label: '总运费', value: formatTotalFee(task), note: canShowTotalFee(task) ? '拣配后按物料与箱码计费汇总' : '拣配完成后计算' })

  return summary
})

const detailDeliveryFields = computed(() => {
  const info = detailDeliveryInfo.value
  if (!info) return []

  const form = info.deliveryForm || {}
  return [
    { label: '收货单位', value: form.receiverCompany },
    { label: '成本中心', value: info.selectedCostCenter ? `${info.selectedCostCenter.code} ${info.selectedCostCenter.name}` : '' },
    { label: '发运方式', value: form.deliveryMethod },
    { label: '结算方式', value: form.settlementMethod },
    { label: '目的地', value: [form.destinationProvince, form.destinationCity].filter(Boolean).join(' ') },
    { label: '详细地址', value: form.address },
    { label: '合同号', value: form.contractNo },
    { label: '销售订单号', value: form.salesOrderNo },
    { label: '收货人', value: form.receiver },
    { label: '收货人电话', value: form.receiverPhone },
    { label: '承运公司', value: info.carrier?.carrier },
    { label: '提货人', value: info.pickupPerson?.name },
    { label: '提货人电话', value: info.pickupPerson?.phone },
    { label: '车牌号', value: form.vehicleNo },
    { label: '发货人', value: info.sender?.sender },
    { label: '发货人电话', value: info.sender?.phone },
    { label: '实际发货日', value: form.actualDeliveryDate },
    { label: '要求到店日', value: form.requiredArrivalDate },
    { label: '接货人电话', value: form.handoverContact },
    { label: '交付说明', value: form.deliveryNote },
    { label: '运费合计', value: canShowTotalFee(task) && info.totalFee != null ? Number(info.totalFee).toFixed(2) : '' }
  ].filter((item) => item.value !== undefined && item.value !== null && item.value !== '')
})

const detailOperationRecords = computed(() =>
  (selectedShipment.value?.operationRecords || []).map((record) => ({
    ...record,
    operatorOrg: record.operatorOrg || record.company || '-'
  }))
)

function taskActions(task) {
  const actions = ['详情']

  if (task.status === '待完善') return [...actions, '完善', '作废']
  if (task.status === '待打印') return [...actions, '打印', '作废']
  if (task.status === '待拣配') return [...actions, '拣配']
  if (task.status === '待抽检') return [...actions, '抽检']
  if (task.status === '待封箱贴单') return [...actions, '封箱贴单']
  if (task.status === '待录入DNA') return [...actions, '录入DNA']
  if (task.status === '待交接装车') return [...actions, '交接装车']
  if (task.status === '待装车离厂') return [...actions, '确认离厂']
  if (task.status === '待预约送货') return [...actions, '预约送货']
  if (task.status === '待用户签收' || task.status === '待签收') return [...actions, '用户签收']
  if (task.status === '确认对账单') return [...actions, '确认对账单']
  if (task.status === '待仓管对账') return [...actions, '仓管对账']
  if (task.status === '待财务对账') return [...actions, '财务对账']

  return actions
}

function canChangeFee(task) {
  return feeChangeEnabledStatuses.includes(task.status)
}

function canShowTotalFee(task) {
  return !['待完善', '待打印', '待录入DNA', '待拣配'].includes(task.status)
}

function formatTotalFee(task) {
  if (!canShowTotalFee(task)) return ''

  const totalFee = task.totalFee ?? sampleTotalFees.get(task.no)
  return totalFee != null ? Number(totalFee).toFixed(2) : '-'
}

function formatMaterialFee(item) {
  if (!selectedShipment.value || !canShowTotalFee(selectedShipment.value)) return ''

  const fee = item.freightFee ?? item.transportFee ?? sampleMaterialFees.get(item.code)
  return fee != null ? Number(fee).toFixed(2) : '-'
}

function getOperationParty(task) {
  return logisticsOperationStatuses.has(task.status) ? '物流' : '捷顺'
}

function tableTaskActions(task) {
  const actions = taskActions(task)
  if (!canChangeFee(task)) return actions
  return ['详情', '费用变更', ...actions.filter((action) => action !== '详情')]
}

function showTaskDetail(taskNo) {
  selectedTaskNo.value = taskNo
  emit('detail-change', taskNo)
}

async function loadDetailDeliveryInfo(taskNo) {
  detailDeliveryInfo.value = null
  if (!taskNo) return

  try {
    detailDeliveryInfo.value = await idbGet(`delivery-detail:${taskNo}`)
  } catch (error) {
    detailDeliveryInfo.value = null
  }
}

watch(selectedTaskNo, (taskNo) => {
  void loadDetailDeliveryInfo(taskNo)
})

function showAllTasks() {
  selectedTaskNo.value = ''
  emit('detail-change', '')
}

function resetFilters() {
  activeTaskTab.value = 'all'
  keyword.value = ''
  startDate.value = '2026-02-01'
  endDate.value = '2026-02-28'
  carrierFilter.value = ''
  toolbarNotice.value = ''
  currentPage.value = 1
}

function runSearch() {
  currentPage.value = 1
  toolbarNotice.value = `已查询到 ${filteredTasks.value.length} 条数据`
}

function normalizeQuickScanCode(rawCode) {
  return rawCode.trim().replace(/\s+/g, '')
}

function quickScanSearch() {
  const code = normalizeQuickScanCode(quickScanCode.value)
  if (!code) {
    toolbarNotice.value = '请先扫描或输入送货单号'
    nextTick(() => quickScanInput.value?.focus())
    return
  }

  activeTaskTab.value = 'all'
  keyword.value = code
  startDate.value = ''
  endDate.value = ''
  carrierFilter.value = ''
  currentPage.value = 1

  const exactMatch = shipmentTasks.find((task) => task.no === code)
  const matches = shipmentTasks.filter((task) => task.no.includes(code))
  const target = exactMatch || (matches.length === 1 ? matches[0] : null)
  if (target) {
    selectedTaskNos.value = [target.no]
    toolbarNotice.value = `已定位送货单 ${target.no}`
    return
  }

  selectedTaskNos.value = []
  toolbarNotice.value = `未找到送货单 ${code}`
}

function exportTasks() {
  toolbarNotice.value = `已导出当前 ${filteredTasks.value.length} 条数据`
}

function toggleAllPagedTasks() {
  const pagedNos = pagedTasks.value.map((task) => task.no)
  if (allPagedSelected.value) {
    selectedTaskNos.value = selectedTaskNos.value.filter((no) => !pagedNos.includes(no))
    return
  }

  selectedTaskNos.value = [...new Set([...selectedTaskNos.value, ...pagedNos])]
}

function batchPrintTasks() {
  if (selectedTasks.value.length === 0) {
    showAlertDialog('请先勾选需要批量打印的送货单')
    return
  }

  const invalidTasks = selectedTasks.value.filter((task) => task.status !== '待打印')
  if (invalidTasks.length > 0) {
    showAlertDialog(`批量打印失败：${invalidTasks.map((task) => `${task.no}(${task.status})`).join('、')} 不是待打印状态`)
    return
  }

  emit('open-print', selectedTaskNos.value.join(','))
}

function batchHandoverTasks() {
  if (selectedTasks.value.length === 0) {
    showAlertDialog('请先勾选需要批量交接装车的送货单')
    return
  }

  const invalidTasks = selectedTasks.value.filter((task) => task.status !== '待交接装车')
  if (invalidTasks.length > 0) {
    showAlertDialog(`批量交接装车失败：${invalidTasks.map((task) => `${task.no}(${task.status})`).join('、')} 不是待交接装车状态`)
    return
  }

  emit('open-leave', selectedTaskNos.value.join(','))
}

function showAlertDialog(message) {
  alertDialogMessage.value = message
  alertDialogOpen.value = true
}

function closeAlertDialog() {
  alertDialogOpen.value = false
}

function openPickScanDialog() {
  pickShipmentScanCode.value = ''
  pickScanMessage.value = '请使用扫码枪扫描送货单号。'
  pickScanMessageType.value = 'neutral'
  pickScanDialogOpen.value = true
  nextTick(() => pickShipmentScanInput.value?.focus())
}

function closePickScanDialog() {
  pickScanDialogOpen.value = false
}

function normalizeShipmentScanCode(value) {
  return (
    String(value || '')
      .trim()
      .toUpperCase()
      .split(/[|,;\s]+/)
      .find((part) => /^\d{10}$/.test(part)) || ''
  )
}

function submitPickShipmentScan() {
  const shipmentNo = normalizeShipmentScanCode(pickShipmentScanCode.value)

  if (!shipmentNo) {
    pickScanMessage.value = '扫码内容为空或格式不正确，请扫描 10 位送货单号。'
    pickScanMessageType.value = 'danger'
    nextTick(() => pickShipmentScanInput.value?.select())
    return
  }

  const task = shipmentTasks.find((item) => item.no === shipmentNo)
  if (!task) {
    pickScanMessage.value = `扫码异常：${shipmentNo} 不存在。`
    pickScanMessageType.value = 'danger'
    nextTick(() => pickShipmentScanInput.value?.select())
    return
  }

  if (task.status !== '待拣配') {
    pickScanMessage.value = `扫码异常：${shipmentNo} 当前状态为${task.status}，不能开始拣配。`
    pickScanMessageType.value = 'danger'
    nextTick(() => pickShipmentScanInput.value?.select())
    return
  }

  pickScanMessage.value = `扫码成功：${shipmentNo}，正在进入拣配页面。`
  pickScanMessageType.value = 'success'
  closePickScanDialog()
  emit('open-pick', task.no)
}

function openLeaveTask(task) {
  selectedTaskNo.value = task.no
  emit('open-leave', task.no)
}

function getApprovingFeeChange(taskNo) {
  return feeChangeFlows.find((flow) => flow.shipmentNo === taskNo && flow.status === '审批中')
}

function openFeeChangeFlow(task) {
  const approvingFlow = getApprovingFeeChange(task.no)

  if (approvingFlow) {
    toolbarNotice.value = `${task.no} 已存在审批中的费用变更流程 ${approvingFlow.id}，当前节点：${approvingFlow.currentStep}`
    return
  }

  activeFeeTask.value = task
  feeChangeForm.value = {
    feeType: feeChangeTypes[0],
    amount: '',
    reason: ''
  }
  feeChangeDialogOpen.value = true
}

function closeFeeChangeDialog() {
  feeChangeDialogOpen.value = false
  activeFeeTask.value = null
}

function openVoidConfirm(task) {
  activeVoidTask.value = task
  voidConfirmDialogOpen.value = true
}

function closeVoidConfirm() {
  voidConfirmDialogOpen.value = false
  activeVoidTask.value = null
}

function confirmVoidTask() {
  if (!activeVoidTask.value) return
  activeVoidTask.value.status = '作废'
  activeVoidTask.value.feeStatus = '作废'
  activeVoidTask.value.currentNode = '作废'
  activeVoidTask.value.tone = 'neutral'
  selectedTaskNos.value = selectedTaskNos.value.filter((no) => no !== activeVoidTask.value.no)
  toolbarNotice.value = `${activeVoidTask.value.no} 已作废`
  closeVoidConfirm()
}

function submitFeeChangeFlow() {
  if (!activeFeeTask.value) return

  const approvingFlow = getApprovingFeeChange(activeFeeTask.value.no)
  if (approvingFlow) {
    toolbarNotice.value = `${activeFeeTask.value.no} 已存在审批中的费用变更流程 ${approvingFlow.id}，不能重复发起`
    closeFeeChangeDialog()
    return
  }

  if (!feeChangeForm.value.amount || Number(feeChangeForm.value.amount) <= 0) {
    toolbarNotice.value = '费用变更金额必须大于 0'
    return
  }

  if (!feeChangeForm.value.reason.trim()) {
    toolbarNotice.value = '请填写费用变更原因'
    return
  }

  const flow = {
    id: `FCF-${Date.now()}`,
    shipmentNo: activeFeeTask.value.no,
    feeType: feeChangeForm.value.feeType,
    amount: Number(feeChangeForm.value.amount).toFixed(2),
    reason: feeChangeForm.value.reason.trim(),
    status: '审批中',
    currentStep: feeChangeApprovalSteps[0],
    steps: feeChangeApprovalSteps
  }

  feeChangeFlows.push(flow)
  activeFeeTask.value.feeStatus = '费用变更审批中'
  toolbarNotice.value = `已发起费用变更流程 ${flow.id}，审批路径：${feeChangeApprovalSteps.join(' -> ')}`
  closeFeeChangeDialog()
}

function handleTaskAction(action, task) {
  if (action === '详情') {
    showTaskDetail(task.no)
    return
  }

  if (action === '完善') {
    emit('open-complete', task.no)
    return
  }

  if (action === '打印') {
    emit('open-print', task.no)
    return
  }

  if (action === '拣配') {
    emit('open-pick', task.no)
    return
  }

  if (action === '抽检') {
    emit('open-qc', task.no)
    return
  }

  if (action === '封箱贴单') {
    emit('open-pack', task.no)
    return
  }

  if (action.includes('DNA')) {
    emit('open-dna', task.no)
    return
  }

  if (action === '交接装车' || action === '确认离厂' || action === '预约送货' || action === '用户签收' || action === '签收') {
    openLeaveTask(task)
    return
  }

  if (action === '确认对账单') {
    emit('open-reconcile', task.no)
    return
  }

  if (action === '费用变更') {
    openFeeChangeFlow(task)
    return
  }

  if (action === '作废') {
    openVoidConfirm(task)
    return
  }

  showTaskDetail(task.no)
}

function openShipmentApplication(task) {
  if (!task?.applicationNo) return
  emit('open-shipment-application', task.no)
}

defineExpose({ showAllTasks })
</script>

<template>
  <section class="content">
    <template v-if="isTaskList">
      <section class="panel delivery-manager">
        <div class="delivery-tabs">
          <button
            v-for="tab in taskTabs"
            :key="tab.key"
            class="delivery-tab"
            :class="{ active: activeTaskTab === tab.key }"
            type="button"
            @click="activeTaskTab = tab.key"
          >
            {{ tab.label }}<span v-if="tab.count !== undefined">({{ tab.count }})</span>
          </button>
        </div>

        <div class="delivery-filter">
          <label class="filter-field keyword-field">
            <span>送货单号、交货单号、调拨单号</span>
            <input v-model="keyword" type="search" placeholder="请输入关键字" />
          </label>
          <form class="quick-scan-search" @submit.prevent="quickScanSearch">
            <label class="filter-field quick-scan-field">
              <span>扫码查送货单</span>
              <input
                ref="quickScanInput"
                v-model="quickScanCode"
                type="search"
                inputmode="numeric"
                autocomplete="off"
                placeholder="扫描送货单号"
                aria-label="扫码快速查询送货单"
                @focus="quickScanInput?.select()"
              />
            </label>
            <button class="btn primary" type="submit">定位</button>
          </form>
          <label class="filter-field date-field">
            <span>要求到货日期</span>
            <input v-model="startDate" type="date" />
          </label>
          <span class="date-separator">~</span>
          <label class="filter-field compact-field">
            <span class="visually-hidden">结束日期</span>
            <input v-model="endDate" type="date" />
          </label>
          <label class="filter-field carrier-field">
            <span>承运公司</span>
            <select v-model="carrierFilter">
              <option value="">全部</option>
              <option v-for="carrier in carrierOptions" :key="carrier" :value="carrier">{{ carrier }}</option>
            </select>
          </label>
          <button class="btn primary" type="button" @click="runSearch">查询</button>
          <button class="btn" type="button" @click="resetFilters">重置</button>
          <button class="btn" type="button" @click="exportTasks">导出</button>
          <button class="btn primary" type="button" @click="emit('open-complete', '')">创建送货单</button>
          <button class="btn create-btn" type="button" @click="batchPrintTasks">批量打印</button>
          <button class="btn primary" type="button" @click="openPickScanDialog">开始拣配</button>
          <button class="btn primary" type="button" @click="batchHandoverTasks">批量交接装车</button>
        </div>

        <div v-if="toolbarNotice" class="toolbar-notice">{{ toolbarNotice }}</div>

        <div class="table-wrap delivery-table-wrap">
          <table class="delivery-table">
            <thead>
              <tr>
                <th class="select-cell">
                  <input type="checkbox" :checked="allPagedSelected" aria-label="选择当前页" @change="toggleAllPagedTasks" />
                </th>
                <th>送货单号</th>
                <th>状态</th>
                <th>出货申请单号</th>
                <th>交货单号</th>
                <th>调拨单号</th>
                <th>要求到货日期</th>
                <th>合同号</th>
                <th>销售单号</th>
                <th>收货单位</th>
                <th>操作方</th>
                <th>总运费</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="task in pagedTasks" :key="task.no">
                <td class="select-cell">
                  <input v-model="selectedTaskNos" type="checkbox" :value="task.no" :aria-label="`选择送货单 ${task.no}`" />
                </td>
                <td class="link-cell">
                  <button class="text-link" type="button" @click="showTaskDetail(task.no)">{{ task.no }}</button>
                </td>
                <td :title="task.status" :data-full="task.status">{{ task.status }}</td>
                <td class="link-cell">
                  <button
                    class="text-link"
                    type="button"
                    :disabled="!task.applicationNo"
                    :title="task.applicationNo ? '点击进入出货申请流程' : '暂无出货申请单号'"
                    @click="openShipmentApplication(task)"
                  >
                    {{ task.applicationNo || '-' }}
                  </button>
                </td>
                <td :title="task.deliveryNo || '-'" :data-full="task.deliveryNo || '-'">{{ task.deliveryNo || '-' }}</td>
                <td :title="task.transferNo || '-'" :data-full="task.transferNo || '-'">{{ task.transferNo || '-' }}</td>
                <td :title="task.requiredDate" :data-full="task.requiredDate">{{ task.requiredDate }}</td>
                <td :title="task.contractNo" :data-full="task.contractNo">{{ task.contractNo }}</td>
                <td :title="task.salesOrderNo" :data-full="task.salesOrderNo">{{ task.salesOrderNo }}</td>
                <td :title="task.receiverCompany" :data-full="task.receiverCompany">{{ task.receiverCompany }}</td>
                <td
                  class="operation-party-cell"
                  :class="getOperationParty(task) === '物流' ? 'party-logistics' : 'party-jieshun'"
                >
                  <span>{{ getOperationParty(task) }}</span>
                </td>
                <td :title="formatTotalFee(task)" :data-full="formatTotalFee(task)">{{ formatTotalFee(task) }}</td>
                <td class="action-cell">
                  <button
                    v-for="action in tableTaskActions(task)"
                    :key="action"
                    class="action-link"
                    :class="{ warn: action === '作废' }"
                    type="button"
                    :title="action"
                    :aria-label="action"
                    @click="handleTaskAction(action, task)"
                  >
                    {{ action }}
                  </button>
                </td>
              </tr>
              <tr v-if="filteredTasks.length === 0">
                <td class="empty-cell" colspan="13">暂无符合条件的交货单</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination-bar">
          <span>共 {{ filteredTasks.length }} 条数据</span>
          <button class="pager-btn" type="button" :disabled="currentPage === 1" @click="currentPage -= 1">&lt;</button>
          <button class="pager-btn active" type="button">{{ currentPage }}</button>
          <button class="pager-btn" type="button" :disabled="currentPage >= pageCount" @click="currentPage += 1">&gt;</button>
          <select class="page-size" aria-label="每页条数">
            <option selected>20 条/页</option>
          </select>
          <span>跳至</span>
          <input class="jump-input" type="number" min="1" value="1" />
          <span>页</span>
        </div>
      </section>
    </template>

    <template v-else>
      <Teleport to=".topbar-actions">
        <div class="detail-top-actions">
          <button
            v-for="action in taskActions(selectedShipment).filter((item) => item !== '详情' && item !== '作废')"
            :key="action"
            class="btn primary"
            type="button"
            @click="handleTaskAction(action, selectedShipment)"
          >
            {{ action }}
          </button>
          <button v-if="canChangeFee(selectedShipment)" class="btn primary" type="button" @click="openFeeChangeFlow(selectedShipment)">费用变更</button>
        </div>
      </Teleport>

      <section class="summary-grid">
        <article class="panel shipment-card">
          <div class="shipment-title">
            <div>
              <h1>交货单 {{ selectedShipment.no }}</h1>
              <p class="subline">
                客户：{{ selectedShipment.customer }} | 收货人：{{ selectedShipment.receiver }} {{ selectedShipment.phone }} |
                地址：{{ selectedShipment.address }}
              </p>
            </div>
          </div>
        </article>

        <article v-for="item in detailSummary" :key="item.label" class="panel metric">
          <div class="metric-label">{{ item.label }}</div>
          <div class="metric-value">{{ item.value }}</div>
          <div class="metric-note">{{ item.note }}</div>
        </article>
      </section>

      <section class="panel">
        <div class="section-head">
          <div class="section-title">完善信息</div>
          <div class="section-extra">来自完善操作保存或提交的内容</div>
        </div>
        <div v-if="detailDeliveryFields.length" class="form-grid detail-form-grid">
          <label v-for="item in detailDeliveryFields" :key="item.label">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </label>
        </div>
        <div v-else class="empty-cell">暂无完善操作填写的信息</div>
      </section>

      <section class="panel">
        <div class="section-head">
          <div class="section-title">操作记录</div>
          <div class="section-extra">展示当前交货单的关键操作流转</div>
        </div>
        <div v-if="detailOperationRecords.length" class="timeline detail-operation-timeline">
          <div v-for="record in detailOperationRecords" :key="`${record.time}-${record.operator}-${record.action}`" class="event">
            <div class="event-time">{{ record.time }}</div>
            <div class="event-main">{{ record.action }}</div>
            <div class="event-note detail-operation-operator">{{ record.operatorOrg }} · {{ record.operator }}</div>
          </div>
        </div>
        <div v-else class="empty-cell">暂无操作记录</div>
      </section>

      <section class="panel">
        <div class="section-head">
          <div class="section-title">物料明细</div>
          <div class="section-extra">拣配、抽检、封箱均来自扫码记录</div>
        </div>
        <div class="table-scroll">
          <table class="qc-table">
            <thead>
              <tr>
                <th>物料编码</th>
                <th>名称</th>
                <th>计划</th>
                <th>已拣</th>
                <th>已检</th>
                <th>已装箱</th>
                <th>箱码</th>
                <th>运费</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in materials" :key="item.code">
                <td>{{ item.code }}</td>
                <td>{{ item.name }}</td>
                <td>{{ item.planned }}</td>
                <td>{{ item.picked }}</td>
                <td>{{ item.checked }}</td>
                <td>{{ item.packed }}</td>
                <td>{{ item.box }}</td>
                <td>{{ formatMaterialFee(item) }}</td>
                <td>{{ item.packed >= item.planned ? '完成' : '处理中' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>

    <div v-if="feeChangeDialogOpen" class="modal-backdrop">
      <section class="org-dialog fee-change-dialog" role="dialog" aria-modal="true" aria-label="费用变更流程">
        <div class="org-dialog-head">
          <strong>费用变更流程</strong>
          <button class="dialog-close" type="button" aria-label="关闭" @click="closeFeeChangeDialog">×</button>
        </div>
        <div class="fee-change-body">
          <h2>{{ feeChangeTitle }}</h2>

          <div class="fee-change-sheet">
            <div class="sheet-field">
              <span>公司名称</span>
              <strong>深圳市捷顺科技实业股份有限公司</strong>
            </div>
            <div class="sheet-field">
              <span>公司代码</span>
              <strong>1000</strong>
            </div>
            <div class="sheet-field">
              <span>申请人</span>
              <strong>-</strong>
            </div>
            <div class="sheet-field">
              <span>申请人所属组织</span>
              <strong>-</strong>
            </div>
            <div class="sheet-field">
              <span>交货单号</span>
              <strong>{{ activeFeeTask?.no }}</strong>
            </div>
            <div class="sheet-field">
              <span>承运公司</span>
              <strong>{{ activeFeeTask?.carrier }}</strong>
            </div>
            <label class="sheet-field">
              <span>费用类型</span>
              <select v-model="feeChangeForm.feeType">
                <option v-for="type in feeChangeTypes" :key="type" :value="type">{{ type }}</option>
              </select>
            </label>
            <label class="sheet-field">
              <span>变更金额</span>
              <input v-model="feeChangeForm.amount" type="number" min="0.01" step="0.01" placeholder="请输入金额" />
            </label>
            <div class="sheet-field">
              <span>合同编号</span>
              <strong>{{ activeFeeTask?.contractNo || '-' }}</strong>
            </div>
            <label class="sheet-field wide">
              <span>变更原因</span>
              <textarea v-model="feeChangeForm.reason" rows="3" placeholder="请填写费用变更原因"></textarea>
            </label>
          </div>

          <div class="fee-flow-panel" aria-label="费用变更审批路径">
            <div class="fee-flow-node start">开始节点</div>
            <div class="fee-flow-node active">起草节点</div>
            <div class="fee-flow-node">物流公司审核</div>
            <div class="fee-flow-node current">仓库审核</div>
            <div class="fee-flow-node">总部财务审核</div>
            <div class="fee-flow-node end">结束节点</div>
          </div>

          <div class="fee-approval-panel">
            <div class="section-title">流程审批</div>
            <div class="approval-actions" role="radiogroup" aria-label="审批操作">
              <label><input type="radio" name="fee-approve-action" checked /> 通过</label>
              <label><input type="radio" name="fee-approve-action" /> 转办</label>
              <label><input type="radio" name="fee-approve-action" /> 沟通</label>
              <label><input type="radio" name="fee-approve-action" /> 驳回</label>
              <label><input type="radio" name="fee-approve-action" /> 传阅</label>
            </div>
            <label class="approval-comment">
              <span>处理意见</span>
              <textarea rows="2" placeholder="同意"></textarea>
            </label>
            <div class="approval-next">即将流向：{{ feeChangeApprovalSteps[0] }}</div>
          </div>
        </div>
        <div class="org-dialog-foot">
          <button class="btn" type="button" @click="closeFeeChangeDialog">取消</button>
          <button class="btn primary" type="button" @click="submitFeeChangeFlow">提交审批</button>
        </div>
      </section>
    </div>

    <div v-if="pickScanDialogOpen" class="modal-backdrop">
      <section class="org-dialog pick-scan-dialog" role="dialog" aria-modal="true" aria-label="开始拣配">
        <div class="org-dialog-head">
          <strong>开始拣配</strong>
          <button class="dialog-close" type="button" aria-label="关闭" @click="closePickScanDialog">×</button>
        </div>
        <form class="pick-scan-body" @submit.prevent="submitPickShipmentScan">
          <label class="scan-input-wrap">
            <input
              ref="pickShipmentScanInput"
              v-model="pickShipmentScanCode"
              class="scan-input"
              type="search"
              inputmode="numeric"
              autocomplete="off"
              placeholder="请扫描送货单号"
              aria-label="送货单号扫码输入"
              @focus="pickShipmentScanInput?.select()"
            />
            <button class="scan-button" type="submit">确认</button>
          </label>
          <div class="scan-alert" :class="pickScanMessageType">{{ pickScanMessage }}</div>
        </form>
        <div class="org-dialog-foot">
          <button class="btn" type="button" @click="closePickScanDialog">取消</button>
          <button class="btn primary" type="button" @click="submitPickShipmentScan">进入拣配</button>
        </div>
      </section>
    </div>

    <div v-if="alertDialogOpen" class="modal-backdrop">
      <section class="org-dialog alert-dialog" role="alertdialog" aria-modal="true" aria-label="提示">
        <div class="org-dialog-head">
          <strong>提示</strong>
          <button class="dialog-close" type="button" aria-label="关闭" @click="closeAlertDialog">×</button>
        </div>
        <div class="alert-dialog-body">{{ alertDialogMessage }}</div>
        <div class="org-dialog-foot">
          <button class="btn primary" type="button" @click="closeAlertDialog">确定</button>
        </div>
      </section>
    </div>

    <div v-if="voidConfirmDialogOpen" class="modal-backdrop">
      <section class="org-dialog alert-dialog" role="dialog" aria-modal="true" aria-label="作废确认">
        <div class="org-dialog-head">
          <strong>作废确认</strong>
          <button class="dialog-close" type="button" aria-label="关闭" @click="closeVoidConfirm">×</button>
        </div>
        <div class="alert-dialog-body">确认后将把 {{ activeVoidTask?.no }} 的状态改成“作废”。</div>
        <div class="org-dialog-foot">
          <button class="btn" type="button" @click="closeVoidConfirm">取消</button>
          <button class="btn primary" type="button" @click="confirmVoidTask">确认作废</button>
        </div>
      </section>
    </div>
  </section>
</template>
