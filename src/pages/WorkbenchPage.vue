<script setup>
import { computed } from 'vue'
import { materials, scanEvents, shipment, steps, tags } from '../data/logistics'

defineEmits(['open-complete'])

const summary = computed(() => [
  {
    label: '物料扫码进度',
    value: `${shipment.progress.done} / ${shipment.progress.total}`,
    note: `剩余 ${shipment.progress.total - shipment.progress.done} 件待装箱`
  },
  {
    label: '箱数',
    value: `${shipment.boxes.total} 箱`,
    note: `${shipment.boxes.sealed} 箱已封，${shipment.boxes.active} 箱进行中`
  },
  {
    label: '费用状态',
    value: shipment.feeStatus,
    note: '发厂后由物流公司上传'
  }
])
</script>

<template>
  <section class="content">
    <section class="summary-grid">
      <article class="panel shipment-card">
        <div class="shipment-title">
          <div>
            <h1>发货单 {{ shipment.no }}</h1>
            <p class="subline">
              客户：{{ shipment.customer }} | 收货人：{{ shipment.receiver }} {{ shipment.phone }} |
              地址：{{ shipment.address }}
            </p>
          </div>
          <div class="shipment-actions">
            <span class="tag blue">当前：{{ shipment.currentNode }}</span>
            <button
              v-if="shipment.currentNode === '完善'"
              class="btn primary"
              type="button"
              @click="$emit('open-complete')"
            >
              完善
            </button>
          </div>
        </div>

        <div class="tag-row">
          <span v-for="tag in tags" :key="tag.text" class="tag" :class="tag.tone">{{ tag.text }}</span>
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
  </section>
</template>
