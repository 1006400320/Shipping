<script setup>
import { computed } from 'vue'
import { shipmentTasks } from '../data/logistics'

const emit = defineEmits(['open-leave'])

const mobilePendingTotal = computed(() =>
  shipmentTasks.filter((task) => ['待装车离厂', '待签收'].includes(task.status)).length
)

const cards = computed(() => {
  const findTaskNo = (status) => shipmentTasks.find((task) => task.status === status)?.no || ''

  return [
    {
      key: 'leaveConfirm',
      tone: 'blue',
      mark: '01',
      title: '装车离厂入口',
      subtitle: '仓管员在移动端完成车辆、单据、箱件和异常闭环复核后确认发车离厂。',
      actionLabel: '进入装车离厂',
      statLabel: '待装车离厂',
      statValue: `${shipmentTasks.filter((task) => task.status === '待装车离厂').length} 单`,
      helper: `默认打开 ${findTaskNo('待装车离厂') || '待装车离厂任务'}`,
      open: () => emit('open-leave', findTaskNo('待装车离厂'))
    },
    {
      key: 'signConfirm',
      tone: 'green',
      mark: '02',
      title: '签收确认入口',
      subtitle: '物流人员向签收人询问签收码，填写签收码后完成确认签收。',
      actionLabel: '进入确认签收',
      statLabel: '待签收',
      statValue: `${shipmentTasks.filter((task) => task.status === '待签收').length} 单`,
      helper: `默认打开 ${findTaskNo('待签收') || '待签收任务'}`,
      open: () => emit('open-leave', findTaskNo('待签收'))
    }
  ]
})
</script>

<template>
  <section class="content employee-mobile-page">
    <section class="panel employee-mobile-hero">
      <div class="employee-mobile-hero-grid">
        <div>
          <div class="employee-mobile-eyebrow">移动端 / 物流端</div>
          <h1>物流端</h1>
          <p class="subline">
            面向物流与仓管作业人员，支持装车离厂与签收码确认。
          </p>
        </div>

        <div class="employee-mobile-overview">
          <span>今日待处理</span>
          <strong>{{ mobilePendingTotal }} 单</strong>
          <em>离厂与签收任务待确认</em>
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
