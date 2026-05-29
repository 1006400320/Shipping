<script setup>
import { computed, ref, watch } from 'vue'
import { feeChangeApprovalSteps, feeChangeFlows, feeChangeTypes, materials, shipmentTasks } from '../data/logistics'

const emit = defineEmits(['open-complete', 'open-print', 'open-pick', 'open-qc', 'open-pack', 'open-dna', 'open-leave', 'open-reconcile', 'detail-change'])

const selectedTaskNo = ref('')
const activeTaskTab = ref('all')
const keyword = ref('')
const startDate = ref('2026-02-01')
const endDate = ref('2026-02-28')
const carrierFilter = ref('')
const toolbarNotice = ref('')
const currentPage = ref(1)
const feeChangeDialogOpen = ref(false)
const activeFeeTask = ref(null)
const feeChangeForm = ref({
  feeType: feeChangeTypes[0],
  amount: '',
  reason: ''
})
const pageSize = 20

const feeChangeEnabledStatuses = [
  '待抽检',
  '待封箱贴单',
  '待录入DNA',
  '待物流取货',
  '待装车离厂',
  '待签收',
  '待上传对账单',
  '待仓管对账',
  '待财务对账'
]

const taskStatusTabs = [
  { key: 'draft', label: '待完善', status: '待完善' },
  { key: 'print', label: '待打印', status: '待打印' },
  { key: 'pick', label: '待拣配', status: '待拣配' },
  { key: 'qc', label: '待抽检', status: '待抽检' },
  { key: 'pack', label: '待封箱贴单', status: '待封箱贴单' },
  { key: 'dna', label: '待录入DNA', status: '待录入DNA' },
  { key: 'pickup', label: '待物流取货', status: '待物流取货' },
  { key: 'leave', label: '待装车离厂', status: '待装车离厂' },
  { key: 'sign', label: '待签收', status: '待签收' },
  { key: 'reconcile', label: '待上传对账单', status: '待上传对账单' },
  { key: 'warehouse-reconcile', label: '待仓管对账', status: '待仓管对账' },
  { key: 'finance-reconcile', label: '待财务对账', status: '待财务对账' }
]

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
  })
})
const pageCount = computed(() => Math.max(1, Math.ceil(filteredTasks.value.length / pageSize)))
const pagedTasks = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredTasks.value.slice(start, start + pageSize)
})

watch(filteredTasks, () => {
  if (currentPage.value > pageCount.value) currentPage.value = pageCount.value
})

const detailSummary = computed(() => {
  const task = selectedShipment.value
  if (!task) return []

  return [
    { label: '物料进度', value: `${task.progress.done} / ${task.progress.total}`, note: '按扫码结果汇总' },
    { label: '箱数', value: `${task.boxes.total} 箱`, note: `${task.boxes.sealed} 箱已封，${task.boxes.active} 箱进行中` },
    { label: '费用状态', value: task.feeStatus, note: task.status === '待上传对账单' ? '签收后由物流公司上传对账单' : '对账流程按当前状态推进' }
  ]
})

function taskActions(task) {
  const actions = ['详情']

  if (task.status === '待完善') return [...actions, '完善', '作废']
  if (task.status === '待打印') return [...actions, '打印', '作废']
  if (task.status === '待拣配') return [...actions, '拣配']
  if (task.status === '待抽检') return [...actions, '抽检']
  if (task.status === '待封箱贴单') return [...actions, '封箱贴单']
  if (task.status === '待录入DNA') return [...actions, '录入DNA']
  if (task.status === '待物流取货') return [...actions, '确认物流取货']
  if (task.status === '待装车离厂') return [...actions, '开始运输']
  if (task.status === '待签收') return [...actions, '签收']
  if (task.status === '待上传对账单') return [...actions, '上传对账单']
  if (task.status === '待仓管对账') return [...actions, '仓管对账']
  if (task.status === '待财务对账') return [...actions, '财务对账']

  return actions
}

function canChangeFee(task) {
  return feeChangeEnabledStatuses.includes(task.status)
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

function exportTasks() {
  toolbarNotice.value = `已导出当前 ${filteredTasks.value.length} 条数据`
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

  if (action === '确认物流取货' || action === '开始运输' || action === '签收') {
    openLeaveTask(task)
    return
  }

  if (action === '上传对账单') {
    emit('open-reconcile', task.no)
    return
  }

  if (action === '费用变更') {
    openFeeChangeFlow(task)
    return
  }

  showTaskDetail(task.no)
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
        </div>

        <div v-if="toolbarNotice" class="toolbar-notice">{{ toolbarNotice }}</div>

        <div class="table-wrap delivery-table-wrap">
          <table class="delivery-table">
            <thead>
              <tr>
                <th>发货单号</th>
                <th>状态</th>
                <th>出货申请单号</th>
                <th>交货单号</th>
                <th>调拨单号</th>
                <th>要求到货日期</th>
                <th>合同号</th>
                <th>销售单号</th>
                <th>收货单位</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="task in pagedTasks" :key="task.no">
                <td class="link-cell">
                  <button class="text-link" type="button" @click="showTaskDetail(task.no)">{{ task.no }}</button>
                </td>
                <td>{{ task.status }}</td>
                <td>{{ task.applicationNo }}</td>
                <td>{{ task.deliveryNo || '-' }}</td>
                <td>{{ task.transferNo || '-' }}</td>
                <td>{{ task.requiredDate }}</td>
                <td>{{ task.contractNo }}</td>
                <td>{{ task.salesOrderNo }}</td>
                <td>{{ task.receiverCompany }}</td>
                <td class="action-cell">
                  <button
                    v-for="action in tableTaskActions(task)"
                    :key="action"
                    class="action-link"
                    :class="{ warn: action === '作废' }"
                    type="button"
                    @click="handleTaskAction(action, task)"
                  >
                    {{ action }}
                  </button>
                </td>
              </tr>
              <tr v-if="filteredTasks.length === 0">
                <td class="empty-cell" colspan="10">暂无符合条件的发货单</td>
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
              <h1>发货单 {{ selectedShipment.no }}</h1>
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
          <div class="fee-change-summary">
            <span>发货单：{{ activeFeeTask?.no }}</span>
            <span>承运公司：{{ activeFeeTask?.carrier }}</span>
          </div>
          <label class="filter-field">
            <span>费用类型</span>
            <select v-model="feeChangeForm.feeType">
              <option v-for="type in feeChangeTypes" :key="type" :value="type">{{ type }}</option>
            </select>
          </label>
          <label class="filter-field">
            <span>变更金额</span>
            <input v-model="feeChangeForm.amount" type="number" min="0.01" step="0.01" placeholder="请输入金额" />
          </label>
          <label class="filter-field">
            <span>变更原因</span>
            <textarea v-model="feeChangeForm.reason" rows="4" placeholder="请填写费用变更原因"></textarea>
          </label>
          <div class="approval-route" aria-label="审批路径">
            <span v-for="(step, index) in feeChangeApprovalSteps" :key="step">
              {{ step }}<i v-if="index < feeChangeApprovalSteps.length - 1">→</i>
            </span>
          </div>
        </div>
        <div class="org-dialog-foot">
          <button class="btn" type="button" @click="closeFeeChangeDialog">取消</button>
          <button class="btn primary" type="button" @click="submitFeeChangeFlow">提交审批</button>
        </div>
      </section>
    </div>
  </section>
</template>
