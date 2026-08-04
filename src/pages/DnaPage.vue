<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { dnaRecords } from '../data/logistics'

const scanInput = ref(null)
const scanCode = ref('DNA-')
const latestMessage = ref('系统无法自动判断物料是否为大件，由录入员人工校验；大件录入 DNA，非大件标记无需录入。')
const latestMessageType = ref('neutral')
const confirmDialogOpen = ref(false)
const dnaCompleted = ref(false)
const deviceNo = 'SCAN-03'
const verifier = 'DNA 录入员'
const dnaCodePattern = /^DNA-[A-Z0-9-]{1,32}$/
const pendingStatuses = ['待人工校验', '待处理']

const records = ref(
  dnaRecords.flatMap((item) => {
    const quantity = Math.max(Number(item.quantity) || 1, 1)

    return Array.from({ length: quantity }, (_, index) => ({
      ...item,
      id: `${item.material}-${index + 1}`,
      sequence: quantity > 1 ? index + 1 : '',
      dnaNo: item.dnaNo || '待录入',
      verifier: item.verifier || '未校验',
      status: item.status || '待人工校验',
      lastScan: '-'
    }))
  })
)

const pendingCount = computed(() => records.value.filter((item) => pendingStatuses.includes(item.status)).length)
const completedCount = computed(() => records.value.filter((item) => !pendingStatuses.includes(item.status)).length)
const dnaRequiredCount = computed(() => records.value.filter((item) => item.status === '已录入DNA').length)
const noDnaCount = computed(() => records.value.filter((item) => item.status === '无需录入').length)
const canFinishDna = computed(() => pendingCount.value === 0 && completedCount.value > 0 && !dnaCompleted.value)

function formatTime(date = new Date()) {
  return date.toLocaleTimeString('zh-CN', { hour12: false })
}

function normalizeDnaCode(rawCode) {
  const value = rawCode.trim().toUpperCase()
  const parts = value.split(/[|,;\s]+/)
  return parts.find((part) => dnaCodePattern.test(part)) || value
}

function submitScan() {
  if (dnaCompleted.value) {
    latestMessage.value = 'DNA 已录入完毕，不能继续扫码修改。'
    latestMessageType.value = 'danger'
    nextTick(() => scanInput.value?.select())
    return
  }

  const rawCode = scanCode.value.trim()

  if (!rawCode) {
    latestMessage.value = '扫码内容为空，请重新扫描。'
    latestMessageType.value = 'danger'
    scanInput.value?.focus()
    return
  }

  const code = normalizeDnaCode(rawCode)

  if (!dnaCodePattern.test(code)) {
    latestMessage.value = `扫码异常：${code} 不是有效 DNA 编号，需以 DNA- 开头。`
    latestMessageType.value = 'danger'
    nextTick(() => scanInput.value?.select())
    return
  }

  const duplicated = records.value.some((item) => item.dnaNo === code)
  if (duplicated) {
    latestMessage.value = `扫码异常：${code} 已录入，禁止重复绑定。`
    latestMessageType.value = 'danger'
    nextTick(() => scanInput.value?.select())
    return
  }

  const target = records.value.find((item) => pendingStatuses.includes(item.status))
  if (!target) {
    latestMessage.value = `扫码异常：${code} 没有可校验的待处理物料。`
    latestMessageType.value = 'danger'
    nextTick(() => scanInput.value?.select())
    return
  }

  target.dnaNo = code
  target.verifier = verifier
  target.status = '已录入DNA'
  target.lastScan = formatTime()
  latestMessage.value = `人工校验为大件：${target.material} 已绑定 ${code}，设备 ${deviceNo}。`
  latestMessageType.value = 'success'

  nextTick(() => scanInput.value?.select())
}

function toggleNoDna(item) {
  if (dnaCompleted.value) {
    latestMessage.value = 'DNA 已录入完毕，不能继续修改人工校验结果。'
    latestMessageType.value = 'danger'
    return
  }

  if (item.status === '无需录入') {
    item.dnaNo = '待录入'
    item.verifier = '未校验'
    item.status = '待处理'
    item.lastScan = '-'
    latestMessage.value = `已切回待处理：${item.material} 可以重新进入人工校验。`
    latestMessageType.value = 'success'
    return
  }

  item.dnaNo = '无需录入'
  item.verifier = verifier
  item.status = '无需录入'
  item.lastScan = formatTime()
  latestMessage.value = `人工校验为非大件：${item.material} 无需录入 DNA。`
  latestMessageType.value = 'success'
}

function openFinishConfirm() {
  if (pendingCount.value > 0) {
    latestMessage.value = `仍有 ${pendingCount.value} 个物料未人工校验，不能确认录入完毕。`
    latestMessageType.value = 'danger'
    scanInput.value?.focus()
    return
  }

  confirmDialogOpen.value = true
}

function cancelFinishConfirm() {
  confirmDialogOpen.value = false
  nextTick(() => scanInput.value?.focus())
}

function confirmFinishDna() {
  dnaCompleted.value = true
  confirmDialogOpen.value = false
  latestMessage.value = '已二次确认：人工校验与 DNA 录入完毕，可进入发厂确认。'
  latestMessageType.value = 'success'
}

onMounted(() => {
  scanInput.value?.focus()
  scanInput.value?.select()
})
</script>

<template>
  <section class="content">
    <section class="page-grid">
      <article class="panel page-hero">
        <h1>DNA 录入</h1>
        <p class="subline">系统无法自动判断物料是否为大件，由录入员人工校验；大件录入 DNA，非大件标记无需录入。</p>
        <form class="scan-input-wrap compact" @submit.prevent="submitScan">
          <input
            ref="scanInput"
            v-model="scanCode"
            class="scan-input"
            aria-label="DNA 扫码输入"
            autocomplete="off"
            @focus="scanInput?.select()"
          />
          <button class="scan-button" type="submit">录入 DNA</button>
        </form>
        <div class="form-actions">
          <button class="btn primary" type="button" :disabled="!canFinishDna" @click="openFinishConfirm">确认录入完毕</button>
        </div>
        <div class="scan-alert" :class="latestMessageType">{{ latestMessage }}</div>
      </article>

      <article class="panel metric">
        <div class="metric-label">待处理物料</div>
        <div class="metric-value">{{ records.length }}</div>
        <div class="metric-note">已处理 {{ completedCount }} 个，待处理 {{ pendingCount }} 个</div>
      </article>
      <article class="panel metric">
        <div class="metric-label">人工校验结果</div>
        <div class="metric-value">{{ dnaRequiredCount }}</div>
        <div class="metric-note">需 DNA {{ dnaRequiredCount }} 个，无需 {{ noDnaCount }} 个</div>
      </article>
    </section>

    <section class="panel">
      <div class="section-head">
        <div class="section-title">人工校验录入清单</div>
        <div class="section-extra">{{ deviceNo }} 在线，大件扫码录入，非大件手工标记</div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>物料编码</th>
              <th>名称</th>
              <th>DNA 编号</th>
              <th>校验人</th>
              <th>最近扫码</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in records" :key="item.id">
              <td>{{ item.material }}</td>
              <td>{{ item.name }}<span v-if="item.sequence"> #{{ item.sequence }}</span></td>
              <td>{{ item.dnaNo }}</td>
              <td>{{ item.verifier }}</td>
              <td>{{ item.lastScan }}</td>
              <td :class="pendingStatuses.includes(item.status) ? 'warn' : 'ok'">{{ item.status }}</td>
              <td>
                <button
                  class="btn table-action no-dna-action"
                  type="button"
                  :disabled="dnaCompleted || (!pendingStatuses.includes(item.status) && item.status !== '无需录入')"
                  @click="toggleNoDna(item)"
                >
                  {{ item.status === '无需录入' ? '切回待处理' : '无需录入DNA' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div v-if="confirmDialogOpen" class="modal-mask">
      <section class="modal-card dna-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="dnaConfirmTitle">
        <div class="modal-head">
          <div id="dnaConfirmTitle" class="section-title">二次确认录入完毕</div>
        </div>
        <p class="modal-copy">确认后将锁定本次人工校验结果和 DNA 录入结果，并开放发厂确认。</p>
        <div class="dialog-actions">
          <button class="btn" type="button" @click="cancelFinishConfirm">返回检查</button>
          <button class="btn primary" type="button" @click="confirmFinishDna">二次确认完成</button>
        </div>
      </section>
    </div>
  </section>
</template>
