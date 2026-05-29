<script setup>
const mainFlow = [
  { no: '01', title: '发货资料完善', owner: '资料员', note: '维护客户、收货人、物料清单和到货要求' },
  { no: '02', title: '打印单据', owner: '资料员', note: '打印备料单、发货单和封箱相关单据' },
  { no: '03', title: '扫码拣配', owner: '包管员', note: '按发货单扫描物料，校验数量和归属' },
  { no: '04', title: '扫码抽检', owner: '质量员', note: '抽检物料或配件箱，登记通过或不通过' },
  { no: '05', title: '扫码封箱', owner: '封箱员', note: '绑定箱码，生成箱内物料明细' },
  { no: '06', title: 'DNA 录入', owner: 'DNA 录入员', note: '大件产品必须录入并校验 DNA 编号' },
  { no: '07', title: '确认物流取货', owner: '物控/装车岗', note: '确认物流取货，完成装车交接' },
  { no: '08', title: '开始运输', owner: '物流公司', note: '物流公司输入物流单号，并确认开始运输' },
  { no: '09', title: '签收', owner: '物流公司', note: '用户提供签收码，物流公司填写后确认签收，可填写备注' },
  { no: '10', title: '上传对账单', owner: '物流公司', note: '签收完成后上传对账单附件，并补充对账备注' },
  { no: '11', title: '核对对账单', owner: '仓管财务', note: '仓管财务核对对账单、费用项和异常说明' },
  { no: '12', title: '报销闭环', owner: '总部财务', note: '自动发起报销，完成费用闭环' }
]

const laneGroups = [
  {
    title: '作业中心',
    items: ['资料完善', '打印单据', '拣配扫描', '抽检扫描', '封箱贴单', 'DNA 校验']
  },
  {
    title: '物流协同',
    items: ['确认物流取货', '录入物流单号', '确认开始运输', '运输中', '客户签收', '上传对账单']
  },
  {
    title: '费用闭环',
    items: ['仓管财务核对', '改价确认', '发起报销', '已报销']
  }
]

const controls = [
  '未打印不能进入拣配',
  '拣配、抽检、封箱必须来自扫码记录',
  '抽检不通过退回拣配或进入异常处理',
  '大件未录入 DNA 不能确认离厂',
  '物流公司必须填写物流单号后才能确认开始运输',
  '签收后由物流公司上传对账单，支持填写备注',
  '仓管财务核对对账单后才能进入改价确认或报销',
  '对账有改价时必须多方确认后才能报销'
]

const exceptions = [
  { from: '抽检不通过', to: '退回拣配', tone: 'amber' },
  { from: '封箱异常', to: '撤销箱码/重扫', tone: 'red' },
  { from: '作废单据', to: '停止发货，保留费用处理', tone: 'red' },
  { from: '对账改价', to: '物流、工厂、总部财务确认', tone: 'blue' }
]
</script>

<template>
  <section class="content business-flow-page">
    <section class="panel business-flow-hero">
      <div>
        <h1>系统业务流程图</h1>
        <p class="subline">覆盖发货资料、扫码作业、物流签收、对账核价和报销闭环。</p>
      </div>
      <div class="flow-legend" aria-label="图例">
        <span><i class="legend-dot done"></i>主流程</span>
        <span><i class="legend-dot branch"></i>条件节点</span>
        <span><i class="legend-dot risk"></i>异常回退</span>
      </div>
    </section>

    <section class="panel process-map" aria-label="发货主流程">
      <div v-for="(step, index) in mainFlow" :key="step.no" class="process-step" :class="{ branch: step.branch }">
        <div class="process-card">
          <span class="process-no">{{ step.no }}</span>
          <strong>{{ step.title }}</strong>
          <em>{{ step.owner }}</em>
          <p>{{ step.note }}</p>
        </div>
        <span v-if="index < mainFlow.length - 1" class="process-arrow" aria-hidden="true">→</span>
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
