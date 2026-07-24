<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { boxes, materials } from '../data/logistics'

const props = defineProps({
  taskNo: {
    type: String,
    default: ''
  }
})

const scanInput = ref(null)
const scanCode = ref('BOX-20260518-003')
const latestMessage = ref('封箱贴单支持扫描箱码、65 开头 8 位物料编码、调拨单码。')
const latestMessageType = ref('neutral')
const packer = '李明'
const deviceNo = 'SCAN-PACK-01'
const activeBoxNo = ref('BOX-20260518-003')
const packageNo = ref('PKG-003')
const labelBound = ref(false)
const exceptionCount = ref(0)
const packingListOpen = ref(false)

const packingListInfo = {
  remark: '封箱前核对箱内物料，贴单后交由物流发运。',
  deliveryNo: '81113003',
  route: '北京 → 深圳',
  receiver: '张*三',
  address: '北京市朝阳区项目仓 → 广东省深圳市南山区科技园'
}

const packRows = ref(
  materials.map((item) => ({
    code: item.code,
    name: item.name,
    planned: item.planned,
    packed: item.packed,
    box: item.box,
    status: item.packed >= item.planned ? '完成' : '待补扫',
    tone: item.packed >= item.planned ? 'ok' : 'warn',
    lastScan: item.packed >= item.planned ? '10:41:55' : '-'
  }))
)

const timeline = ref([
  { time: '10:41:55', title: '箱码绑定成功', note: 'BOX-20260518-003，封箱员李明', tone: 'success' },
  { time: '10:38:21', title: '物料装箱成功', note: '65002008 已绑定 BOX-002', tone: 'success' },
  { time: '10:22:09', title: '封箱贴单开始', note: `任务 ${props.taskNo || 'FH202605180001'}，设备 ${deviceNo}`, tone: 'success' }
])

const totalPlanned = computed(() => packRows.value.reduce((sum, item) => sum + item.planned, 0))
const totalPacked = computed(() => packRows.value.reduce((sum, item) => sum + item.packed, 0))
const pendingCount = computed(() => Math.max(totalPlanned.value - totalPacked.value, 0))
const progressPercent = computed(() => Math.min(Math.round((totalPacked.value / totalPlanned.value) * 100), 100))
const activeBox = computed(() => boxes.find((box) => box.no === activeBoxNo.value))
const stats = computed(() => [
  { label: '计划数量', value: totalPlanned.value },
  { label: '已装箱', value: totalPacked.value, tone: pendingCount.value ? '' : 'success' },
  { label: '待补扫', value: pendingCount.value, tone: pendingCount.value ? 'warn' : 'success' },
  { label: '异常', value: exceptionCount.value, tone: exceptionCount.value ? 'danger' : '' }
])

function formatTime(date = new Date()) {
  return date.toLocaleTimeString('zh-CN', { hour12: false })
}

function addTimeline(title, note, tone = 'success') {
  timeline.value.unshift({ time: formatTime(), title, note, tone })
}

function normalizeScanCode(rawCode) {
  const value = rawCode.trim().toUpperCase()
  const parts = value.split(/[|,;\s]+/)
  return (
    parts.find((part) => /^65\d{6}$/.test(part)) ||
    parts.find((part) => /^BOX-[A-Z0-9-]+$/.test(part)) ||
    parts.find((part) => /^PKG-[A-Z0-9-]+$/.test(part)) ||
    value
  )
}

function failScan(code, reason) {
  exceptionCount.value += 1
  latestMessage.value = `扫码异常：${code} ${reason}`
  latestMessageType.value = 'danger'
  addTimeline('封箱贴单失败', `${code} ${reason}，设备 ${deviceNo}`, 'danger')
}

function submitScan() {
  const rawCode = scanCode.value.trim()
  if (!rawCode) {
    failScan('空码', '扫码内容为空，请重新扫描。')
    focusScannerInput()
    return
  }

  const code = normalizeScanCode(rawCode)

  if (/^BOX-[A-Z0-9-]+$/.test(code)) {
    activeBoxNo.value = code
    latestMessage.value = `箱码绑定成功：${code} 已设为当前封箱箱码。`
    latestMessageType.value = 'success'
    addTimeline('箱码绑定成功', `${code} 已设为当前箱`, 'success')
  } else if (/^PKG-[A-Z0-9-]+$/.test(code)) {
    packageNo.value = code
    labelBound.value = true
    latestMessage.value = `调拨单码绑定成功：${code}，可打印并贴单。`
    latestMessageType.value = 'success'
    addTimeline('调拨单码绑定成功', `${code} 已绑定 ${activeBoxNo.value}`, 'success')
  } else if (/^65\d{6}$/.test(code)) {
    const row = packRows.value.find((item) => item.code === code)
    if (!row) {
      failScan(code, '不属于当前封箱清单。')
    } else if (row.packed >= row.planned) {
      failScan(code, '已达到计划数量，禁止重复装箱。')
    } else {
      row.packed += 1
      row.box = activeBoxNo.value
      row.status = row.packed >= row.planned ? '完成' : '待补扫'
      row.tone = row.packed >= row.planned ? 'ok' : 'warn'
      row.lastScan = formatTime()
      latestMessage.value = `物料装箱成功：${code} 已绑定 ${activeBoxNo.value}。`
      latestMessageType.value = 'success'
      addTimeline('物料装箱成功', `${code} 已绑定 ${activeBoxNo.value}`, 'success')
    }
  } else {
    failScan(code, '不是有效箱码、调拨单码或物料编码。')
  }

  focusScannerInput()
}

function openPackingList() {
  packingListOpen.value = true
}

function closePackingList() {
  packingListOpen.value = false
  focusScannerInput()
}

function focusScannerInput() {
  nextTick(() => {
    scanInput.value?.focus()
    scanInput.value?.select()
  })
}

function keepScannerFocus(event) {
  const target = event.target
  if (target?.closest?.('button, input, select, textarea, a')) return
  focusScannerInput()
}

onMounted(() => {
  focusScannerInput()
  window.addEventListener('click', keepScannerFocus)
})

onBeforeUnmount(() => {
  window.removeEventListener('click', keepScannerFocus)
})
</script>

<template>
  <section class="content">
    <section class="workspace pack-workspace">
      <div class="left-column">
        <div class="body-grid">
          <section class="panel">
            <div class="section-head">
              <div class="section-title">封箱贴单作业台</div>
              <div class="section-extra">{{ deviceNo }} 在线</div>
            </div>
            <div class="scan-console">
              <form class="scan-input-wrap" @submit.prevent="submitScan">
                <input
                  ref="scanInput"
                  v-model="scanCode"
                  class="scan-input"
                  aria-label="封箱贴单扫码输入"
                  autocomplete="off"
                  autocapitalize="off"
                  spellcheck="false"
                  inputmode="text"
                  @focus="scanInput?.select()"
                  @blur="focusScannerInput"
                />
                <button class="scan-button" type="submit">扫码确认</button>
                <button class="scan-button secondary" type="button" @click="openPackingList">打印装箱清单</button>
              </form>

              <div class="progress-meter" aria-label="封箱贴单进度">
                <span :style="{ width: progressPercent + '%' }"></span>
              </div>

              <div class="progress-row">
                <div v-for="stat in stats" :key="stat.label" class="mini-stat" :class="stat.tone">
                  <span>{{ stat.label }}</span>
                  <strong>{{ stat.value }}</strong>
                </div>
              </div>

              <div class="scan-alert" :class="latestMessageType">{{ latestMessage }}</div>
            </div>
          </section>

          <section class="panel">
            <div class="section-head">
              <div class="section-title">当前箱信息</div>
              <div class="section-extra">{{ activeBoxNo }}</div>
            </div>
            <div class="info-list">
              <div class="info-row"><span class="label">箱状态</span><span class="value">{{ activeBox?.status || '封箱中' }}</span></div>
              <div class="info-row"><span class="label">封箱员</span><span class="value">{{ packer }}</span></div>
              <div class="info-row"><span class="label">调拨单码</span><span class="value">{{ packageNo }} {{ labelBound ? '已绑定' : '待绑定' }}</span></div>
              <div class="info-row"><span class="label">箱内数量</span><span class="value">{{ totalPacked }} / {{ totalPlanned }}</span></div>
              <div class="info-row"><span class="label">下一步</span><span class="value">{{ pendingCount ? `补扫 ${pendingCount} 件物料` : '打印调拨单并贴单' }}</span></div>
            </div>
          </section>
        </div>

        <section class="panel material-panel">
          <div class="section-head">
            <div class="section-title">物料装箱明细</div>
            <div class="section-extra">箱码、物料编码、调拨单码均来自扫码记录</div>
          </div>
          <div class="table-wrap">
            <table class="pack-table">
              <thead>
                <tr>
                  <th>物料编码</th>
                  <th>名称</th>
                  <th>计划</th>
                  <th>已装箱</th>
                  <th>箱码</th>
                  <th>最近扫码</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in packRows" :key="item.code">
                  <td class="link-cell">{{ item.code }}</td>
                  <td>{{ item.name }}</td>
                  <td class="qty">{{ item.planned }}</td>
                  <td class="qty">{{ item.packed }}</td>
                  <td>{{ item.box }}</td>
                  <td>{{ item.lastScan }}</td>
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
            <div class="section-title">箱清单</div>
            <div class="section-extra">{{ boxes.length }} 个箱</div>
          </div>
          <div class="info-list">
            <div v-for="box in boxes" :key="box.no" class="info-row">
              <span class="label">{{ box.no }}</span>
              <span class="value">{{ box.status }} | {{ box.quantity }}</span>
            </div>
          </div>
        </section>

        <section class="panel">
          <div class="section-head">
            <div class="section-title">操作轨迹</div>
            <div class="section-extra">最近 6 条</div>
          </div>
          <div class="timeline">
            <div v-for="event in timeline.slice(0, 6)" :key="event.time + event.note" class="event">
              <div class="event-time">{{ event.time }}</div>
              <div>
                <div class="event-main" :class="event.tone">{{ event.title }}</div>
                <div class="event-note">{{ event.note }}</div>
              </div>
            </div>
          </div>
        </section>
      </aside>
    </section>

    <div v-if="packingListOpen" class="print-dialog-backdrop" @click.self="closePackingList">
      <section class="print-dialog packing-list-dialog" role="dialog" aria-modal="true" aria-label="装箱清单">
        <div class="print-dialog-toolbar">
          <strong>装箱清单</strong>
          <div class="print-dialog-actions">
            <button class="btn" type="button" @click="closePackingList">关闭</button>
          </div>
        </div>
        <div class="print-preview-scroll">
          <div class="delivery-print-page packing-list-sheet">
            <div class="print-title">
              <h1>深圳市捷顺科技实业股份有限公司</h1>
              <strong>装箱清单</strong>
            </div>

            <div class="print-info-grid packing-list-info-grid">
              <div class="print-info-list">
                <div><span>备注</span><strong>{{ packingListInfo.remark }}</strong></div>
                <div><span>送货单号</span><strong>{{ packingListInfo.deliveryNo }}</strong></div>
                <div><span>箱码</span><strong>{{ activeBoxNo }}</strong></div>
              </div>
              <div class="print-info-list">
                <div><span>地址</span><strong>{{ packingListInfo.address }}</strong></div>
                <div><span>线路</span><strong>{{ packingListInfo.route }}</strong></div>
                <div><span>收件人</span><strong>{{ packingListInfo.receiver }}</strong></div>
              </div>
              <div class="print-info-list">
                <div><span>调拨单码</span><strong>{{ packageNo }}</strong></div>
                <div><span>装箱数量</span><strong>{{ totalPacked }} / {{ totalPlanned }}</strong></div>
                <div><span>封箱员</span><strong>{{ packer }}</strong></div>
              </div>
            </div>

            <table class="print-material-table packing-list-table">
              <thead>
                <tr>
                  <th>序号</th>
                  <th>物料号</th>
                  <th>物料描述</th>
                  <th>数量</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in packRows" :key="item.code">
                  <td>{{ index + 1 }}</td>
                  <td>{{ item.code }}</td>
                  <td class="print-text-left">{{ item.name }}</td>
                  <td>{{ item.packed }}</td>
                </tr>
                <tr class="print-total-row">
                  <td colspan="3">合计</td>
                  <td>{{ totalPacked }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  </section>
</template>
