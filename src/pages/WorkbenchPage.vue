<script setup>
import { computed, ref } from 'vue'
import { materials, scanEvents, shipment, shipmentTasks, steps, tags } from '../data/logistics'

const emit = defineEmits(['open-complete', 'detail-change'])

const selectedTaskNo = ref('')
const activeTaskTab = ref('all')
const keyword = ref('')
const startDate = ref('2026-02-01')
const endDate = ref('2026-02-28')
const carrierFilter = ref('')
const toolbarNotice = ref('')

const taskStatusTabs = [
  { key: 'draft', label: '待完善', status: '待完善' },
  { key: 'print', label: '待打印', status: '待打印' },
  { key: 'pick', label: '待拣配', status: '待拣配' },
  { key: 'qc', label: '待抽检', status: '待抽检' },
  { key: 'pack', label: '待封箱贴单', status: '待封箱贴单' },
  { key: 'dna', label: '待录入DNA', status: '待录入DNA' },
  { key: 'pickup', label: '待物流取货', status: '待物流取货' },
  { key: 'leave', label: '待装车离厂', status: '待装车离厂' },
  { key: 'reconcile', label: '待上传对账单', status: '待上传对账单' }
]

const activeTask = computed(() => shipmentTasks.find((task) => task.no === selectedTaskNo.value))
const isTaskList = computed(() => !activeTask.value)
const selectedShipment = computed(() => activeTask.value || shipment)
const detailTags = computed(() => {
  if (!activeTask.value) return tags

  return [
    { text: activeTask.value.status, tone: activeTask.value.tone },
    { text: activeTask.value.priority, tone: activeTask.value.priority === '加急' ? 'amber' : 'neutral' },
    { text: activeTask.value.feeStatus, tone: 'neutral' }
  ]
})

const taskTabs = computed(() => [
  { key: 'all', label: '全部', count: shipmentTasks.length },
  ...taskStatusTabs.map((tab) => ({
    key: tab.key,
    label: tab.label,
    count: countByTab(tab.key)
  }))
])

const carrierOptions = computed(() => [...new Set(shipmentTasks.map((task) => task.carrier))])
const filteredTasks = computed(() => {
  const query = keyword.value.trim().toLowerCase()

  return shipmentTasks.filter((task) => {
    if (!matchesTaskTab(task, activeTaskTab.value)) return false
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

const summary = computed(() => [
  {
    label: '物料扫码进度',
    value: `${selectedShipment.value.progress.done} / ${selectedShipment.value.progress.total}`,
    note: `剩余 ${selectedShipment.value.progress.total - selectedShipment.value.progress.done} 件待装箱`
  },
  {
    label: '箱数',
    value: `${selectedShipment.value.boxes.total} 箱`,
    note: `${selectedShipment.value.boxes.sealed} 箱已封，${selectedShipment.value.boxes.active} 箱进行中`
  },
  {
    label: '费用状态',
    value: selectedShipment.value.feeStatus,
    note: '发厂后由物流公司上传'
  }
])

function matchesTaskTab(task, key) {
  if (key === 'all') return true

  const statusTab = taskStatusTabs.find((tab) => tab.key === key)
  if (statusTab) return task.status === statusTab.status

  return true
}

function countByTab(key) {
  return shipmentTasks.filter((task) => matchesTaskTab(task, key)).length
}

function taskActions(task) {
  const actions = ['详情']

  if (task.status === '待完善') return [...actions, '完善', '废弃']
  if (task.status === '待打印') return [...actions, '打印', '废弃']
  if (task.status === '待拣配') return [...actions, '拣配']
  if (task.status === '待抽检') return [...actions, '抽检']
  if (task.status === '待封箱贴单') return [...actions, '封箱贴单']
  if (task.status === '待录入DNA') return [...actions, '录入DNA']
  if (task.status === '待物流取货') return [...actions, '发车离厂']

  return actions
}

function showTaskDetail(taskNo) {
  selectedTaskNo.value = taskNo
  emit('detail-change', taskNo)
}

function showAllTasks() {
  selectedTaskNo.value = ''
  emit('detail-change', '')
}

function runSearch() {
  toolbarNotice.value = `已查询到 ${filteredTasks.value.length} 条数据`
}

function resetFilters() {
  activeTaskTab.value = 'all'
  keyword.value = ''
  startDate.value = '2026-02-01'
  endDate.value = '2026-02-28'
  carrierFilter.value = ''
  toolbarNotice.value = ''
}

function exportTasks() {
  toolbarNotice.value = `已导出当前 ${filteredTasks.value.length} 条数据`
}

function handleTaskAction(action, task) {
  if (action === '完善') {
    selectedTaskNo.value = task.no
    emit('open-complete')
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
            {{ tab.label }}<span v-if="tab.count !== undefined">（{{ tab.count }}）</span>
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
                <th>送货单号</th>
                <th>状态</th>
                <th>出货申请单号</th>
                <th>交货单号</th>
                <th>调拨单号</th>
                <th>要求到货日</th>
                <th>合同号</th>
                <th>销售单号</th>
                <th>收货单位</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="task in filteredTasks" :key="task.no">
                <td class="link-cell">
                  <button class="text-link" type="button" @click="showTaskDetail(task.no)">{{ task.no }}</button>
                </td>
                <td>{{ task.status }}</td>
                <td><button class="text-link" type="button" @click="showTaskDetail(task.no)">{{ task.applicationNo }}</button></td>
                <td>{{ task.deliveryNo || '-' }}</td>
                <td>{{ task.transferNo || '-' }}</td>
                <td>{{ task.requiredDate }}</td>
                <td>{{ task.contractNo }}</td>
                <td>{{ task.salesOrderNo }}</td>
                <td>{{ task.receiverCompany }}</td>
                <td class="action-cell">
                  <button
                    v-for="action in taskActions(task)"
                    :key="action"
                    class="action-link"
                    :class="{ warn: action === '废弃' }"
                    type="button"
                    @click="handleTaskAction(action, task)"
                  >
                    {{ action }}
                  </button>
                </td>
              </tr>
              <tr v-if="filteredTasks.length === 0">
                <td class="empty-cell" colspan="10">暂无符合条件的送货单</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination-bar">
          <span>共{{ shipmentTasks.length }}条数据</span>
          <button class="pager-btn" type="button" disabled>&lt;</button>
          <button class="pager-btn active" type="button">1</button>
          <button class="pager-btn" type="button">2</button>
          <button class="pager-btn" type="button">3</button>
          <button class="pager-btn" type="button">&gt;</button>
          <select class="page-size" aria-label="每页条数">
            <option>10 条/页</option>
            <option>20 条/页</option>
          </select>
          <span>跳至</span>
          <input class="jump-input" type="number" min="1" value="1" />
          <span>页</span>
        </div>
      </section>
    </template>

    <template v-else>
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
          <div class="shipment-actions">
            <span class="tag blue">当前：{{ selectedShipment.currentNode }}</span>
            <button class="btn" type="button" @click="showAllTasks">全部任务</button>
            <button
              v-if="selectedShipment.currentNode === '完善'"
              class="btn primary"
              type="button"
              @click="emit('open-complete')"
            >
              完善
            </button>
          </div>
        </div>

        <div class="tag-row">
          <span v-for="tag in detailTags" :key="tag.text" class="tag" :class="tag.tone">{{ tag.text }}</span>
        </div>
      </article>

      <article v-for="item in summary" :key="item.label" class="panel metric">
        <div class="metric-label">{{ item.label }}</div>
        <div class="metric-value">{{ item.value }}</div>
        <div class="metric-note">{{ item.note }}</div>
      </article>
    </section>

    <section class="panel flow">
      <div v-for="step in steps" :key="step.name" class="step" :class="step.state">
        <div class="step-name">{{ step.name }}</div>
        <div class="step-owner">{{ step.owner }}</div>
      </div>
    </section>

    <section class="workspace">
      <div class="left-column">
        <section class="panel material-panel">
          <div class="section-head">
            <div class="section-title">发货物料明细</div>
            <div class="section-extra">拣配、抽检、封箱均来自扫码记录</div>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>物料码</th>
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
                  <td class="qty">{{ item.planned }}</td>
                  <td class="qty">{{ item.picked }}</td>
                  <td class="qty">{{ item.checked }}</td>
                  <td class="qty">{{ item.packed }}</td>
                  <td>{{ item.box }}</td>
                  <td :class="item.tone">{{ item.status }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <aside class="side-stack">
        <section class="panel">
          <div class="section-head">
            <div class="section-title">操作痕迹</div>
            <div class="section-extra">最近扫码</div>
          </div>
          <div class="timeline">
            <div v-for="event in scanEvents" :key="event.time + event.note" class="event">
              <div class="event-time">{{ event.time }}</div>
              <div>
                <div class="event-main" :class="event.tone">{{ event.title }}</div>
                <div class="event-note">{{ event.note }}</div>
              </div>
            </div>
          </div>
        </section>

        <section class="panel exception-panel">
          <div class="section-head">
            <div class="section-title">异常处理</div>
            <div class="section-extra">1 条待处理</div>
          </div>
          <div class="info-list">
            <div class="info-row"><span class="label">异常类型</span><span class="value">重复装箱</span></div>
            <div class="info-row"><span class="label">异常条码</span><span class="value">MAT-AX009</span></div>
            <div class="info-row"><span class="label">处理建议</span><span class="value">从 2 号箱移除或撤销本次扫描</span></div>
          </div>
        </section>
      </aside>
    </section>
    </template>
  </section>
</template>
