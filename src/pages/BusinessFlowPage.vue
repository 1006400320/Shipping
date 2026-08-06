<script setup>
const mainFlow = [
  { no: '01', title: '创建送货单', owner: '出货PC / 系统', note: '出货申请流程结束自动创建送货单，或由出货PC手动创建' },
  { no: '02', title: '发货资料完善', owner: '出货PC', note: '维护客户、收货人、物料清单和到货要求' },
  { no: '03', title: '打印单据', owner: '打单员', note: '打印交货单、送货单、调拨单，完成单据交接' },
  { no: '04', title: 'DNA 录入', owner: 'DNA 录入员', note: '大件产品：扫描并录入DNA编号，绑定交货单，同步完成编号校验。' },
  { no: '05', title: '扫码拣配', owner: '发货员', note: '按拣配清单拣货：大件物料直接扫码；配件物料先扫配件箱，再逐件扫码入箱。系统自动根据目的地、重量及体积核算运费。' },
  { no: '06', title: '扫码抽检', owner: '质量员', note: '抽检物料，核对数量并确认质量合格。' },
  { no: '07', title: '封配件箱', owner: '封箱员', note: '确认物料数量无误、质量合格后，封箱。' },
  { no: '08', title: '交接装车', owner: '物控/装车岗', note: '完成物流交接、装车确认和离厂登记' },
  { no: '09', title: '确认离厂', owner: '物流公司', note: '物流公司输入物流单号，并确认离厂' },
  { no: '10', title: '预约送货', owner: '物流公司', note: '预约送货后，系统自动发送签收码。' },
  { no: '11', title: '用户签收', owner: '物流公司', note: '客户完成签收，送货单进入待仓管确认费用状态。' },
  { no: '12', title: '仓管确认费用', owner: '仓库财务', note: '核对运费、送货费、超长费、卸货费、打木架费、入仓费、搬运费等费用项，确认无误。' },
  { no: '13', title: '物流确认费用', owner: '物流公司', note: '物流公司限时确认费用，逾期系统默认确认；有异议时提交异议并回滚至仓管确认费用。' },
  { no: '14', title: '生成账单', owner: '系统 / 仓库财务', note: '已确认的送货单，每月1号凌晨自动生成上月月度对账单，也支持手动生成。' },
  { no: '15', title: '物流开票', owner: '物流公司', note: '物流公司上传发票。' },
  { no: '16', title: '发票付款', owner: '系统 / 财务', note: '付款流程由系统自动触发，财务人员亦可手动发起。' }
]

const laneGroups = [
  {
    title: '作业中心',
    items: ['创建送货单', '资料完善', '打印单据', '大件DNA录入', '拣配扫描', '抽检扫描', '封配件箱']
  },
  {
    title: '物流协同',
    items: ['交接装车', '录入物流单号', '确认离厂', '运输中', '预约送货', '用户签收']
  },
  {
    title: '费用闭环',
    items: ['仓管确认费用', '物流确认费用', '生成账单', '物流开票', '发票付款']
  }
]

const controls = [
  '出货申请流程结束自动创建送货单，也可由出货PC手动创建',
  '未打印不能进入 DNA 录入',
  '包含大件产品时，未录入 DNA 不能进入扫码拣配',
  '拣配、抽检、封配件箱必须来自扫码记录',
  '抽检不通过退回拣配或进入异常处理',
  '物流公司必须填写物流单号后才能确认离厂',
  '预约送货后由系统短信发送签收码',
  '用户签收后送货单进入待仓管确认费用状态',
  '仓库财务确认运费、送货费、超长费、卸货费、打木架费、入仓费、搬运费等费用项',
  '物流公司须限时确认费用，逾期系统默认确认',
  '物流费用有异议时回滚至仓管确认费用，由仓管回复异议记录后重新提交',
  '每月1号凌晨系统自动生成上月月度对账单，也支持手动生成',
  '物流公司上传发票后才能发起付款流程审批'
]

const exceptions = [
  { from: '抽检不通过', to: '退回拣配', tone: 'amber' },
  { from: '封配件箱异常', to: '撤销箱码/重扫', tone: 'red' },
  { from: '预约失败', to: '重新预约送货', tone: 'amber' },
  { from: '作废单据', to: '停止发货，保留费用处理', tone: 'red' },
  { from: '费用异议', to: '回滚仓管确认费用，回复后重提', tone: 'blue' },
  { from: '物流逾期未确认', to: '系统默认确认费用', tone: 'amber' }
]
</script>

<template>
  <section class="content business-flow-page">
    <section class="panel business-flow-hero">
      <div>
        <h1>系统业务流程图</h1>
        <p class="subline">覆盖发货资料、扫码作业、物流签收、费用确认、账单开票和付款闭环。</p>
      </div>
      <div class="flow-legend" aria-label="图例">
        <span><i class="legend-dot done"></i>主流程</span>
        <span><i class="legend-dot branch"></i>条件节点</span>
        <span><i class="legend-dot risk"></i>异常回退</span>
      </div>
    </section>

    <section class="panel process-map" aria-label="发货主流程">
      <div
        v-for="(step, index) in mainFlow"
        :key="step.no"
        class="process-step"
        :class="{ branch: step.branch, parallel: step.branches, logistics: step.owner === '物流公司' }"
      >
        <div class="process-card">
          <span class="process-no">{{ step.no }}</span>
          <template v-if="step.branches">
            <div class="parallel-title">{{ step.title }}</div>
            <div class="parallel-branches">
              <article v-for="branch in step.branches" :key="`${step.no}-${branch.owner}`" class="parallel-branch">
                <strong v-if="branch.title">{{ branch.title }}</strong>
                <em>{{ branch.owner }}</em>
                <p>{{ branch.note }}</p>
              </article>
            </div>
          </template>
          <template v-else>
            <strong>{{ step.title }}</strong>
            <em>{{ step.owner }}</em>
            <p>{{ step.note }}</p>
          </template>
        </div>
        <span
          v-if="index < mainFlow.length - 1"
          class="process-arrow"
          :class="{ reversible: step.no === '12' }"
          aria-hidden="true"
        >
          <template v-if="step.no === '12'">
            <span class="forward-arrow">→</span>
            <span class="rollback-arrow">←</span>
          </template>
          <template v-else>→</template>
        </span>
      </div>
    </section>

    <section class="flow-layout">
      <section class="panel swimlane-panel">
        <div class="section-head">
          <div class="section-title">角色泳道</div>
          <div class="section-extra">按部门职责拆分</div>
        </div>
        <div class="swimlane">
          <div v-for="group in laneGroups" :key="group.title" class="lane-row">
            <div class="lane-title">{{ group.title }}</div>
            <div class="lane-items">
              <span v-for="item in group.items" :key="item">{{ item }}</span>
            </div>
          </div>
        </div>
      </section>

      <aside class="flow-side">
        <section class="panel">
          <div class="section-head">
            <div class="section-title">关键控制点</div>
          </div>
          <ol class="control-list">
            <li v-for="item in controls" :key="item">{{ item }}</li>
          </ol>
        </section>

        <section class="panel">
          <div class="section-head">
            <div class="section-title">异常与回退</div>
          </div>
          <div class="exception-flow">
            <div v-for="item in exceptions" :key="item.from" class="exception-chip" :class="item.tone">
              <span>{{ item.from }}</span>
              <strong>{{ item.to }}</strong>
            </div>
          </div>
        </section>
      </aside>
    </section>
  </section>
</template>
