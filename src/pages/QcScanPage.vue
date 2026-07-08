<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { materials } from '../data/logistics'

const scanInput = ref(null)
const scanCode = ref('65003002')
const latestMessage = ref('质量员扫码抽检，支持物料编码或箱码输入。')
const latestMessageType = ref('neutral')
const operator = '周工'
const deviceNo = 'SCAN-QC-01'
const checkedCount = ref(0)
const exceptionCount = ref(0)
const passCount = ref(0)
const failCount = ref(0)

const accessoryBoxByMaterialCode = {
  '65002008': 'PJX-2604030003-01',
  '65003002': 'PJX-2604030003-02',
  '65000099': 'PJX-2604030003-01',
  'MAT-A2008': 'PJX-2604030003-01',
  'MAT-L3002': 'PJX-2604030003-02',
  'MAT-C0099': 'PJX-2604030003-01'
}

const demoCodeByIndex = ['65001001', '65002008', '65003002', '65000099']

const qcRows = ref(
  materials.map((item, index) => {
    const code = demoCodeByIndex[index] || item.code
    return {
      code,
      name: item.name,
      accessoryBox: accessoryBoxByMaterialCode[code] || '-',
      planned: item.picked,
      checked: index === 2 ? 0 : item.checked,
      result: index === 2 ? '待抽检' : '通过',
      note: index === 2 ? '等待抽检' : '抽检通过',
      lastScan: index === 2 ? '-' : '10:24:18',
      tone: index === 2 ? 'warn' : 'ok'
    }
  })
)

const timeline = ref([
  { time: '10:34:11', title: '抽检通过', note: '65002008 结果通过，设备 SCAN-QC-01', tone: 'success' },
  { time: '10:29:48', title: '箱码抽检通过', note: 'BOX-20260518-003 箱码校验通过', tone: 'success' },
  { time: '10:24:18', title: '抽检记录', note: '65001001 抽检通过，封签状态正常', tone: 'success' }
])

const stats = computed(() => [
  { label: '抽检数量', value: checkedCount.value },
  { label: '通过', value: passCount.value, tone: 'success' },
  { label: '异常', value: exceptionCount.value, tone: exceptionCount.value ? 'danger' : '' },
  { label: '待抽检', value: Math.max(materials.length - checkedCount.value, 0), tone: 'warn' }
])

const progressPercent = computed(() => Math.min(Math.round((checkedCount.value / materials.length) * 100), 100))

function formatTime(date = new Date()) {
  return date.toLocaleTimeString('zh-CN', { hour12: false })
}

function addTimeline(title, note, tone = 'success') {
  timeline.value.unshift({ time: formatTime(), title, note, tone })
}

function normalizeScanCode(rawCode) {
  const value = rawCode.trim().toUpperCase()
  const parts = value.split(/[|,;\s]+/)
  return parts.find((part) => /^65\d{6}$/.test(part)) || parts.find((part) => /^MAT-[A-Z0-9-]+$/.test(part)) || parts.find((part) => /^BOX-[A-Z0-9-]+$/.test(part)) || value
}

function submitScan() {
  const rawCode = scanCode.value.trim()
  if (!rawCode) {
    latestMessage.value = '扫码内容为空，请重新扫描。'
    latestMessageType.value = 'danger'
    scanInput.value?.focus()
    return
  }

  const code = normalizeScanCode(rawCode)
  const materialRow = qcRows.value.find((row) => row.code === code)
  const isBox = /^BOX-[A-Z0-9-]+$/.test(code)

  if (!/^65\d{6}$/.test(code) && !/^MAT-[A-Z0-9-]+$/.test(code) && !isBox) {
    exceptionCount.value += 1
    failCount.value += 1
    latestMessage.value = `扫码异常：${code} 不是有效物料编码或箱码。`
    latestMessageType.value = 'danger'
    addTimeline('抽检失败', `${code} 编码规则校验未通过，设备 ${deviceNo}`, 'danger')
  } else if (materialRow) {
    materialRow.checked += 1
    materialRow.result = '通过'
    materialRow.note = '抽检通过'
    materialRow.lastScan = formatTime()
    materialRow.tone = 'ok'
    checkedCount.value += 1
    passCount.value += 1
    latestMessage.value = `抽检成功：${code} 已登记通过。`
    latestMessageType.value = 'success'
    addTimeline('抽检通过', `${code} 抽检通过，操作员 ${operator}`, 'success')
  } else if (isBox) {
    checkedCount.value += 1
    passCount.value += 1
    latestMessage.value = `箱码校验通过：${code}，已完成抽检登记。`
    latestMessageType.value = 'success'
    addTimeline('箱码抽检通过', `${code} 箱码校验通过，设备 ${deviceNo}`, 'success')
  } else {
    exceptionCount.value += 1
    failCount.value += 1
    latestMessage.value = `扫码异常：${code} 不属于当前抽检清单。`
    latestMessageType.value = 'danger'
    addTimeline('抽检失败', `${code} 不属于当前交货单，设备 ${deviceNo}`, 'danger')
  }

  nextTick(() => scanInput.value?.select())
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
    <section class="workspace qc-workspace">
      <div class="left-column">
        <section class="panel">
          <div class="section-head">
            <div class="section-title">扫码抽检作业台</div>
            <div class="section-extra">{{ deviceNo }} 在线</div>
          </div>
          <div class="scan-console">
            <form class="scan-input-wrap" @submit.prevent="submitScan">
              <input
                ref="scanInput"
                v-model="scanCode"
                class="scan-input"
                aria-label="抽检扫码输入"
                autocomplete="off"
                autocapitalize="off"
                spellcheck="false"
                inputmode="text"
                @focus="scanInput?.select()"
                @blur="focusScannerInput"
              />
              <button class="scan-button" type="submit">扫码确认</button>
            </form>

            <div class="progress-meter" aria-label="抽检进度">
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

        <section class="panel material-panel">
          <div class="section-head">
            <div class="section-title">抽检明细</div>
            <div class="section-extra">结果由扫码枪实时写入</div>
          </div>
          <div class="table-wrap">
            <table class="qc-table">
              <thead>
                <tr>
                  <th>物料编码</th>
                  <th>名称</th>
                  <th>配件箱</th>
                  <th>应检</th>
                  <th>已检</th>
                  <th>结果</th>
                  <th>最近扫码</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in qcRows" :key="item.code">
                  <td class="link-cell">{{ item.code }}</td>
                  <td>{{ item.name }}</td>
                  <td>{{ item.accessoryBox }}</td>
                  <td class="qty">{{ item.planned }}</td>
                  <td class="qty">{{ item.checked }}</td>
                  <td :class="item.tone">{{ item.result }}</td>
                  <td>{{ item.lastScan }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <aside class="side-stack">
        <section class="panel">
          <div class="section-head">
            <div class="section-title">抽检信息</div>
            <div class="section-extra">质检员：{{ operator }}</div>
          </div>
          <div class="info-list">
            <div class="info-row"><span class="label">当前单号</span><span class="value">FH202605180001</span></div>
            <div class="info-row"><span class="label">扫描设备</span><span class="value">{{ deviceNo }}</span></div>
            <div class="info-row"><span class="label">抽检通过</span><span class="value">{{ passCount }}</span></div>
            <div class="info-row"><span class="label">抽检异常</span><span class="value">{{ failCount }}</span></div>
            <div class="info-row"><span class="label">操作状态</span><span class="value">扫码中</span></div>
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
  </section>
</template>
