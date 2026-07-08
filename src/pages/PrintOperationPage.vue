<script setup>
import { computed, nextTick, ref } from 'vue'
import { materials, shipmentTasks } from '../data/logistics'

const props = defineProps({
  taskNo: {
    type: String,
    default: ''
  }
})

const selectedDoc = ref('delivery')
const noticeDialogOpen = ref(false)
const noticeDialogMessage = ref('')

const selectedTaskNos = computed(() => props.taskNo.split(',').map((item) => item.trim()).filter(Boolean))
const selectedTasks = computed(() => {
  const tasks = shipmentTasks.filter((item) => selectedTaskNos.value.includes(item.no))
  if (tasks.length) return tasks

  const fallback = shipmentTasks.find((item) => item.status === '待打印') || shipmentTasks[0]
  return fallback ? [fallback] : []
})
const activeTask = computed(() => selectedTasks.value[0] || shipmentTasks[0])
const printableMaterials = computed(() => materials.slice(0, 10))
const docTitle = computed(() => {
  if (selectedDoc.value === 'prepare') return '送货单'
  if (selectedDoc.value === 'packing') return '调拨单'
  return '交货单'
})

const docOptions = [
  { key: 'delivery', label: '交货单' },
  { key: 'prepare', label: '送货单' },
  { key: 'packing', label: '调拨单' }
]

function formatDateTime() {
  const date = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function markPrinted() {
  if (!selectedTasks.value.length) return

  selectedTasks.value.forEach((task) => {
    task.status = '待拣配'
    task.currentNode = '拣配'
  })
  showNoticeDialog(`${selectedTasks.value.map((task) => task.no).join('、')} 已确认打印，状态已流转为待拣配`)
}

function printCurrentDoc() {
  nextTick(() => window.print())
}

function showNoticeDialog(message) {
  noticeDialogMessage.value = message
  noticeDialogOpen.value = true
}

function closeNoticeDialog() {
  noticeDialogOpen.value = false
  noticeDialogMessage.value = ''
}
</script>

<template>
  <section class="content print-operation-page">
    <section class="panel print-operation-toolbar">
      <div>
        <h1>打印操作页</h1>
        <p class="subline">已选择 {{ selectedTasks.length }} 个送货单：{{ selectedTasks.map((task) => task.no).join('、') }}</p>
      </div>
      <div class="print-operation-actions">
        <button class="btn" type="button" @click="printCurrentDoc">打印当前单据</button>
        <button class="btn primary" type="button" @click="markPrinted">确认已打印</button>
      </div>
    </section>

    <section class="print-operation-layout">
      <aside class="panel print-doc-list">
        <button
          v-for="doc in docOptions"
          :key="doc.key"
          class="print-doc-item"
          :class="{ active: selectedDoc === doc.key }"
          type="button"
          @click="selectedDoc = doc.key"
        >
          <strong>{{ doc.label }}</strong>
          <span>{{ doc.key === 'packing' ? `${activeTask.boxes.total} 箱` : `${activeTask.progress.total} 项物料` }}</span>
        </button>
      </aside>

      <section class="panel print-preview-panel">
        <div v-for="task in selectedTasks" :key="task.no" class="delivery-print-page print-operation-sheet">
          <header class="print-delivery-header">
            <div class="print-brand">
              <span class="brand-mark">LS</span>
            </div>
            <div class="print-title">
              <h1>物流过程管控系统</h1>
              <strong>{{ docTitle }}</strong>
            </div>
            <div class="print-qr-wrap">
              <div class="print-qr" aria-label="单据二维码">
                <span v-for="index in 121" :key="index" :class="{ filled: (index + task.no.length) % 3 !== 0 }"></span>
              </div>
              <span>{{ task.no }}</span>
            </div>
          </header>

          <section class="print-info-grid">
            <div class="print-info-list">
              <div><span>送货单号</span><strong>{{ task.no }}</strong></div>
              <div><span>出货申请单号</span><strong>{{ task.applicationNo }}</strong></div>
              <div><span>交货单号</span><strong>{{ task.deliveryNo || '-' }}</strong></div>
              <div><span>调拨单号</span><strong>{{ task.transferNo || '-' }}</strong></div>
              <div><span>合同号</span><strong>{{ task.contractNo }}</strong></div>
            </div>
            <div class="print-info-list">
              <div><span>收货单位</span><strong>{{ task.receiverCompany }}</strong></div>
              <div><span>收货人</span><strong>{{ task.receiver }} {{ task.phone }}</strong></div>
              <div class="print-wide-line"><span>收货地址</span><strong>{{ task.address }}</strong></div>
              <div><span>承运公司</span><strong>{{ task.carrier }}</strong></div>
              <div><span>打印时间</span><strong>{{ formatDateTime() }}</strong></div>
            </div>
          </section>

          <table class="print-material-table">
            <thead>
              <tr>
                <th>序号</th>
                <th>物料编码</th>
                <th>物料名称</th>
                <th>计划数</th>
                <th>已拣</th>
                <th>已检</th>
                <th>已装箱</th>
                <th>箱码</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in printableMaterials" :key="item.code">
                <td>{{ index + 1 }}</td>
                <td>{{ item.code }}</td>
                <td class="print-text-left">{{ item.name }}</td>
                <td>{{ item.planned }}</td>
                <td>{{ item.picked }}</td>
                <td>{{ item.checked }}</td>
                <td>{{ item.packed }}</td>
                <td>{{ item.box }}</td>
              </tr>
              <tr class="print-total-row">
                <td colspan="3">合计</td>
                <td>{{ task.progress.total }}</td>
                <td>{{ task.progress.done }}</td>
                <td>{{ task.progress.done }}</td>
                <td>{{ task.boxes.sealed }}</td>
                <td>{{ task.boxes.total }} 箱</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </section>

    <div v-if="noticeDialogOpen" class="modal-backdrop">
      <section class="org-dialog alert-dialog" role="alertdialog" aria-modal="true" aria-label="提示">
        <div class="org-dialog-head">
          <strong>提示</strong>
          <button class="dialog-close" type="button" aria-label="关闭" @click="closeNoticeDialog">×</button>
        </div>
        <div class="alert-dialog-body">{{ noticeDialogMessage }}</div>
        <div class="org-dialog-foot">
          <button class="btn primary" type="button" @click="closeNoticeDialog">知道了</button>
        </div>
      </section>
    </div>
  </section>
</template>
