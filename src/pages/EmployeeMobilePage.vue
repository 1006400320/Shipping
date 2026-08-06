<script setup>
import { computed } from 'vue'
import { shipmentTasks } from '../data/logistics'

const emit = defineEmits(['open-workbench', 'open-pick', 'open-qc', 'open-pack'])

const mobilePendingTotal = computed(() =>
  shipmentTasks.filter((task) => ['待拣配', '待抽检', '待封配件箱'].includes(task.status)).length
)

const cards = computed(() => {
  const findTaskNo = (status) => shipmentTasks.find((task) => task.status === status)?.no || ''

  return [
    {
      key: 'workbench',
      tone: 'blue',
      mark: '01',
      title: '发货工作台',
      subtitle: '查看待办发货任务、处理详情、进入各作业环节。',
      actionLabel: '进入工作台',
      statLabel: '当前任务',
      statValue: `${shipmentTasks.length} 单`,
      helper: '覆盖完善、打印、拣配、抽检、封箱等节点',
      open: () => emit('open-workbench')
    },
    {
      key: 'pickScan',
      tone: 'green',
      mark: '02',
      title: '扫码拣配',
      subtitle: '包管员连续扫描物料码，实时校验计划数量与缺失。',
      actionLabel: '进入拣配',
      statLabel: '待拣配',
      statValue: `${shipmentTasks.filter((task) => task.status === '待拣配').length} 单`,
      helper: `默认打开 ${findTaskNo('待拣配') || '待拣配任务'}`,
      open: () => emit('open-pick', findTaskNo('待拣配'))
    },
    {
      key: 'qcScan',
      tone: 'amber',
      mark: '03',
      title: '扫码抽检',
      subtitle: '质量员扫描物料码或箱码，登记抽检结果与异常。',
      actionLabel: '进入抽检',
      statLabel: '待抽检',
      statValue: `${shipmentTasks.filter((task) => task.status === '待抽检').length} 单`,
      helper: `默认打开 ${findTaskNo('待抽检') || '待抽检任务'}`,
      open: () => emit('open-qc', findTaskNo('待抽检'))
    },
    {
      key: 'packScan',
      tone: 'red',
      mark: '04',
      title: '封箱贴单',
      subtitle: '扫描箱码、物料码和调拨单码，完成装箱绑定与贴单。',
      actionLabel: '进入封箱',
      statLabel: '待封配件箱',
      statValue: `${shipmentTasks.filter((task) => task.status === '待封配件箱').length} 单`,
      helper: `默认打开 ${findTaskNo('待封配件箱') || '待封箱任务'}`,
      open: () => emit('open-pack', findTaskNo('待封配件箱'))
    }
  ]
})
</script>

<template>
  <section class="content employee-mobile-page">
    <section class="panel employee-mobile-hero">
      <div class="employee-mobile-hero-grid">
        <div>
          <div class="employee-mobile-eyebrow">移动端 / 员工端</div>
          <h1>员工端入口</h1>
          <p class="subline">
            面向仓内作业人员，集中提供发货工作台、扫码拣配、扫码抽检、封箱贴单四个移动作业入口。
          </p>
        </div>

        <div class="employee-mobile-overview">
          <span>今日待处理</span>
          <strong>{{ mobilePendingTotal }} 单</strong>
          <em>仓内作业入口已聚合</em>
        </div>
      </div>
    </section>

    <section class="employee-mobile-grid">
      <article
        v-for="card in cards"
        :key="card.key"
        class="panel employee-mobile-card"
        :class="`tone-${card.tone}`"
      >
        <div class="employee-mobile-card-top">
          <div class="employee-mobile-card-mark">{{ card.mark }}</div>

          <div class="employee-mobile-card-copy">
            <h2>{{ card.title }}</h2>
            <p>{{ card.subtitle }}</p>
          </div>

          <div class="employee-mobile-stat">
            <span>{{ card.statLabel }}</span>
            <strong>{{ card.statValue }}</strong>
          </div>
        </div>

        <div class="employee-mobile-helper">{{ card.helper }}</div>

        <button class="btn primary employee-mobile-action" type="button" @click="card.open">
          {{ card.actionLabel }}
        </button>
      </article>
    </section>
  </section>
</template>
