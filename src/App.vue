<script setup>
import { computed, ref } from 'vue'
import BusinessFlowPage from './pages/BusinessFlowPage.vue'
import AccessoryBoxManagePage from './pages/AccessoryBoxManagePage.vue'
import CompleteDeliveryPage from './pages/CompleteDeliveryPage.vue'
import DnaPage from './pages/DnaPage.vue'
import EmployeeMobilePage from './pages/EmployeeMobilePage.vue'
import FreightConfigPage from './pages/FreightConfigPage.vue'
import LeaveConfirmPage from './pages/LeaveConfirmPage.vue'
import LogisticsMobilePage from './pages/LogisticsMobilePage.vue'
import PackScanPage from './pages/PackScanPage.vue'
import PickScanPage from './pages/PickScanPage.vue'
import PrintOperationPage from './pages/PrintOperationPage.vue'
import ShipmentApplicationPage from './pages/ShipmentApplicationPage.vue'
import QcScanPage from './pages/QcScanPage.vue'
import ReconcilePage from './pages/ReconcilePage.vue'
import WorkbenchPage from './pages/WorkbenchPage.vue'

const pageMap = {
  businessFlow: BusinessFlowPage,
  accessoryBoxes: AccessoryBoxManagePage,
  complete: CompleteDeliveryPage,
  employeeMobile: EmployeeMobilePage,
  logisticsMobile: LogisticsMobilePage,
  workbench: WorkbenchPage,
  printOperation: PrintOperationPage,
  pickScan: PickScanPage,
  qcScan: QcScanPage,
  packScan: PackScanPage,
  dna: DnaPage,
  shipmentApplication: ShipmentApplicationPage,
  leaveConfirm: LeaveConfirmPage,
  reconcile: ReconcilePage,
  freightConfig: FreightConfigPage
}
const pageKeys = new Set(Object.keys(pageMap))

const navGroups = [
  {
    title: '流程总览',
    items: [{ key: 'businessFlow', label: '业务流程图' }]
  },
  {
    title: '作业中心',
    items: [
      { key: 'workbench', label: '发货作业台' },
      { key: 'accessoryBoxes', label: '配件箱管理' }
    ]
  },
  {
    title: '移动端',
    items: [
      { key: 'employeeMobile', label: '员工端' },
      { key: 'logisticsMobile', label: '物流端' }
    ]
  },
  {
    title: '物流费用',
    items: [
      { key: 'reconcile', label: '对账单' },
      { key: 'freightConfig', label: '物流配置' }
    ]
  }
]

const activePage = ref('workbench')
const pageComponent = ref(null)
const workbenchDetailActive = ref(false)
const activeWorkbenchTaskNo = ref('')
const activeCompleteTaskNo = ref('')
const activePrintTaskNo = ref('')
const activePickTaskNo = ref('')
const activeQcTaskNo = ref('')
const activePackTaskNo = ref('')
const activeDnaTaskNo = ref('')
const activeLeaveTaskNo = ref('')
const activeShipmentApplicationNo = ref('')
const activeReconcileTaskNo = ref('')
const lastEntryPage = ref('')
const sidebarCollapsed = ref(false)
const pickConfirmState = ref({
  disabled: true,
  label: '拣配完成'
})
const mobileHubKeys = ['employeeMobile', 'logisticsMobile']
const mobileTaskKeys = ['pickScan', 'qcScan', 'packScan', 'dna', 'leaveConfirm']
const operationPageKeys = ['complete', 'printOperation', 'pickScan', 'qcScan', 'packScan', 'dna', 'shipmentApplication', 'leaveConfirm']

const currentPage = computed(() => pageMap[activePage.value] || WorkbenchPage)
const currentTaskNo = computed(() => {
  if (activePage.value === 'complete') return activeCompleteTaskNo.value
  if (activePage.value === 'printOperation') return activePrintTaskNo.value
  if (activePage.value === 'pickScan') return activePickTaskNo.value
  if (activePage.value === 'qcScan') return activeQcTaskNo.value
  if (activePage.value === 'packScan') return activePackTaskNo.value
  if (activePage.value === 'dna') return activeDnaTaskNo.value
  if (activePage.value === 'shipmentApplication') return activeShipmentApplicationNo.value
  if (activePage.value === 'leaveConfirm') return activeLeaveTaskNo.value
  if (activePage.value === 'reconcile') return activeReconcileTaskNo.value
  return ''
})

const standalonePageTails = {
  employeeMobile: '员工端入口',
  logisticsMobile: '物流端入口',
  freightConfig: '规则维护',
  accessoryBoxes: '全部配件箱'
}

const activeItem = computed(() => {
  for (const group of navGroups) {
    const item = group.items.find((entry) => entry.key === activePage.value)
    if (item) return item
  }
  return navGroups[0].items[0]
})

const breadcrumbLabel = computed(() => {
  if (activePage.value === 'printOperation') return '发货作业台 / 打印'
  if (activePage.value === 'complete') return '发货作业台 / 完善'
  return activeItem.value.label
})

const breadcrumbTail = computed(() => {
  if (activePage.value === 'workbench') {
    return workbenchDetailActive.value ? activeWorkbenchTaskNo.value : '全部发货任务'
  }

  if (activePage.value === 'pickScan') return activePickTaskNo.value || '待拣配交货单'
  if (activePage.value === 'qcScan') return activeQcTaskNo.value || '抽检作业单'
  if (activePage.value === 'packScan') return activePackTaskNo.value || '封箱贴单作业单'
  if (activePage.value === 'dna') return activeDnaTaskNo.value || 'DNA 录入作业单'
  if (activePage.value === 'shipmentApplication') return activeShipmentApplicationNo.value || '出货申请流程'
  if (activePage.value === 'leaveConfirm') return activeLeaveTaskNo.value || '开始运输确认单'
  if (activePage.value === 'printOperation') return activePrintTaskNo.value || '待打印交货单'
  if (standalonePageTails[activePage.value]) return standalonePageTails[activePage.value]

  return 'FH202605180001'
})

const showBackButton = computed(
  () => workbenchDetailActive.value || operationPageKeys.includes(activePage.value) || Boolean(activeReconcileTaskNo.value)
)
const showPickConfirmButton = computed(() => activePage.value === 'pickScan')
const mobileNavGroups = computed(() => navGroups)

function switchPage(key, taskNo = '') {
  if (!pageKeys.has(key)) {
    switchPage('workbench')
    return
  }

  if (mobileTaskKeys.includes(key) && mobileHubKeys.includes(activePage.value)) {
    lastEntryPage.value = activePage.value
  } else if (mobileHubKeys.includes(key)) {
    lastEntryPage.value = ''
  } else if (!['complete'].includes(key)) {
    lastEntryPage.value = ''
  }

  if (key === 'workbench') {
    pageComponent.value?.showAllTasks?.()
    workbenchDetailActive.value = false
    activeWorkbenchTaskNo.value = ''
    activeCompleteTaskNo.value = ''
    activePrintTaskNo.value = ''
    activePickTaskNo.value = ''
    activeQcTaskNo.value = ''
    activePackTaskNo.value = ''
    activeDnaTaskNo.value = ''
    activeLeaveTaskNo.value = ''
    activeReconcileTaskNo.value = ''
  } else {
    workbenchDetailActive.value = false
    activeWorkbenchTaskNo.value = ''
  }

  activeCompleteTaskNo.value = key === 'complete' ? taskNo : ''
  activePrintTaskNo.value = key === 'printOperation' ? taskNo : ''
  activePickTaskNo.value = key === 'pickScan' ? taskNo : ''
  activeQcTaskNo.value = key === 'qcScan' ? taskNo : ''
  activePackTaskNo.value = key === 'packScan' ? taskNo : ''
  activeDnaTaskNo.value = key === 'dna' ? taskNo : ''
  activeShipmentApplicationNo.value = key === 'shipmentApplication' ? taskNo : ''
  activeLeaveTaskNo.value = key === 'leaveConfirm' ? taskNo : ''
  activeReconcileTaskNo.value = key === 'reconcile' ? taskNo : ''

  activePage.value = key
}

function handleWorkbenchDetailChange(taskNo) {
  activeWorkbenchTaskNo.value = taskNo || ''
  workbenchDetailActive.value = Boolean(taskNo)
}

function goBack() {
  if (activePage.value === 'workbench' && workbenchDetailActive.value) {
    pageComponent.value?.showAllTasks?.()
    workbenchDetailActive.value = false
    activeWorkbenchTaskNo.value = ''
    return
  }

  if (mobileTaskKeys.includes(activePage.value) && mobileHubKeys.includes(lastEntryPage.value)) {
    switchPage(lastEntryPage.value)
    return
  }

  switchPage('workbench')
}

function handlePickConfirmState(state) {
  pickConfirmState.value = {
    disabled: Boolean(state?.disabled),
    label: state?.label || '拣配完成'
  }
}

function confirmPickFromTopbar() {
  pageComponent.value?.confirmPickComplete?.()
}

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
}
</script>

<template>
  <div class="app-shell" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-mark">LS</span>
        <span class="brand-name">物流过程管控</span>
        <button
          class="sidebar-toggle"
          type="button"
          :aria-label="sidebarCollapsed ? '展开菜单' : '收起菜单'"
          :title="sidebarCollapsed ? '展开菜单' : '收起菜单'"
          :aria-expanded="!sidebarCollapsed"
          @click="toggleSidebar"
        >
          <span class="sidebar-toggle-icon" aria-hidden="true"></span>
        </button>
      </div>

      <template v-for="group in navGroups" :key="group.title">
        <div class="nav-title">{{ group.title }}</div>
        <button
          v-for="item in group.items"
          :key="item.key"
          class="nav-item"
          :class="{ active: item.key === activePage }"
          type="button"
          :title="sidebarCollapsed ? item.label : ''"
          @click="switchPage(item.key)"
        >
          <span class="nav-item-mark" aria-hidden="true">{{ item.label.slice(0, 1) }}</span>
          <span class="nav-item-label">{{ item.label }}</span>
        </button>
      </template>
    </aside>

    <main class="main">
      <header class="topbar">
        <div class="topbar-left">
          <div class="breadcrumb">发货管理 / {{ breadcrumbLabel }} / {{ breadcrumbTail }}</div>
        </div>
        <div class="topbar-actions">
          <button v-if="showBackButton" class="btn back-btn" type="button" @click="goBack">返回</button>
          <button
            v-if="showPickConfirmButton"
            class="btn primary"
            type="button"
            :disabled="pickConfirmState.disabled"
            @click="confirmPickFromTopbar"
          >
            {{ pickConfirmState.label }}
          </button>
        </div>
      </header>

      <nav class="mobile-nav" aria-label="移动端菜单">
        <section v-for="group in mobileNavGroups" :key="group.title" class="mobile-nav-group">
          <div class="mobile-nav-title">{{ group.title }}</div>
          <div class="mobile-nav-list">
            <button
              v-for="item in group.items"
              :key="item.key"
              class="mobile-nav-item"
              :class="{ active: item.key === activePage }"
              type="button"
              @click="switchPage(item.key)"
            >
              {{ item.label }}
            </button>
          </div>
        </section>
      </nav>

      <component
        ref="pageComponent"
        :is="currentPage"
        :task-no="currentTaskNo"
        @open-workbench="switchPage('workbench')"
        @open-complete="switchPage('complete', $event)"
        @open-print="switchPage('printOperation', $event)"
        @open-pick="switchPage('pickScan', $event)"
        @open-qc="switchPage('qcScan', $event)"
        @open-pack="switchPage('packScan', $event)"
        @open-dna="switchPage('dna', $event)"
        @open-shipment-application="switchPage('shipmentApplication', $event)"
        @open-leave="switchPage('leaveConfirm', $event)"
        @open-reconcile="switchPage('reconcile', $event)"
        @back-to-workbench="switchPage('workbench')"
        @detail-change="handleWorkbenchDetailChange"
        @pick-confirm-state="handlePickConfirmState"
      />
    </main>
  </div>
</template>
