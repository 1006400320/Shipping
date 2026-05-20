<script setup>
import { computed, ref } from 'vue'
import PrototypeNotesPanel from './components/PrototypeNotesPanel.vue'
import CarrierPage from './pages/CarrierPage.vue'
import CompleteDeliveryPage from './pages/CompleteDeliveryPage.vue'
import FreightConfigPage from './pages/FreightConfigPage.vue'
import MaterialPage from './pages/MaterialPage.vue'
import ReconcilePage from './pages/ReconcilePage.vue'
import ReimbursePage from './pages/ReimbursePage.vue'
import WaybillPage from './pages/WaybillPage.vue'
import WorkbenchPage from './pages/WorkbenchPage.vue'

const pageMap = {
  complete: CompleteDeliveryPage,
  workbench: WorkbenchPage,
  waybill: WaybillPage,
  reconcile: ReconcilePage,
  reimburse: ReimbursePage,
  freightConfig: FreightConfigPage,
  materials: MaterialPage,
  carriers: CarrierPage
}

const navGroups = [
  {
    title: '作业中心',
    items: [
      { key: 'workbench', label: '发货作业台' }
    ]
  },
  {
    title: '物流费用',
    items: [
      { key: 'waybill', label: '物流单号' },
      { key: 'reconcile', label: '对账核价' },
      { key: 'reimburse', label: '报销跟踪' },
      { key: 'freightConfig', label: '物流配置' }
    ]
  },
  {
    title: '基础设置',
    items: [
      { key: 'materials', label: '物料档案' },
      { key: 'carriers', label: '物流公司' }
    ]
  }
]

const activePage = ref('workbench')
const pageComponent = ref(null)
const workbenchDetailActive = ref(false)
const activeWorkbenchTaskNo = ref('')

const currentPage = computed(() => pageMap[activePage.value] || WorkbenchPage)
const standalonePageTails = {
  freightConfig: '规则维护'
}
const activeItem = computed(() => {
  for (const group of navGroups) {
    const item = group.items.find((entry) => entry.key === activePage.value)
    if (item) return item
  }
  return navGroups[0].items[0]
})

const breadcrumbLabel = computed(() => {
  if (activePage.value === 'complete') return '发货作业台 / 完善'
  return activeItem.value.label
})
const breadcrumbTail = computed(() => {
  if (activePage.value === 'workbench') {
    return workbenchDetailActive.value ? activeWorkbenchTaskNo.value : '全部发货任务'
  }

  if (standalonePageTails[activePage.value]) {
    return standalonePageTails[activePage.value]
  }

  return 'FH202605180001'
})
const showBackButton = computed(() => activePage.value !== 'workbench' || workbenchDetailActive.value)
const showTopActions = computed(
  () => activePage.value !== 'freightConfig' && (activePage.value !== 'workbench' || workbenchDetailActive.value)
)

function switchPage(key) {
  if (key === 'workbench') {
    pageComponent.value?.showAllTasks?.()
    workbenchDetailActive.value = false
    activeWorkbenchTaskNo.value = ''
  } else {
    workbenchDetailActive.value = false
    activeWorkbenchTaskNo.value = ''
  }

  activePage.value = key
}

function goBack() {
  if (activePage.value === 'workbench' && workbenchDetailActive.value) {
    pageComponent.value?.showAllTasks?.()
    workbenchDetailActive.value = false
    activeWorkbenchTaskNo.value = ''
    return
  }

  if (activePage.value !== 'workbench') {
    switchPage('workbench')
  }
}

function handleWorkbenchDetailChange(taskNo) {
  activeWorkbenchTaskNo.value = taskNo || ''
  workbenchDetailActive.value = Boolean(taskNo)
}
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-mark">LS</span>
        <span>物流过程管控</span>
      </div>

      <template v-for="group in navGroups" :key="group.title">
        <div class="nav-title">{{ group.title }}</div>
        <button
          v-for="item in group.items"
          :key="item.key"
          class="nav-item"
          :class="{ active: item.key === activePage }"
          type="button"
          @click="switchPage(item.key)"
        >
          {{ item.label }}
        </button>
      </template>
    </aside>

    <main class="main">
      <header class="topbar">
        <div class="topbar-left">
          <button v-if="showBackButton" class="btn back-btn" type="button" @click="goBack">返回</button>
          <div class="breadcrumb">发货管理 / {{ breadcrumbLabel }} / {{ breadcrumbTail }}</div>
        </div>
        <div v-if="showTopActions" class="top-actions">
          <button class="btn" type="button">打印备料单</button>
          <button class="btn" type="button">打印封箱单</button>
          <button class="btn danger" type="button">作废申请</button>
          <button class="btn primary" type="button">确认当前节点</button>
        </div>
      </header>

      <component
        ref="pageComponent"
        :is="currentPage"
        @open-complete="switchPage('complete')"
        @back-to-workbench="switchPage('workbench')"
        @detail-change="handleWorkbenchDetailChange"
      />
      <PrototypeNotesPanel :page-key="activePage" :page-label="breadcrumbLabel" />
    </main>
  </div>
</template>
