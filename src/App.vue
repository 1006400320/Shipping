<script setup>
import { computed, ref } from 'vue'
import CarrierPage from './pages/CarrierPage.vue'
import CompleteDeliveryPage from './pages/CompleteDeliveryPage.vue'
import DnaPage from './pages/DnaPage.vue'
import MaterialPage from './pages/MaterialPage.vue'
import PackScanPage from './pages/PackScanPage.vue'
import PickScanPage from './pages/PickScanPage.vue'
import QcScanPage from './pages/QcScanPage.vue'
import ReconcilePage from './pages/ReconcilePage.vue'
import ReimbursePage from './pages/ReimbursePage.vue'
import WaybillPage from './pages/WaybillPage.vue'
import WorkbenchPage from './pages/WorkbenchPage.vue'

const pageMap = {
  complete: CompleteDeliveryPage,
  workbench: WorkbenchPage,
  pick: PickScanPage,
  qc: QcScanPage,
  pack: PackScanPage,
  dna: DnaPage,
  waybill: WaybillPage,
  reconcile: ReconcilePage,
  reimburse: ReimbursePage,
  materials: MaterialPage,
  carriers: CarrierPage
}

const navGroups = [
  {
    title: '作业中心',
    items: [
      { key: 'workbench', label: '发货作业台' },
      { key: 'pick', label: '扫码拣配' },
      { key: 'qc', label: '扫码抽检' },
      { key: 'pack', label: '扫码封箱' },
      { key: 'dna', label: 'DNA 录入' }
    ]
  },
  {
    title: '物流费用',
    items: [
      { key: 'waybill', label: '物流单号' },
      { key: 'reconcile', label: '对账核价' },
      { key: 'reimburse', label: '报销跟踪' }
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

const currentPage = computed(() => pageMap[activePage.value] || WorkbenchPage)
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

function switchPage(key) {
  activePage.value = key
}

function goBack() {
  if (activePage.value === 'complete') {
    activePage.value = 'workbench'
    return
  }

  if (window.history.length > 1) {
    window.history.back()
  }
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
          <button class="btn back-btn" type="button" @click="goBack">返回</button>
          <div class="breadcrumb">发货管理 / {{ breadcrumbLabel }} / FH202605180001</div>
        </div>
        <div class="top-actions">
          <button class="btn" type="button">打印备料单</button>
          <button class="btn" type="button">打印封箱单</button>
          <button class="btn danger" type="button">作废申请</button>
          <button class="btn primary" type="button">确认当前节点</button>
        </div>
      </header>

      <component
        :is="currentPage"
        @open-complete="switchPage('complete')"
        @back-to-workbench="switchPage('workbench')"
      />
    </main>
  </div>
</template>
