<script setup>
import { computed, ref, watch } from 'vue'
import { materials, shipmentTasks } from '../data/logistics'

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
const freightTooltip = ref({
  visible: false,
  text: '',
  x: 0,
  y: 0,
  placement: 'top'
})
const freightDetailOpen = ref(false)
const feeReviewItems = ref([
  { name: '运费', amount: 1680, status: '待确认' },
  { name: '送货费', amount: 260, status: '待确认' },
  { name: '超长费', amount: 80, status: '待确认' },
  { name: '卸货费', amount: 120, status: '待确认' },
  { name: '打木架费', amount: 0, status: '无费用' },
  { name: '入仓费', amount: 0, status: '无费用' },
  { name: '搬运费', amount: 60, status: '待确认' }
])
const feeAdjustmentRows = ref([
  { id: 1, itemName: '运费', amount: '', reason: '', attachmentName: '' }
])
const nextFeeAdjustmentRowId = ref(2)
const feeAdjustmentHistory = ref([
  {
    time: '2026-05-28 16:20',
    reviewType: '仓管确认费用',
    itemName: '送货费',
    before: 220,
    after: 260,
    operator: '李敏',
    reason: '按客户指定送货点补充送货费',
    attachmentName: '送货点变更确认.png'
  }
])

const selectedListRow = computed(() => listRows.value.find((item) => item.id === selectedId.value))
const isDetail = computed(() => Boolean(selectedId.value))
const isCreatingStatement = computed(() => selectedId.value === 'NEW')
const activeTask = computed(() => shipmentTasks.find((task) => task.no === props.taskNo))
const isTaskFlow = computed(() => Boolean(activeTask.value))
const isConfirmStatementTask = computed(() => activeTask.value?.status === '确认对账单')
const showFeeAdjustment = computed(() => !['待生成账单', '待物流开票', '待发票付款'].includes(activeTask.value?.status))
const showGenerateBillButton = computed(() => isTaskFlow.value && reviewStage.value === '待生成账单')
const taskFlowTitle = computed(() => {
  const status = activeTask.value?.status
  if (status === '待仓管确认费用') return '仓管确认费用'
  if (status === '待物流确认费用') return '物流确认费用'
  if (status === '待生成账单') return '生成账单'
  if (status === '待物流开票') return '物流开票'
  if (status === '待发票付款') return '发票付款'
  if (isConfirmStatementTask.value) return '确认对账单'
  return isCreatingStatement.value ? '新增对账单' : '对账单详情'
})
const taskFlowSubtitle = computed(() => {
  const status = activeTask.value?.status
  if (status === '待仓管确认费用') return '签收后核对运费、送货费、超长费、卸货费、打木架费、入仓费和搬运费，可调整并记录历史。'
  if (status === '待物流确认费用') return '物流公司限时确认费用；有异议时回滚至仓管确认费用。'
  if (status === '待生成账单') return '已确认费用进入账单生成，可手动生成或等待月初自动生成。'
  if (status === '待物流开票') return '物流公司根据账单上传发票，发票齐套后进入付款。'
  if (status === '待发票付款') return '发票付款流程由系统或财务发起并跟踪处理结果。'
  return '物流公司确认对账单明细后提交，再由仓管财务和总部财务依次核对。'
})
const canUpload = computed(() => templateDownloaded.value && Boolean(statementFileName.value))
const parsedTotal = computed(() => parsedStatement.value?.totals?.totalFee || 0)
const feeReviewTotal = computed(() => feeReviewItems.value.reduce((total, item) => total + toAmount(item.amount), 0))
const freightMaterialRows = computed(() =>
  materials.map((item, index) => {
    const weight = [18, 12, 5, 3, 2, 1.5, 32, 9, 4][index] || 2
    const volume = ((item.lengthMm || 400) * (item.widthMm || 180) * (item.heightMm || 90)) / 1000000000
    const freight = item.large ? weight * 0.33 : volume * 105
    return {
      ...item,
      weight,
      volume,
      freight
    }
  })
)
const freightMaterialTotal = computed(() => freightMaterialRows.value.reduce((total, item) => total + item.freight, 0))
const freightDetailTooltip = computed(() => {
  const volumeUnitPrice = 105
  const weightUnitPrice = 0.33
  return `普通物料按体积计费，大件物料按重量计费。\n普通物料运费 = 体积 × 体积计费单价 ${formatMoney(volumeUnitPrice)} 元/m³。\n大件物料运费 = 重量 × 重量计费单价 ${formatMoney(weightUnitPrice)} 元/kg。`
})
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

function positionFreightTooltip(event) {
  const target = event.currentTarget
  const rect = target.getBoundingClientRect()
  const tooltipText = target.dataset.tooltip || ''
  const lineCount = tooltipText.split('\n').reduce((count, line) => count + Math.max(1, Math.ceil(line.length / 26)), 0)
  const estimatedHeight = Math.min(360, lineCount * 22 + 28)
  const shouldShowBelow = rect.top < estimatedHeight + 16

  freightTooltip.value = {
    visible: true,
    text: tooltipText,
    x: rect.left + rect.width / 2,
    y: shouldShowBelow ? rect.bottom + 8 : rect.top - 8,
    placement: shouldShowBelow ? 'bottom' : 'top'
  }
}

function hideFreightTooltip() {
  freightTooltip.value.visible = false
}

function addFeeAdjustmentRow() {
  feeAdjustmentRows.value.push({
    id: nextFeeAdjustmentRowId.value,
    itemName: feeReviewItems.value[0]?.name || '',
    amount: '',
    reason: '',
    attachmentName: ''
  })
  nextFeeAdjustmentRowId.value += 1
}

function removeFeeAdjustmentRow(rowId) {
  if (feeAdjustmentRows.value.length === 1) return
  feeAdjustmentRows.value = feeAdjustmentRows.value.filter((row) => row.id !== rowId)
}

function submitFeeAdjustments() {
  const hasInvalidRow = feeAdjustmentRows.value.some((row) => {
    const amount = toAmount(row.amount)
    return !row.itemName || !Number.isFinite(amount) || amount < 0 || !row.reason.trim()
  })
  if (hasInvalidRow) {
    window.alert('请完整填写调整费用项、调整后金额和调整原因。')
    return
  }

  const validRows = feeAdjustmentRows.value
    .map((row) => ({
      ...row,
      amount: toAmount(row.amount),
      reason: row.reason.trim()
    }))
    .filter((row) => row.itemName && Number.isFinite(row.amount) && row.amount >= 0 && row.reason)

  if (!validRows.length) return

  validRows.forEach((row, index) => {
    const target = feeReviewItems.value.find((item) => item.name === row.itemName)
    if (!target) return

    const before = toAmount(target.amount)
    target.amount = row.amount
    target.status = row.amount > 0 ? '已调整待确认' : '无费用'
    feeAdjustmentHistory.value.unshift({
      time: `2026-05-28 16:${String(35 + index).padStart(2, '0')}`,
      reviewType: '仓管确认费用',
      itemName: target.name,
      before,
      after: row.amount,
      operator: '李敏',
      reason: row.reason,
      attachmentName: row.attachmentName || '无'
    })
  })

  feeAdjustmentRows.value = [{ id: nextFeeAdjustmentRowId.value, itemName: feeReviewItems.value[0]?.name || '', amount: '', reason: '', attachmentName: '' }]
  nextFeeAdjustmentRowId.value += 1
}

function handleAdjustmentAttachmentChange(row, event) {
  const [file] = event.target.files || []
  row.attachmentName = file?.name || ''
}

function viewAttachment(name) {
  if (!name || name === '无') return
  window.alert(`查看附件：${name}`)
}

function downloadAttachment(name) {
  if (!name || name === '无') return
  const link = document.createElement('a')
  link.href = `data:text/plain;charset=utf-8,${encodeURIComponent(`附件下载占位：${name}`)}`
  link.download = name
  link.click()
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

function escapeExcelValue(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function getExcelCellType(value) {
  return typeof value === 'number' && Number.isFinite(value) ? 'Number' : 'String'
}

function makeExcelCell(value, styleId = '') {
  const type = getExcelCellType(value)
  const style = styleId ? ` ss:StyleID="${styleId}"` : ''
  return `<Cell${style}><Data ss:Type="${type}">${escapeExcelValue(value)}</Data></Cell>`
}

function makeExcelWorksheet(name, headers, rows) {
  const headerRow = `<Row>${headers.map((header) => makeExcelCell(header, 'Header')).join('')}</Row>`
  const bodyRows = rows
    .map((row) => `<Row>${row.map((cell) => makeExcelCell(cell)).join('')}</Row>`)
    .join('')

  return `
    <Worksheet ss:Name="${escapeExcelValue(name)}">
      <Table>
        ${headerRow}
        ${bodyRows}
      </Table>
      <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
        <DisplayGridlines />
      </WorksheetOptions>
    </Worksheet>
  `
}

function exportFeeReviewExcel() {
  const taskName = activeTask.value?.no || selectedListRow.value?.id || '费用核对'
  const summaryRows = [
    ...feeReviewItems.value.map((item) => [item.name, formatMoney(item.amount), item.status]),
    ['合计', formatMoney(feeReviewTotal.value), '']
  ]
  const freightRows = [
    ...freightMaterialRows.value.map((item) => [
      item.code,
      item.name,
      item.planned,
      formatMoney(item.weight),
      item.volume.toFixed(4),
      formatMoney(item.freight)
    ]),
    ['合计', '', '', '', '', formatMoney(freightMaterialTotal.value)]
  ]
  const workbook = `<?xml version="1.0" encoding="UTF-8"?>
    <?mso-application progid="Excel.Sheet"?>
    <Workbook
      xmlns="urn:schemas-microsoft-com:office:spreadsheet"
      xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
      <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
        <Title>${escapeExcelValue(taskName)} 费用核对导出</Title>
      </DocumentProperties>
      <Styles>
        <Style ss:ID="Header">
          <Font ss:Bold="1" />
          <Interior ss:Color="#EEF2F7" ss:Pattern="Solid" />
          <Borders>
            <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" />
            <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" />
            <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" />
            <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" />
          </Borders>
        </Style>
      </Styles>
      ${makeExcelWorksheet('费用核对', ['费用项', '金额', '状态'], summaryRows)}
      ${makeExcelWorksheet('运费明细', ['物料编码', '名称', '数量', '重量(kg)', '体积(m³)', '运费'], freightRows)}
    </Workbook>`
  const blob = new Blob([workbook], { type: 'application/vnd.ms-excel;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${taskName}-费用核对.xls`
  link.click()
  URL.revokeObjectURL(url)
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

function generateBill() {
  if (reviewStage.value !== '待生成账单') return
  const confirmed = window.confirm('确认生成账单？生成后将进入物流开票环节。')
  if (!confirmed) return

  reviewStage.value = '待物流开票'
  if (selectedListRow.value) selectedListRow.value.stage = reviewStage.value
}

watch(
  () => props.taskNo,
  (taskNo) => {
    if (!taskNo) return
    createStatement()
    const status = activeTask.value?.status
    if (status === '待仓管确认费用') reviewStage.value = '待仓管确认费用'
    if (status === '待物流确认费用') reviewStage.value = '待物流确认费用'
    if (status === '待生成账单') reviewStage.value = '待生成账单'
    if (status === '待物流开票') reviewStage.value = '待物流开票'
    if (status === '待发票付款') reviewStage.value = '待发票付款'
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
    <Teleport to="body">
      <div
        v-if="freightTooltip.visible"
        class="freight-tooltip"
        :class="`is-${freightTooltip.placement}`"
        :style="{ left: `${freightTooltip.x}px`, top: `${freightTooltip.y}px` }"
      >
        {{ freightTooltip.text }}
      </div>
    </Teleport>
    <Teleport to=".topbar-actions">
      <button v-if="!isDetail" class="btn primary" type="button" @click="createStatement">新增对账单</button>
      <button v-if="isCreatingStatement && !isTaskFlow" class="btn primary" type="button" :disabled="!canUpload" @click="submitStatement">提交对账单</button>
      <button v-if="showGenerateBillButton" class="btn primary" type="button" @click="generateBill">生成账单</button>
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
          <h1>{{ taskFlowTitle }}</h1>
          <p class="subline">{{ taskFlowSubtitle }}</p>
        </article>
        <article class="panel metric">
          <div class="metric-label">费用状态</div>
          <div class="metric-value">{{ reviewStage }}</div>
          <div class="metric-note">仓管确认 / 物流确认 / 账单开票付款</div>
        </article>
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

      <section class="panel fee-confirm-panel">
        <div class="fee-confirm-grid" :class="{ 'single-column': !showFeeAdjustment }">
          <div class="fee-review-card">
            <div class="section-head">
              <div class="section-title-actions">
                <div class="section-title">费用核对</div>
                <button class="btn mini" type="button" @click="exportFeeReviewExcel">导出Excel</button>
              </div>
              <div class="statement-total">
                <span>核对费用合计</span>
                <strong>{{ formatMoney(feeReviewTotal) }}</strong>
              </div>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>费用项</th>
                    <th>金额</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-for="item in feeReviewItems" :key="item.name">
                    <tr>
                      <td>{{ item.name }}</td>
                      <td class="money">{{ formatMoney(item.amount) }}</td>
                      <td>
                        <button v-if="item.name === '运费'" class="btn table-action" type="button" @click="freightDetailOpen = !freightDetailOpen">
                          {{ freightDetailOpen ? '收起明细' : '查看明细' }}
                        </button>
                        <span v-else>-</span>
                      </td>
                    </tr>
                    <tr v-if="item.name === '运费' && freightDetailOpen" class="fee-detail-row">
                      <td colspan="3">
                        <div class="table-wrap fee-detail-table">
                          <table>
                            <thead>
                              <tr>
                                <th>物料编码</th>
                                <th>名称</th>
                                <th>数量</th>
                                <th>重量(kg)</th>
                                <th>体积(m³)</th>
                                <th>
                                  <span class="freight-cell">
                                    运费
                                    <span
                                      class="freight-help"
                                      tabindex="0"
                                      :title="freightDetailTooltip"
                                      :data-tooltip="freightDetailTooltip"
                                      aria-label="查看运费计算逻辑"
                                      @pointerenter="positionFreightTooltip"
                                      @mouseenter="positionFreightTooltip"
                                      @mouseleave="hideFreightTooltip"
                                      @focus="positionFreightTooltip"
                                      @blur="hideFreightTooltip"
                                    >?</span>
                                  </span>
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr v-for="detail in freightMaterialRows" :key="detail.code">
                                <td>{{ detail.code }}</td>
                                <td>{{ detail.name }}</td>
                                <td>{{ detail.planned }}</td>
                                <td>{{ formatMoney(detail.weight) }}</td>
                                <td>{{ detail.volume.toFixed(4) }}</td>
                                <td class="money">{{ formatMoney(detail.freight) }}</td>
                              </tr>
                            </tbody>
                            <tfoot>
                              <tr>
                                <td>合计</td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td class="money">{{ formatMoney(freightMaterialTotal) }}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>
          </div>
          <div v-if="showFeeAdjustment" class="fee-adjust-card">
            <div class="section-head">
              <div class="section-title">费用调整</div>
            </div>
            <div class="fee-adjust-form">
              <div class="fee-adjust-list">
                <div v-for="(row, index) in feeAdjustmentRows" :key="row.id" class="fee-adjust-row">
                  <div class="fee-adjust-row-head">
                    <strong>调整项 {{ index + 1 }}</strong>
                    <button class="btn mini fee-row-remove" type="button" :disabled="feeAdjustmentRows.length === 1" @click="removeFeeAdjustmentRow(row.id)">移除</button>
                  </div>
                  <label class="reconcile-remark-field">
                    <span>调整费用项 <b class="required">*</b></span>
                    <select v-model="row.itemName" class="field" required>
                      <option v-for="item in feeReviewItems" :key="item.name" :value="item.name">{{ item.name }}</option>
                    </select>
                  </label>
                  <label class="reconcile-remark-field">
                    <span>调整后金额 <b class="required">*</b></span>
                    <input v-model="row.amount" class="field" type="number" min="0" step="0.01" required placeholder="输入调整后金额" />
                  </label>
                  <label class="reconcile-remark-field fee-adjust-reason">
                    <span>调整原因 <b class="required">*</b></span>
                    <textarea v-model="row.reason" class="field remark-field" rows="2" required placeholder="填写调整原因"></textarea>
                  </label>
                  <label class="reconcile-remark-field fee-adjust-attachment">
                    <span>调整附件</span>
                    <input class="field" type="file" accept=".pdf,.jpg,.jpeg,.png,.xls,.xlsx,.doc,.docx" @change="handleAdjustmentAttachmentChange(row, $event)" />
                    <small>{{ row.attachmentName || '支持上传费用凭证、沟通记录或审批附件' }}</small>
                  </label>
                </div>
              </div>
              <button class="btn fee-add-row" type="button" @click="addFeeAdjustmentRow">新增调整项</button>
              <button class="btn primary fee-adjust-submit" type="button" @click="submitFeeAdjustments">提交调整</button>
            </div>
          </div>
        </div>
        <div class="fee-history-section">
          <div class="section-head">
            <div class="section-title">费用核对记录</div>
          </div>
          <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>时间</th>
                <th>核对类型</th>
                <th>费用项</th>
                <th>调整前</th>
                <th>调整后</th>
                <th>操作人</th>
                <th>原因</th>
                <th>附件</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in feeAdjustmentHistory" :key="`${record.time}-${record.itemName}-${record.after}`">
                <td>{{ record.time }}</td>
                <td>{{ record.reviewType || '仓管确认费用' }}</td>
                <td>{{ record.itemName }}</td>
                <td class="money">{{ formatMoney(record.before) }}</td>
                <td class="money">{{ formatMoney(record.after) }}</td>
                <td>{{ record.operator }}</td>
                <td>{{ record.reason }}</td>
                <td>
                  <div v-if="record.attachmentName && record.attachmentName !== '无'" class="attachment-actions">
                    <span>{{ record.attachmentName }}</span>
                    <button class="btn mini" type="button" @click="viewAttachment(record.attachmentName)">查看</button>
                    <button class="btn mini" type="button" @click="downloadAttachment(record.attachmentName)">下载</button>
                  </div>
                  <span v-else>-</span>
                </td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>
      </section>
    </template>
  </section>
</template>
