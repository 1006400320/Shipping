<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { carrierConfigs, materials, senderConfigs, shipmentTasks } from '../data/logistics'
import { idbGet, idbSet } from '../storage/indexedDb'

const props = defineProps({
  taskNo: {
    type: String,
    default: ''
  }
})
const emit = defineEmits(['back-to-workbench'])

const NORMAL = '正常'
const FREIGHT_CONFIG_STORAGE_KEY = 'freight-config:v1'
const deliveryMethods = ['货运', '车辆出货', '工程出货', '快递', '自提']
const settlementMethods = ['月结', '现付']
const sourceTypes = ['交货单', '调拨单', '手工录入']
const showOrgDialog = ref(false)
const selectedCostCenter = ref(null)
const senderRows = ref(senderConfigs.map((item) => ({ ...item })))
const carrierRows = ref(cloneRows(carrierConfigs))
const selectedSenderId = ref('')
const selectedCarrierId = ref('')
const selectedPickupPersonId = ref('')
const sheetNotice = ref('')
const draftTaskNo = ref('')
const DELIVERY_DETAIL_STORAGE_PREFIX = 'delivery-detail:'
const deliveryForm = reactive({
  sourceType: '交货单',
  sourceNo: '',
  receiverCompany: '',
  deliveryMethod: '',
  settlementMethod: '',
  originCountry: '中国',
  originProvince: '广东省',
  originCity: '深圳市',
  originAddress: '',
  destinationProvince: '',
  destinationCity: '',
  address: '',
  deliveryNote: '',
  deliveryNo: '',
  contractNo: '',
  salesOrderNo: '',
  receiver: '',
  receiverPhone: '',
  vehicleNo: '',
  actualDeliveryDate: '',
  requiredArrivalDate: '',
  handoverContact: '',
  signDate: '',
  receiverSignName: '',
  receiverSignDate: ''
})

const organizationTree = [
  {
    name: '深圳市捷顺科技实业股份有限公司',
    code: 'JS000',
    children: [
      { name: '营销中心', code: 'JS100', children: [{ name: '华南销售部', code: 'JS101' }, { name: '大客户业务部', code: 'JS102' }] },
      { name: '制造中心', code: 'JS200', children: [{ name: '交付管理部', code: 'JS201' }, { name: '物流管理部', code: 'JS202' }] },
      { name: '工程服务中心', code: 'JS300', children: [{ name: '项目实施部', code: 'JS301' }, { name: '售后服务部', code: 'JS302' }] }
    ]
  }
]
const materialRows = reactive([{ code: '', description: '', unit: '', actualQty: '', pieces: '', price: '', total: '', remark: '' }])
const expenseForm = reactive({ transferFee: '', deliveryFee: '', otherFee: '', feeChange: '', remark: '' })
const expenseCells = [
  { key: 'transferFee', label: '中转费', type: 'amount' },
  { key: 'transportFee', label: '运输费', type: 'readonly' },
  { key: 'deliveryFee', label: '送货费', type: 'amount' },
  { key: 'otherFee', label: '其他费用', type: 'amount' },
  { key: 'feeChange', label: '费用变更', type: 'text' },
  { key: 'totalFee', label: '该单合计总费用', type: 'readonly' },
  { key: 'remark', label: '备注', type: 'text' }
]
const transportFee = computed(() => materialRows.reduce((sum, row) => sum + parseMoney(row.total), 0))
const totalFee = computed(() => transportFee.value + parseMoney(expenseForm.transferFee) + parseMoney(expenseForm.deliveryFee) + parseMoney(expenseForm.otherFee))
const enabledSenderOptions = computed(() => senderRows.value.filter((item) => item.status === NORMAL))
const selectedSender = computed(() => enabledSenderOptions.value.find((item) => item.id === selectedSenderId.value))
const selectedSenderPhone = computed(() => selectedSender.value?.phone || '')
const enabledCarrierOptions = computed(() => carrierRows.value.filter((item) => item.status === NORMAL))
const selectedCarrier = computed(() => enabledCarrierOptions.value.find((item) => item.id === selectedCarrierId.value))
const enabledPickupPersonOptions = computed(() => {
  const people = selectedCarrier.value?.pickupPeople
  return Array.isArray(people) ? people.filter((person) => person.status === NORMAL) : []
})
const selectedPickupPerson = computed(() => enabledPickupPersonOptions.value.find((person) => person.id === selectedPickupPersonId.value))
const selectedPickupPhone = computed(() => selectedPickupPerson.value?.phone || '')
const selectedPickupIdCard = computed(() => selectedPickupPerson.value?.idCard || '')
const needsSourceNo = computed(() => deliveryForm.sourceType === '交货单' || deliveryForm.sourceType === '调拨单')

function cloneRows(rows) { return rows.map((item) => ({ ...item, pickupPeople: Array.isArray(item.pickupPeople) ? item.pickupPeople.map((person) => ({ ...person })) : item.pickupPeople })) }
function mergeConfigRow(item, fallback) { const merged = { ...(fallback || {}), ...item }; if (fallback?.phone && typeof merged.phone === 'string' && merged.phone.includes('*')) merged.phone = fallback.phone; if (Array.isArray(fallback?.pickupPeople) || Array.isArray(item?.pickupPeople)) { const fallbackPeople = Array.isArray(fallback?.pickupPeople) ? fallback.pickupPeople : []; const savedPeople = Array.isArray(item?.pickupPeople) ? item.pickupPeople : []; const fallbackById = new Map(fallbackPeople.map((person) => [person.id, person])); const mergedPeople = savedPeople.map((person) => ({ ...(fallbackById.get(person.id) || {}), ...person })); const mergedIds = new Set(mergedPeople.map((person) => person.id)); const missingFallbackPeople = fallbackPeople.filter((person) => !mergedIds.has(person.id)); merged.pickupPeople = [...mergedPeople, ...missingFallbackPeople.map((person) => ({ ...person }))] } return merged }
function restoreRows(savedRows, fallbackRows) { if (!Array.isArray(savedRows)) return cloneRows(fallbackRows); const fallbackById = new Map(fallbackRows.map((item) => [item.id, item])); const restoredRows = savedRows.map((item) => mergeConfigRow(item, fallbackById.get(item.id))); const restoredIds = new Set(restoredRows.map((item) => item.id)); const newFallbackRows = fallbackRows.filter((item) => !restoredIds.has(item.id)); return [...restoredRows, ...cloneRows(newFallbackRows)] }
async function loadConfigOptions() { try { const saved = await idbGet(FREIGHT_CONFIG_STORAGE_KEY); senderRows.value = restoreRows(saved?.senderRows, senderConfigs); carrierRows.value = restoreRows(saved?.carrierRows, carrierConfigs); if (!enabledSenderOptions.value.some((item) => item.id === selectedSenderId.value)) selectedSenderId.value = ''; if (!enabledCarrierOptions.value.some((item) => item.id === selectedCarrierId.value)) { selectedCarrierId.value = ''; selectedPickupPersonId.value = '' } if (!enabledPickupPersonOptions.value.some((person) => person.id === selectedPickupPersonId.value)) selectedPickupPersonId.value = '' } catch (error) { senderRows.value = cloneRows(senderConfigs); carrierRows.value = cloneRows(carrierConfigs) } }
function handleCarrierChange() { selectedPickupPersonId.value = '' }
function openOrgDialog() { showOrgDialog.value = true }
function closeOrgDialog() { showOrgDialog.value = false }
function selectCostCenter(node) { selectedCostCenter.value = node; closeOrgDialog() }
function parseMoney(value) { const amount = Number(value); return Number.isFinite(amount) ? amount : 0 }
function formatMoney(value) { return value.toFixed(2) }
function normalizeMoney(value) { const cleaned = String(value).replace(/[^\d.]/g, ''); const [integer = '', ...decimalParts] = cleaned.split('.'); const hasDecimal = cleaned.includes('.'); const normalizedInteger = integer.replace(/^0+(?=\d)/, '') || (hasDecimal ? '0' : ''); const decimal = decimalParts.join('').slice(0, 2); return hasDecimal ? `${normalizedInteger}.${decimal}` : normalizedInteger }
function updateExpenseAmount(key, event) { const value = normalizeMoney(event.target.value); expenseForm[key] = value; event.target.value = value }
function getReadonlyExpenseValue(key) { return formatMoney(key === 'transportFee' ? transportFee.value : totalFee.value) }
function getCurrentTask() { return shipmentTasks.find((task) => task.no === props.taskNo) }
function getEffectiveTaskNo() { return props.taskNo || draftTaskNo.value }
function createTaskNo() {
  const maxNo = shipmentTasks.reduce((max, task) => {
    const value = Number(task.no)
    return Number.isFinite(value) ? Math.max(max, value) : max
  }, 2604030000)
  return String(maxNo + 1)
}
function ensureDraftTask() {
  if (props.taskNo) return getCurrentTask()
  if (!draftTaskNo.value) {
    draftTaskNo.value = createTaskNo()
    deliveryForm.deliveryNo = deliveryForm.deliveryNo || `8111${draftTaskNo.value.slice(-4)}`
    shipmentTasks.unshift({
      no: draftTaskNo.value,
      customer: deliveryForm.receiverCompany || '手工创建送货单',
      receiver: deliveryForm.receiver || '',
      phone: deliveryForm.receiverPhone || '',
      address: deliveryForm.address || '',
      applicationNo: '',
      deliveryNo: deliveryForm.deliveryNo,
      transferNo: '',
      requiredDate: deliveryForm.requiredArrivalDate || '',
      contractNo: deliveryForm.contractNo || '',
      salesOrderNo: deliveryForm.salesOrderNo || '',
      receiverCompany: deliveryForm.receiverCompany || '',
      carrier: '',
      currentNode: '完善',
      status: '待完善',
      priority: '普通',
      plannedDate: deliveryForm.requiredArrivalDate || '',
      progress: { done: 0, total: 20 },
      boxes: { total: 0, sealed: 0, active: 0 },
      feeStatus: '未对账',
      tone: 'amber'
    })
  }
  return shipmentTasks.find((task) => task.no === draftTaskNo.value)
}
function findSourceTask() {
  const sourceNo = deliveryForm.sourceNo.trim()
  if (!needsSourceNo.value || !sourceNo) return null
  return shipmentTasks.find((task) => {
    const candidates = deliveryForm.sourceType === '调拨单'
      ? [task.transferNo, task.no]
      : [task.no, task.deliveryNo, task.applicationNo]
    return candidates.some((item) => item && item === sourceNo)
  })
}
function fillMaterialRows() {
  materialRows.splice(0, materialRows.length, ...materials.map((item) => ({
    code: item.code || '',
    description: item.name || '',
    unit: '件',
    actualQty: item.planned || '',
    pieces: item.planned || '',
    price: '',
    total: '',
    remark: ''
  })))
}
function fillDestinationFromAddress(address) {
  if (address.includes('上海市')) {
    deliveryForm.destinationProvince = '上海市'
    deliveryForm.destinationCity = '上海市'
    return
  }
  if (address.includes('广州市')) {
    deliveryForm.destinationProvince = '广东省'
    deliveryForm.destinationCity = '广州市'
    return
  }
  if (address.includes('惠州市')) {
    deliveryForm.destinationProvince = '广东省'
    deliveryForm.destinationCity = '惠州市'
  }
}
function fillDeliveryFromSource() {
  const task = findSourceTask()
  if (!task) {
    if (needsSourceNo.value && deliveryForm.sourceNo.trim()) sheetNotice.value = `未找到${deliveryForm.sourceType}：${deliveryForm.sourceNo.trim()}`
    return
  }
  deliveryForm.contractNo = task.contractNo || ''
  deliveryForm.salesOrderNo = task.salesOrderNo || ''
  deliveryForm.receiverCompany = task.receiverCompany || task.customer || ''
  deliveryForm.receiver = task.receiver || ''
  deliveryForm.receiverPhone = task.phone || ''
  deliveryForm.originCountry = '中国'
  deliveryForm.originProvince = '广东省'
  deliveryForm.originCity = '深圳市'
  deliveryForm.originAddress = '捷顺科技园'
  deliveryForm.destinationProvince = ''
  deliveryForm.destinationCity = ''
  deliveryForm.address = task.address || ''
  fillDestinationFromAddress(deliveryForm.address)
  deliveryForm.requiredArrivalDate = task.requiredDate || ''
  fillMaterialRows()
  sheetNotice.value = `已根据${deliveryForm.sourceType}带出基础资料和发货物料`
}
function handleSourceTypeChange() {
  deliveryForm.sourceNo = ''
  if (deliveryForm.sourceType === '手工录入') sheetNotice.value = ''
}
function getDeliveryDetailKey() { return `${DELIVERY_DETAIL_STORAGE_PREFIX}${getEffectiveTaskNo() || 'draft'}` }
function buildDeliveryPayload() { return { taskNo: props.taskNo, deliveryForm: { ...deliveryForm }, materialRows: materialRows.map((item) => ({ ...item })), expenseForm: { ...expenseForm }, selectedCostCenter: selectedCostCenter.value ? { ...selectedCostCenter.value } : null, selectedSenderId: selectedSenderId.value, selectedCarrierId: selectedCarrierId.value, selectedPickupPersonId: selectedPickupPersonId.value, sender: selectedSender.value ? { ...selectedSender.value } : null, carrier: selectedCarrier.value ? { ...selectedCarrier.value } : null, pickupPerson: selectedPickupPerson.value ? { ...selectedPickupPerson.value } : null, transportFee: transportFee.value, totalFee: totalFee.value, updatedAt: new Date().toISOString() } }
async function saveDeliveryDetail() { const task = ensureDraftTask(); if (!task) throw new Error('缺少交货单号，无法保存完善信息'); const payload = { ...buildDeliveryPayload(), taskNo: task.no }; await idbSet(getDeliveryDetailKey(), payload); return payload }
async function loadDeliveryDetail() { if (!props.taskNo) return; const saved = await idbGet(getDeliveryDetailKey()); if (!saved) { const task = getCurrentTask(); if (task) { deliveryForm.receiverCompany = task.receiverCompany || task.customer || ''; deliveryForm.deliveryNo = task.deliveryNo || ''; deliveryForm.contractNo = task.contractNo || ''; deliveryForm.salesOrderNo = task.salesOrderNo || ''; deliveryForm.receiver = task.receiver || ''; deliveryForm.receiverPhone = task.phone || ''; deliveryForm.address = task.address || ''; deliveryForm.requiredArrivalDate = task.requiredDate || '' } return } Object.assign(deliveryForm, saved.deliveryForm || {}); Object.assign(expenseForm, saved.expenseForm || {}); selectedCostCenter.value = saved.selectedCostCenter || null; selectedSenderId.value = saved.selectedSenderId || ''; selectedCarrierId.value = saved.selectedCarrierId || ''; selectedPickupPersonId.value = saved.selectedPickupPersonId || ''; if (Array.isArray(saved.materialRows) && saved.materialRows.length) materialRows.splice(0, materialRows.length, ...saved.materialRows.map((item) => ({ ...item }))) }
async function saveDraft() { const task = ensureDraftTask(); if (task) { task.currentNode = '完善'; task.status = '待完善'; task.tone = 'amber' } try { await saveDeliveryDetail(); sheetNotice.value = '已保存完善信息草稿' } catch (error) { sheetNotice.value = error instanceof Error ? error.message : '保存失败' } }
async function submitDelivery() { const task = ensureDraftTask(); try { const saved = await saveDeliveryDetail(); if (task) { task.currentNode = '打印'; task.status = '待打印'; task.tone = 'blue'; task.deliveryNo = saved.deliveryForm.deliveryNo || task.deliveryNo; task.contractNo = saved.deliveryForm.contractNo || task.contractNo; task.salesOrderNo = saved.deliveryForm.salesOrderNo || task.salesOrderNo; task.receiverCompany = saved.deliveryForm.receiverCompany || task.receiverCompany; task.customer = saved.deliveryForm.receiverCompany || task.customer; task.receiver = saved.deliveryForm.receiver || task.receiver; task.phone = saved.deliveryForm.receiverPhone || task.phone; task.address = saved.deliveryForm.address || task.address; task.requiredDate = saved.deliveryForm.requiredArrivalDate || task.requiredDate; task.plannedDate = saved.deliveryForm.requiredArrivalDate || task.plannedDate } sheetNotice.value = '已提交，完善信息已同步到详情页'; emit('back-to-workbench') } catch (error) { sheetNotice.value = error instanceof Error ? error.message : '提交失败' } }
onMounted(() => { void loadConfigOptions(); void loadDeliveryDetail() })
</script>

<template>
  <section class="content complete-page">
    <section class="panel delivery-sheet">
      <div class="sheet-actions">
        <button class="btn" type="button" @click="saveDraft">保存</button>
        <button class="btn primary" type="button" @click="submitDelivery">提交</button>
      </div>
      <header class="delivery-header">
        <div class="jieshun-brand">
          <span class="logo-mark"><span class="mark-red"></span><span class="mark-blue"></span></span>
          <div>
            <div class="logo-text">捷顺</div>
            <div class="logo-en">JIESHUN</div>
            <div class="logo-site">http://www.jieshun.cn</div>
          </div>
        </div>
        <div class="sheet-title"><h1>深圳市捷顺科技实业股份有限公司</h1><strong>送货单</strong></div>
      </header>
      <div v-if="sheetNotice" class="toolbar-notice sheet-notice">{{ sheetNotice }}</div>
      <!-- 保持原完整页面内容不变 -->
      <section class="delivery-basic">
        <div class="basic-left">
          <div class="form-line option-line source-type-line"><span>送货单来源</span><label v-for="type in sourceTypes" :key="type" class="radio-item"><input v-model="deliveryForm.sourceType" type="radio" name="sourceType" :value="type" @change="handleSourceTypeChange" />{{ type }}</label></div>
          <label v-if="needsSourceNo" class="form-line form-line-wide"><span>{{ deliveryForm.sourceType }}号</span><input v-model.trim="deliveryForm.sourceNo" class="sheet-input" type="text" :placeholder="`请输入${deliveryForm.sourceType}号`" @blur="fillDeliveryFromSource" /></label>
          <label class="form-line form-line-wide"><span>收货单位<span class="required">*</span></span><input v-model="deliveryForm.receiverCompany" class="sheet-input" type="text" /></label>
          <div class="form-line split-line"><span>成本中心<span class="required">*</span></span><button class="sheet-select-button" type="button" @click="openOrgDialog">{{ selectedCostCenter?.code ? `${selectedCostCenter.code} ${selectedCostCenter.name}` : '选择' }}</button></div>
          <div class="form-line option-line"><span>发运方式<span class="required">*</span></span><label v-for="method in deliveryMethods" :key="method" class="radio-item"><input v-model="deliveryForm.deliveryMethod" type="radio" name="deliveryMethod" :value="method" />{{ method }}</label></div>
          <div class="form-line option-line"><span>结算方式<span class="required">*</span></span><label v-for="method in settlementMethods" :key="method" class="radio-item"><input v-model="deliveryForm.settlementMethod" type="radio" name="settlementMethod" :value="method" />{{ method }}</label></div>
          <div class="form-line location-line"><span>始发地</span><select v-model="deliveryForm.originCountry" class="sheet-input"><option>中国</option></select><select v-model="deliveryForm.originProvince" class="sheet-input"><option>广东省</option></select><select v-model="deliveryForm.originCity" class="sheet-input"><option>深圳市</option></select><input v-model="deliveryForm.originAddress" class="sheet-input street-input" type="text" placeholder="请输入街道、园区、楼栋等详细地址" /></div>
          <div class="form-line location-line"><span>目的地</span><select class="sheet-input"><option>中国</option></select><select v-model="deliveryForm.destinationProvince" class="sheet-input"><option value="">请选择省份</option><option>上海市</option><option>广东省</option></select><select v-model="deliveryForm.destinationCity" class="sheet-input"><option value="">请选择城市</option><option>上海市</option><option>广州市</option><option>惠州市</option></select></div>
          <label class="form-line textarea-line"><span>详细地址<span class="required">*</span></span><textarea v-model="deliveryForm.address" class="sheet-input"></textarea></label>
          <label class="form-line textarea-line"><span>交付说明</span><textarea v-model="deliveryForm.deliveryNote" class="sheet-input"></textarea></label>
        </div>
        <div class="basic-right">
          <label class="form-line"><span>送货单号</span><input class="sheet-input readonly-field" type="text" :value="deliveryForm.deliveryNo || '待生成'" readonly aria-readonly="true" tabindex="-1" /></label>
          <label class="form-line"><span>合同号</span><input v-model="deliveryForm.contractNo" class="sheet-input" type="text" /></label>
          <label class="form-line"><span>销售订单号</span><input v-model="deliveryForm.salesOrderNo" class="sheet-input" type="text" /></label>
          <label class="form-line"><span>指定收货人<span class="required">*</span></span><input v-model="deliveryForm.receiver" class="sheet-input" type="text" /></label>
          <label class="form-line"><span>收货人电话<span class="required">*</span></span><input v-model="deliveryForm.receiverPhone" class="sheet-input" type="tel" /></label>
          <div class="form-line read-line"><span>打印时间</span><span class="plain-value"></span></div>
        </div>
      </section>
      <section class="material-import">
        <div class="import-toolbar"><strong>模板导入物料清单</strong><input class="file-picker" type="file" /><span>请点击 <a href="#">这里</a> 下载模板，并按模板维护数据后上传</span></div>
        <div class="sheet-table-wrap"><table class="sheet-table"><thead><tr><th>操作</th><th>物料编号</th><th>物料描述</th><th>单位</th><th>实发数</th><th>件数</th><th>运价</th><th>运价合计</th><th>运价备注</th></tr></thead><tbody><tr v-for="(item, index) in materialRows" :key="index"><td><button class="table-icon" type="button" title="新增">+</button></td><td><input v-model="item.code" class="cell-input" type="text" /></td><td><input v-model="item.description" class="cell-input" type="text" /></td><td><input v-model="item.unit" class="cell-input" type="text" /></td><td><input v-model="item.actualQty" class="cell-input" type="number" /></td><td><input v-model="item.pieces" class="cell-input" type="number" /></td><td><input v-model="item.price" class="cell-input" type="number" /></td><td><input v-model="item.total" class="cell-input" type="number" /></td><td><input v-model="item.remark" class="cell-input" type="text" /></td></tr><tr class="total-row"><td></td><td></td><td></td><td>合计</td><td></td><td></td><td></td><td></td><td></td></tr></tbody></table></div>
      </section>
      <section class="expense-strip">
        <label v-for="field in expenseCells" :key="field.key" class="expense-cell"><span>{{ field.label }}</span><input v-if="field.type === 'amount'" class="sheet-input amount-input" type="text" inputmode="decimal" :value="expenseForm[field.key]" @input="updateExpenseAmount(field.key, $event)" /><input v-else-if="field.type === 'readonly'" class="sheet-input readonly-field amount-input" type="text" :value="getReadonlyExpenseValue(field.key)" readonly aria-readonly="true" tabindex="-1" /><input v-else v-model="expenseForm[field.key]" class="sheet-input" type="text" /></label>
      </section>
      <section class="sign-grid">
        <div class="sign-title carrier-title">承运方签收</div>
        <div class="carrier-fields">
          <label><span>公司名称</span><select v-model="selectedCarrierId" class="sheet-input" @change="handleCarrierChange"><option value="">请选择承运公司</option><option v-for="carrier in enabledCarrierOptions" :key="carrier.id" :value="carrier.id">{{ carrier.carrier }}</option></select></label>
          <label><span>提货人</span><select v-model="selectedPickupPersonId" class="sheet-input" :disabled="!selectedCarrierId || !enabledPickupPersonOptions.length"><option value="">{{ selectedCarrierId && !enabledPickupPersonOptions.length ? '该公司暂无正常提货人' : '请选择提货人' }}</option><option v-for="person in enabledPickupPersonOptions" :key="person.id" :value="person.id">{{ person.name }}</option></select></label>
          <label><span>证件号码</span><input class="sheet-input readonly-field" type="text" :value="selectedPickupIdCard" placeholder="自动带出证件号码" readonly aria-readonly="true" tabindex="-1" /></label>
          <label><span>提货人电话</span><input class="sheet-input readonly-field" type="tel" :value="selectedPickupPhone" placeholder="自动带出电话" readonly aria-readonly="true" tabindex="-1" /></label>
          <label><span>车牌号</span><input v-model="deliveryForm.vehicleNo" class="sheet-input" type="text" /></label>
        </div>
        <div class="sign-title sender-title">发货方信息</div>
        <div class="sender-fields"><label class="sender-picker-field"><span>发货人 电话</span><div class="sender-picker"><select v-model="selectedSenderId" class="sheet-input"><option value="">请选择发货人</option><option v-for="sender in enabledSenderOptions" :key="sender.id" :value="sender.id">{{ sender.sender }}</option></select><input class="sheet-input readonly-field" type="tel" :value="selectedSenderPhone" placeholder="自动带出电话" readonly aria-readonly="true" tabindex="-1" /></div></label><label><span>实际发货日</span><input v-model="deliveryForm.actualDeliveryDate" class="sheet-input" type="date" /></label><label><span>要求到店日</span><input v-model="deliveryForm.requiredArrivalDate" class="sheet-input" type="date" /></label><label><span>接货人 电话<span class="required">*</span></span><input v-model="deliveryForm.handoverContact" class="sheet-input" type="text" /></label><label><span>签收日期</span><input v-model="deliveryForm.signDate" class="sheet-input" type="date" /></label></div>
        <div class="sign-title receiver-title">收货方签收</div>
        <label class="receiver-name"><span>收货人姓名(盖章)</span><input v-model="deliveryForm.receiverSignName" class="sheet-input" type="text" /></label>
        <label class="receiver-date"><span>签收日期</span><input v-model="deliveryForm.receiverSignDate" class="sheet-input" type="date" /></label>
        <div class="id-note">身份证号码可写前6位或者后6位</div><div class="exception-note">收货后异常备注</div><div class="sign-note">签收说明：请参考背面签收说明</div>
      </section>
    </section>
    <div v-if="showOrgDialog" class="modal-backdrop" role="presentation" @click.self="closeOrgDialog"><section class="org-dialog" role="dialog" aria-modal="true" aria-labelledby="orgDialogTitle"><header class="org-dialog-head"><strong id="orgDialogTitle">选择成本中心</strong><button class="dialog-close" type="button" aria-label="关闭" @click="closeOrgDialog">×</button></header><div class="org-tree"><ul><li v-for="company in organizationTree" :key="company.code"><button class="org-node root-node" type="button" @click="selectCostCenter(company)"><span>{{ company.name }}</span><em>{{ company.code }}</em></button><ul><li v-for="center in company.children" :key="center.code"><button class="org-node" type="button" @click="selectCostCenter(center)"><span>{{ center.name }}</span><em>{{ center.code }}</em></button><ul><li v-for="dept in center.children" :key="dept.code"><button class="org-node leaf-node" type="button" @click="selectCostCenter(dept)"><span>{{ dept.name }}</span><em>{{ dept.code }}</em></button></li></ul></li></ul></li></ul></div><footer class="org-dialog-foot"><button class="btn" type="button" @click="closeOrgDialog">取消</button></footer></section></div>
  </section>
</template>
