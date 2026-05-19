<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { boxes, materials, scanEvents } from '../data/logistics'

const scanInput = ref(null)
const scanCode = ref('BOX-20260518-003')
const latestMessage = ref('扫码异常：MAT-AX009 已在 2 号箱绑定，禁止重复装箱。')
const latestMessageType = ref('danger')
const packedOverride = ref(null)
const timeline = ref([...scanEvents])

const stats = computed(() => [
  { label: '计划数量', value: '20' },
  { label: '已拣配', value: '20' },
  { label: '已装箱', value: packedOverride.value ? '20' : '18' },
  { label: '异常', value: latestMessageType.value === 'success' ? '0' : '1', tone: 'danger' }
])

const progressPercent = computed(() => (packedOverride.value ? 100 : 90))
const displayMaterials = computed(() =>
  materials.map((item) =>
    item.code === 'MAT-L3002' && packedOverride.value
      ? { ...item, packed: 8, status: '完成', tone: 'ok' }
      : item
  )
)

function submitScan() {
  const code = scanCode.value.trim()
  if (!code) {
    latestMessage.value = '扫码内容为空，请重新扫描。'
    latestMessageType.value = 'danger'
    scanInput.value?.focus()
    return
  }

  if (code === 'MAT-L3002') {
    packedOverride.value = true
    latestMessage.value = '扫码成功：MAT-L3002 已装入 BOX-20260518-003。'
    latestMessageType.value = 'success'
    timeline.value.unshift({
      time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      title: '物料装箱成功',
      note: `${code} 已绑定当前箱`,
      tone: 'success'
    })
  } else {
    latestMessage.value = `扫码异常：${code} 不属于当前待补扫清单或已绑定其他箱。`
    latestMessageType.value = 'danger'
    timeline.value.unshift({
      time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      title: '封箱扫码失败',
      note: `${code} 校验未通过`,
      tone: 'danger'
    })
  }

  nextTick(() => scanInput.value?.select())
}

onMounted(() => {
  scanInput.value?.focus()
})
</script>

<template>
  <section class="content">
    <section class="workspace">
      <div class="left-column">
        <div class="body-grid">
          <section class="panel">
            <div class="section-head">
              <div class="section-title">扫码封箱作业台</div>
              <div class="section-extra">输入 MAT-L3002 后回车可模拟补扫成功</div>
            </div>
            <div class="scan-console">
              <div class="scan-input-wrap">
                <input
                  ref="scanInput"
                  v-model="scanCode"
                  class="scan-input"
                  aria-label="扫码输入"
                  @keyup.enter="submitScan"
                />
                <button class="scan-button" type="button" @click="submitScan">扫码确认</button>
              </div>

              <div class="progress-meter" aria-label="装箱进度">
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
              <div class="section-extra">BOX-20260518-003</div>
            </div>
            <div class="info-list">
              <div class="info-row"><span class="label">箱状态</span><span class="value">封箱中</span></div>
              <div class="info-row"><span class="label">封箱员</span><span class="value">李明</span></div>
              <div class="info-row"><span class="label">封箱单码</span><span class="value">PKG-003 待绑定</span></div>
              <div class="info-row"><span class="label">箱内数量</span><span class="value">6 / 8</span></div>
              <div class="info-row"><span class="label">下一步</span><span class="value">补扫 2 件物料后打印封箱单</span></div>
            </div>
          </section>
        </div>

        <section class="panel material-panel">
          <div class="section-head">
            <div class="section-title">物料装箱明细</div>
            <div class="section-extra">箱码与物料必须一一绑定</div>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>物料码</th>
                  <th>名称</th>
                  <th>计划</th>
                  <th>已装箱</th>
                  <th>箱码</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in displayMaterials" :key="item.code">
                  <td>{{ item.code }}</td>
                  <td>{{ item.name }}</td>
                  <td class="qty">{{ item.planned }}</td>
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
            <div class="section-title">箱清单</div>
            <div class="section-extra">3 个箱</div>
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
            <div class="section-title">操作痕迹</div>
            <div class="section-extra">最近扫码</div>
          </div>
          <div class="timeline">
            <div v-for="event in timeline.slice(0, 5)" :key="event.time + event.note" class="event">
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
