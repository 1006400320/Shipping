<script setup>
import { computed, ref, watch } from 'vue'
import { feeItems, shipmentTasks } from '../data/logistics'

const props = defineProps({
  taskNo: {
    type: String,
    default: ''
  }
})

const columns = [
  '序号',
  '业务日期',
  '物流单号',
  '销售订单号',
  '送货单号',
  '目的地',
  '收货人',
  '货物品名',
  '件数',
  '结算部门',
  '币别',
  '运费',
  '送货费',
  '卸货费',
  '异常费用',
  '延期扣费',
  '合计',
  '备注'
]

const statementRows = [
  {
    index: '396',
    date: '2026.1.30',
    logisticsNo: '338004679',
    saleNo: '10327258',
    deliveryNo: '2601290075',
    destination: '广州市海珠区',
    receiver: '余定平',
    product: '道闸',
    pieces: 28,
    department: '广州分公司',
    currency: 'RMB',
    freightFee: 0,
    deliveryFee: 180,
    unloadFee: 0,
    exceptionFee: 70,
    delayDeduction: 0,
    totalFee: 250,
    remark: '4.3米杆4条，指定位置卸货'
  },
  {
    index: '397',
    date: '2026.1.30',
    logisticsNo: '338004680',
    saleNo: '10328452',
    deliveryNo: '2601290076',
    destination: '广州市番禺区',
    receiver: '陈文华',
    product: '道闸',
    pieces: 21,
    department: '番禺分公司',
    currency: 'RMB',
    freightFee: 0,
    deliveryFee: 180,
    unloadFee: 0,
    exceptionFee: 50,
    delayDeduction: 0,
    totalFee: 230,
    remark: '4.3米杆4条，指定位置卸货'
  },
  {
    index: '398',
    date: '2026.1.30',
    logisticsNo: '338004692',
    saleNo: '10328370',
    deliveryNo: '2601300071',
    destination: '佛山市顺德区',
    receiver: '刘咏坤',
    product: '道闸',
    pieces: 13,
    department: '佛山分公司',
    currency: 'RMB',
    freightFee: 0,
    deliveryFee: 180,
    unloadFee: 0,
    exceptionFee: 40,
    delayDeduction: 0,
    totalFee: 220,
    remark: '4.3米杆2条，指定位置卸货'
  },
  {
    index: '399',
    date: '2026.1.30',
    logisticsNo: '338004699',
    saleNo: '10328111',
    deliveryNo: '2601300016',
    destination: '揭阳市惠来县',
    receiver: '吴辉坤',
    product: '道闸',
    pieces: 7,
    department: '汕头分公司',
    currency: 'RMB',
    freightFee: 0,
    deliveryFee: 100,
    unloadFee: 0,
    exceptionFee: 40,
    delayDeduction: 0,
    totalFee: 140,
    remark: '指定位置卸货'
  }
]

const templates = {
  cbf: {
    key: 'cbf-provincial-statement',
    name: '车八方省内月度对账单',
    title: '深圳市（车八方）物流有限公司 2026年1月对账单（省内）',
    confidence: 99,
    rows: statementRows
  }
}

const listRows = ref([
  {
    id: 'REC-202601-001',
    carrier: '车八方物流',
    period: '2026年1月',
    fileName: '车八方省内月度对账单.csv',
    count: 4,
    amount: 840,
    stage: '待总部财务核对',
    uploader: '物流公司',
    uploadTime: '2026-05-28 16:25'
  },
  {
    id: 'REC-202604-002',
    carrier: '顺丰速运',
    period: '2026年4月',
    fileName: '顺丰2026年4月账单明细.xlsx',
    count: 3,
    amount: 1320.26,
    stage: '待仓管财务核对',
    uploader: '物流公司',
    uploadTime: '2026-05-27 14:10'
  }
])

const selectedId = ref('')
const statementFileName = ref('')
const statementRemark = ref('')
const templateDownloaded = ref(false)
const selectedTemplate = ref('cbf')
const parsedStatement = ref(null)
const parseError = ref('')
const reviewStage = ref('待物流上传')

const selectedListRow = computed(() => listRows.value.find((item) => item.id === selectedId.value))
const isDetail = computed(() => Boolean(selectedId.value))
const isCreatingStatement = computed(() => selectedId.value === 'NEW')
const activeTask = computed(() => shipmentTasks.find((task) => task.no === props.taskNo))
const isConfirmStatementTask = computed(() => activeTask.value?.status === '确认对账单')
const canUpload = computed(() => templateDownloaded.value && Boolean(statementFileName.value))
const parsedTotal = computed(() => parsedStatement.value?.totals?.totalFee || 0)
const deliveryNoCount = computed(() => {
  if (!parsedStatement.value) return 0
  return new Set(parsedStatement.value.rows.map((row) => row.deliveryNo).filter(Boolean)).size
})

function toAmount(value) {
  const amount = Number(String(value || '').replace(/,/g, '').trim())
  return Number.isFinite(amount) ? amount : 0
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function buildParsedStatement(template, rows, confidence = template.confidence) {
  const sum = (key) => rows.reduce((total, row) => total + toAmount(row[key]), 0)
  return {
    template: template.key,
    templateName: template.name,
    title: template.title,
    confidence,
    columns,
    rows,
    totals: {
      freightFee: sum('freightFee'),
      deliveryFee: sum('deliveryFee'),
      unloadFee: sum('unloadFee'),
      exceptionFee: sum('exceptionFee'),
      delayDeduction: sum('delayDeduction'),
      totalFee: sum('totalFee')
    }
  }
}

function openList() {
  selectedId.value = ''
}

function openDetail(row) {
  selectedId.value = row.id
  statementFileName.value = row.fileName
  templateDownloaded.value = true
  parsedStatement.value = buildParsedStatement(templates.cbf, templates.cbf.rows)
  reviewStage.value = row.stage
  parseError.value = ''
}

function createStatement() {
  selectedId.value = 'NEW'
  statementFileName.value = ''
  statementRemark.value = ''
  templateDownloaded.value = false
  parsedStatement.value = null
  parseError.value = ''
  reviewStage.value = '待物流上传'
}

function makeTemplateCsv(template) {
  const rows = [
    columns,
    ...template.rows.map((row) => [
      row.index,
      row.date,
      row.logisticsNo,
      row.saleNo,
      row.deliveryNo,
      row.destination,
      row.receiver,
      row.product,
      row.pieces,
      row.department,
      row.currency,
      row.freightFee,
      row.deliveryFee,
      row.unloadFee,
      row.exceptionFee,
      row.delayDeduction,
      row.totalFee,
      row.remark
    ])
  ]
  return `\uFEFF${rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')}`
}

function downloadTemplate() {
  const template = templates[selectedTemplate.value]
  const blob = new Blob([makeTemplateCsv(template)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${template.name}.csv`
  link.click()
  URL.revokeObjectURL(url)
  templateDownloaded.value = true
}

function handleStatementChange(event) {
  const [file] = event.target.files || []
  statementFileName.value = file?.name || ''
  parsedStatement.value = file ? buildParsedStatement(templates.cbf, templates.cbf.rows) : null
  parseError.value = ''
  reviewStage.value = file ? '待提交' : '待物流上传'
}

function submitStatement() {
  if (!canUpload.value || !parsedStatement.value) return
  reviewStage.value = '待仓管财务核对'
  if (selectedId.value === 'NEW') {
    const id = `REC-${Date.now()}`
    listRows.value.unshift({
      id,
      carrier: '车八方物流',
      period: '2026年1月',
      fileName: statementFileName.value,
      count: deliveryNoCount.value,
      amount: parsedTotal.value,
      stage: reviewStage.value,
      uploader: '物流公司',
      uploadTime: '2026-05-28 16:25'
    })
    selectedId.value = id
  }
  const row = selectedListRow.value
  if (row) {
    row.stage = reviewStage.value
    row.count = deliveryNoCount.value
    row.amount = parsedTotal.value
    row.fileName = statementFileName.value
  }
}

function approveWarehouseFinance() {
  if (reviewStage.value !== '待仓管财务核对') return
  reviewStage.value = '待总部财务核对'
  if (selectedListRow.value) selectedListRow.value.stage = reviewStage.value
}

function approveHeadquartersFinance() {
  if (reviewStage.value !== '待总部财务核对') return
  reviewStage.value = '已完成'
  if (selectedListRow.value) selectedListRow.value.stage = reviewStage.value
}

watch(
  () => props.taskNo,
  (taskNo) => {
    if (!taskNo) return
    createStatement()
    if (!isConfirmStatementTask.value) return
    statementFileName.value = `${taskNo}物流对账单.xlsx`
    templateDownloaded.value = true
    parsedStatement.value = buildParsedStatement(templates.cbf, templates.cbf.rows)
    reviewStage.value = '待物流确认'
  },
  { immediate: true }
)
</script>

<template>
  <section class="content">
    <Teleport to=".topbar-actions">
      <button v-if="!isDetail" class="btn primary" type="button" @click="createStatement">新增对账单</button>
      <button v-else class="btn" type="button" @click="openList">返回列表</button>
      <button v-if="isCreatingStatement" class="btn primary" type="button" :disabled="!canUpload" @click="submitStatement">提交对账单</button>
    </Teleport>

    <template v-if="!isDetail">
      <section class="page-grid">
        <article class="panel page-hero">
          <h1>对账单列表</h1>
          <p class="subline">按对账单维度管理物流上传记录，一张对账单可解析并关联多个交货单号。</p>
        </article>
        <article class="panel metric">
          <div class="metric-label">待仓管财务核对</div>
          <div class="metric-value">{{ listRows.filter((item) => item.stage === '待仓管财务核对').length }}</div>
          <div class="metric-note">上传后生成数据</div>
        </article>
        <article class="panel metric">
          <div class="metric-label">待总部财务核对</div>
          <div class="metric-value">{{ listRows.filter((item) => item.stage === '待总部财务核对').length }}</div>
          <div class="metric-note">仓管财务通过后</div>
        </article>
      </section>

      <section class="panel">
        <div class="section-head">
          <div class="section-title">对账单</div>
          <div class="section-extra">物流公司上传记录</div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>对账单号</th>
                <th>物流公司</th>
                <th>账期</th>
                <th>文件名</th>
                <th>交货单数</th>
                <th>费用合计</th>
                <th>状态</th>
                <th>上传时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in listRows" :key="row.id">
                <td>{{ row.id }}</td>
                <td>{{ row.carrier }}</td>
                <td>{{ row.period }}</td>
                <td>{{ row.fileName }}</td>
                <td>{{ row.count }}</td>
                <td class="money">{{ formatMoney(row.amount) }}</td>
                <td>{{ row.stage }}</td>
                <td>{{ row.uploadTime }}</td>
                <td>
                  <button class="btn table-action" type="button" @click="openDetail(row)">查看</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>

    <template v-else>
      <section class="page-grid">
        <article class="panel page-hero">
          <h1>{{ isConfirmStatementTask ? '确认对账单' : isCreatingStatement ? '新增对账单' : '对账单详情' }}</h1>
          <p class="subline">物流公司确认对账单明细后提交，再由仓管财务和总部财务依次核对。</p>
        </article>
        <article class="panel metric">
          <div class="metric-label">交货单数量</div>
          <div class="metric-value">{{ deliveryNoCount || '-' }}</div>
          <div class="metric-note">一张对账单可包含多单</div>
        </article>
        <article class="panel metric">
          <div class="metric-label">对账状态</div>
          <div class="metric-value">{{ reviewStage }}</div>
          <div class="metric-note">物流上传 / 仓管财务 / 总部财务</div>
        </article>
      </section>

      <section v-if="isCreatingStatement" class="panel">
        <div class="section-head">
          <div class="section-title">{{ isConfirmStatementTask ? '物流公司确认' : '物流公司上传' }}</div>
          <div class="section-extra">对账单维度确认，解析后关联多个交货单号</div>
        </div>
        <div class="reconcile-upload-grid">
          <div class="statement-upload-flow">
            <label class="reconcile-remark-field">
              <span>对账单模板</span>
              <select v-model="selectedTemplate" class="field">
                <option value="cbf">车八方省内月度对账单</option>
              </select>
            </label>
            <button class="btn" type="button" @click="downloadTemplate">下载对账单模板</button>
            <label class="photo-upload-zone statement-upload-zone" :class="{ disabled: !templateDownloaded }">
              <input type="file" accept=".pdf,.xls,.xlsx,.csv,image/*" :disabled="!templateDownloaded" @change="handleStatementChange" />
              <span class="upload-icon">+</span>
              <strong>{{ statementFileName || '上传对账单附件' }}</strong>
              <small>{{ templateDownloaded ? '支持 PDF、Excel、CSV 或图片凭证' : '请先下载模板，再上传对账单附件' }}</small>
            </label>
          </div>
          <label class="reconcile-remark-field">
            <span>备注</span>
            <textarea
              v-model="statementRemark"
              class="field remark-field"
              rows="6"
              placeholder="填写费用说明、异常情况、扣费原因或需要财务关注的事项"
            ></textarea>
          </label>
        </div>
        <div class="departure-actions">
          <span v-if="parsedStatement" class="notice success">已识别 {{ parsedStatement.templateName }}，解析 {{ parsedStatement.rows.length }} 条明细。</span>
          <span v-else-if="parseError" class="notice danger">{{ parseError }}</span>
        </div>
      </section>

      <section v-if="parsedStatement" class="panel statement-result-panel">
        <div class="section-head">
          <div>
            <div class="section-title">解析结果</div>
            <div class="section-extra">{{ parsedStatement.title }}，模板置信度 {{ parsedStatement.confidence }}%</div>
          </div>
          <div class="statement-total">
            <span>费用合计</span>
            <strong>{{ formatMoney(parsedTotal) }}</strong>
          </div>
        </div>

        <div class="statement-summary-grid">
          <div>
            <span>运费</span>
            <strong>{{ formatMoney(parsedStatement.totals.freightFee) }}</strong>
          </div>
          <div>
            <span>送货费</span>
            <strong>{{ formatMoney(parsedStatement.totals.deliveryFee) }}</strong>
          </div>
          <div>
            <span>异常费用</span>
            <strong>{{ formatMoney(parsedStatement.totals.exceptionFee) }}</strong>
          </div>
          <div>
            <span>延期扣费</span>
            <strong>{{ formatMoney(parsedStatement.totals.delayDeduction) }}</strong>
          </div>
        </div>

        <div class="table-wrap statement-table-wrap">
          <table class="statement-table">
            <thead>
              <tr>
                <th v-for="column in parsedStatement.columns" :key="column">{{ column }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in parsedStatement.rows" :key="`${row.logisticsNo}-${row.index}`">
                <td>{{ row.index }}</td>
                <td>{{ row.date }}</td>
                <td>{{ row.logisticsNo }}</td>
                <td>{{ row.saleNo }}</td>
                <td>{{ row.deliveryNo }}</td>
                <td>{{ row.destination }}</td>
                <td>{{ row.receiver }}</td>
                <td>{{ row.product }}</td>
                <td>{{ row.pieces }}</td>
                <td>{{ row.department }}</td>
                <td>{{ row.currency }}</td>
                <td class="money">{{ formatMoney(row.freightFee) }}</td>
                <td class="money">{{ formatMoney(row.deliveryFee) }}</td>
                <td class="money">{{ formatMoney(row.unloadFee) }}</td>
                <td class="money">{{ formatMoney(row.exceptionFee) }}</td>
                <td class="money">{{ formatMoney(row.delayDeduction) }}</td>
                <td class="money statement-total-cell">{{ formatMoney(row.totalFee) }}</td>
                <td>{{ row.remark || '-' }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td>合计</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td class="money">{{ formatMoney(parsedStatement.totals.freightFee) }}</td>
                <td class="money">{{ formatMoney(parsedStatement.totals.deliveryFee) }}</td>
                <td class="money">{{ formatMoney(parsedStatement.totals.unloadFee) }}</td>
                <td class="money">{{ formatMoney(parsedStatement.totals.exceptionFee) }}</td>
                <td class="money">{{ formatMoney(parsedStatement.totals.delayDeduction) }}</td>
                <td class="money statement-total-cell">{{ formatMoney(parsedStatement.totals.totalFee) }}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section class="panel">
        <div class="section-head">
          <div class="section-title">财务核对流程</div>
          <div class="section-extra">仓管财务核对后流转总部财务核对</div>
        </div>
        <div class="reconcile-review-flow">
          <div class="review-step" :class="{ active: ['待物流上传', '待物流确认'].includes(reviewStage), done: !['待物流上传', '待物流确认'].includes(reviewStage) }">
            <span>1</span>
            <strong>{{ isConfirmStatementTask ? '物流确认对账单' : '物流上传对账单' }}</strong>
            <small>{{ parsedStatement ? '已生成对账单数据' : '待上传附件' }}</small>
          </div>
          <div class="review-step" :class="{ active: reviewStage === '待仓管财务核对', done: ['待总部财务核对', '已完成'].includes(reviewStage) }">
            <span>2</span>
            <strong>仓管财务核对</strong>
            <small>核对费用项、交货单号、附件和备注</small>
          </div>
          <div class="review-step" :class="{ active: reviewStage === '待总部财务核对', done: reviewStage === '已完成' }">
            <span>3</span>
            <strong>总部财务核对</strong>
            <small>最终复核并完成对账</small>
          </div>
        </div>
        <div class="departure-actions">
          <button class="btn" type="button" :disabled="reviewStage !== '待仓管财务核对'" @click="approveWarehouseFinance">
            仓管财务核对通过
          </button>
          <button class="btn primary" type="button" :disabled="reviewStage !== '待总部财务核对'" @click="approveHeadquartersFinance">
            总部财务核对通过
          </button>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>费用项</th>
                <th>金额</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in feeItems" :key="item.name">
                <td>{{ item.name }}</td>
                <td class="money">{{ item.amount }}</td>
                <td>{{ item.status }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </section>
</template>
