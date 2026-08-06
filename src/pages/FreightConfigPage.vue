<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import {
  carrierConfigs,
  freightConfigs,
  packageBoxConfigs,
  senderConfigs,
  shipmentTasks
} from '../data/logistics'
import { idbGet, idbSet } from '../storage/indexedDb'

const TAB_FREIGHT = '运费'
const TAB_BOX = '配件箱'
const TAB_CARRIER = '承运公司'
const TAB_SENDER = '发货人'
const TAB_STAGE_OWNER = '阶段负责人'
const ALL = '全部'
const NORMAL = '正常'
const DISABLED = '停用'
const SYSTEM_UPDATER = '张三'
const MOCK_NOW = '2026-05-20 12:00:00'
const FREIGHT_CONFIG_STORAGE_KEY = 'freight-config:v1'

const tabs = [TAB_FREIGHT, TAB_BOX, TAB_CARRIER, TAB_SENDER, TAB_STAGE_OWNER]
const notifyChannelOptions = ['企微', 'OA待办', '天阔待办', '邮件']
const defaultStageOwners = {
  完善: { owner: '陈丽', employeeNo: 'JS1001', department: '物流运营部' },
  打印: { owner: '赵刚', employeeNo: 'JS1002', department: '仓储作业部' },
  拣配: { owner: '李明', employeeNo: 'JS1003', department: '仓储作业部' },
  抽检: { owner: '王芳', employeeNo: 'JS1004', department: '质量管理部' },
  封箱: { owner: '李明', employeeNo: 'JS1003', department: '仓储作业部' },
  DNA: { owner: '刘洋', employeeNo: 'JS1005', department: '技术支持部' },
  交接装车: { owner: '周强', employeeNo: 'JS1006', department: '物流运营部' },
  发厂: { owner: '周强', employeeNo: 'JS1006', department: '物流运营部' },
  预约送货: { owner: '何敏', employeeNo: 'JS1007', department: '物流运营部' },
  用户签收: { owner: '何敏', employeeNo: 'JS1007', department: '物流运营部' },
  仓管确认费用: { owner: '李敏', employeeNo: 'JS1008', department: '仓管财务组' },
  物流确认费用: { owner: '黄磊', employeeNo: 'JS1009', department: '物流结算组' },
  生成账单: { owner: '周会计', employeeNo: 'JS1010', department: '财务共享中心' },
  物流开票: { owner: '黄磊', employeeNo: 'JS1009', department: '物流结算组' }
}
const stageOwnerDefaults = [...new Set(shipmentTasks.map((task) => task.currentNode).filter((node) => node && node !== '作废'))].map((stage, index) => ({
  id: 'stage-owner-' + (index + 1),
  stage,
  owner: defaultStageOwners[stage]?.owner || '',
  employeeNo: defaultStageOwners[stage]?.employeeNo || '',
  department: defaultStageOwners[stage]?.department || '',
  channels: [...notifyChannelOptions],
  status: NORMAL,
  remark: '送货单流转到' + stage + '阶段时发送待办提醒',
  updateTime: MOCK_NOW,
  updater: SYSTEM_UPDATER
}))

function getStageDisplayName(stage) {
  return stage === 'DNA' ? '录入DNA' : stage
}
const statusOptions = [ALL, NORMAL, DISABLED]
const editableStatusOptions = [NORMAL, DISABLED]
const baseFilter = {
  keyword: '',
  type: ALL,
  status: ALL,
  fromProvince: ALL,
  fromCity: ALL,
  toProvince: ALL,
  toCity: ALL
}

const activeTab = ref(TAB_FREIGHT)
const filters = reactive({ ...baseFilter })
const appliedFilters = ref({ ...baseFilter })
const freightRows = ref(freightConfigs.map((item) => ({ ...item })))
const boxRows = ref(packageBoxConfigs.map((item) => ({ ...item })))
const carrierRows = ref(carrierConfigs.map((item) => ({ ...item })))
const senderRows = ref(senderConfigs.map((item) => ({ ...item })))
const stageOwnerRows = ref(stageOwnerDefaults.map((item) => ({ ...item, channels: [...item.channels] })))
const editRowId = ref('')
const editMode = ref('edit')
const editForm = reactive({})
const formError = ref('')
const storageError = ref('')
const pickupDialogCarrierId = ref('')
const pendingDeleteRow = ref(null)
const ownerSelectorOpen = ref(false)
const selectedOwnerIds = ref([])
let storageReady = false
let saveTimer = 0

const activeSourceRows = computed(() => {
  if (activeTab.value === TAB_BOX) return boxRows.value
  if (activeTab.value === TAB_CARRIER) return carrierRows.value
  if (activeTab.value === TAB_SENDER) return senderRows.value
  if (activeTab.value === TAB_STAGE_OWNER) return stageOwnerRows.value
  return freightRows.value
})

const keywordLabel = computed(() => {
  if (activeTab.value === TAB_BOX) return '配件箱型号、描述'
  if (activeTab.value === TAB_SENDER) return '发货人'
  if (activeTab.value === TAB_STAGE_OWNER) return '阶段、责任人、部门'
  return '承运公司'
})

const keywordPlaceholder = computed(() => {
  if (activeTab.value === TAB_BOX) return '请输入配件箱型号或描述'
  if (activeTab.value === TAB_SENDER) return '发货人 / 工号 / 电话'
  if (activeTab.value === TAB_STAGE_OWNER) return '阶段 / 责任人 / 部门'
  return '承运公司'
})

const showTypeFilter = computed(() => activeTab.value === TAB_FREIGHT || activeTab.value === TAB_CARRIER)
const showRouteFilter = computed(() => activeTab.value === TAB_FREIGHT)
const showImportButtons = computed(() => activeTab.value === TAB_FREIGHT || activeTab.value === TAB_BOX)
const showCreateButton = computed(() => [TAB_FREIGHT, TAB_BOX, TAB_CARRIER, TAB_SENDER].includes(activeTab.value))

const typeOptions = computed(() => {
  const names = activeSourceRows.value.map((item) => item.type).filter(Boolean)
  return [ALL, ...new Set(names)]
})

const provinceOptions = computed(() => {
  const names = [...freightRows.value, ...boxRows.value].flatMap((item) => [item.fromProvince, item.toProvince])
  return [ALL, ...new Set(names.filter(Boolean))]
})

const editProvinceOptions = computed(() => provinceOptions.value.filter((item) => item !== ALL))
const editFromCityOptions = computed(() => getEditCities(editForm.fromProvince, 'from'))
const editToCityOptions = computed(() => getEditCities(editForm.toProvince, 'to'))

const filteredRows = computed(() => {
  const rules = appliedFilters.value

  return activeSourceRows.value.filter((item) => {
    const keyword = rules.keyword.trim()
    const keywordMatched = !keyword || getKeywordText(item).includes(keyword)
    const typeMatched = !item.type || rules.type === ALL || item.type === rules.type
    const statusMatched = rules.status === ALL || item.status === rules.status
    const fromProvinceMatched = !showRouteFilter.value || rules.fromProvince === ALL || item.fromProvince === rules.fromProvince
    const fromCityMatched = !showRouteFilter.value || rules.fromCity === ALL || item.fromCity === rules.fromCity
    const toProvinceMatched = !showRouteFilter.value || rules.toProvince === ALL || item.toProvince === rules.toProvince
    const toCityMatched = !showRouteFilter.value || rules.toCity === ALL || item.toCity === rules.toCity

    return (
      keywordMatched &&
      typeMatched &&
      statusMatched &&
      fromProvinceMatched &&
      fromCityMatched &&
      toProvinceMatched &&
      toCityMatched
    )
  })
})

const sortedRows = computed(() =>
  [...filteredRows.value].sort((left, right) => right.updateTime.localeCompare(left.updateTime))
)

const dialogTitle = computed(() => `${editMode.value === 'create' ? '新增' : '编辑'}${activeTab.value}`)
const calculatedBoxVolume = computed(() => {
  return formatBoxVolume(calculateBoxVolume(editForm.length, editForm.width, editForm.height))
})
const pickupDialogCarrier = computed(() =>
  carrierRows.value.find((item) => item.id === pickupDialogCarrierId.value)
)
const pickupRows = computed(() => pickupDialogCarrier.value?.pickupPeople || [])
const stageOwnerPersonOptions = computed(() => {
  const peopleByEmployeeNo = new Map()
  Object.values(defaultStageOwners).forEach((person) => {
    if (!person.employeeNo || peopleByEmployeeNo.has(person.employeeNo)) return
    peopleByEmployeeNo.set(person.employeeNo, {
      id: person.employeeNo,
      name: person.owner,
      employeeNo: person.employeeNo,
      department: person.department
    })
  })
  return [...peopleByEmployeeNo.values()]
})

function cloneRows(rows) {
  return rows.map((item) => ({
    ...item,
    channels: Array.isArray(item.channels) ? [...item.channels] : item.channels,
    pickupPeople: Array.isArray(item.pickupPeople)
      ? item.pickupPeople.map((person) => ({ ...person }))
      : item.pickupPeople
  }))
}

function mergeStoredRow(item, fallback) {
  const merged = { ...(fallback || {}), ...item }

  if (fallback?.phone && typeof merged.phone === 'string' && merged.phone.includes('*')) {
    merged.phone = fallback.phone
  }

  if (Array.isArray(fallback?.pickupPeople) || Array.isArray(item?.pickupPeople)) {
    const fallbackPeople = Array.isArray(fallback?.pickupPeople) ? fallback.pickupPeople : []
    const savedPeople = Array.isArray(item?.pickupPeople) ? item.pickupPeople : []
    const fallbackById = new Map(fallbackPeople.map((person) => [person.id, person]))
    const mergedPeople = savedPeople.map((person) => ({
      ...(fallbackById.get(person.id) || {}),
      ...person
    }))
    const mergedIds = new Set(mergedPeople.map((person) => person.id))
    const missingFallbackPeople = fallbackPeople.filter((person) => !mergedIds.has(person.id))
    merged.pickupPeople = [...mergedPeople, ...missingFallbackPeople.map((person) => ({ ...person }))]
  }

  return merged
}

function restoreRows(savedRows, fallbackRows) {
  if (!Array.isArray(savedRows)) return cloneRows(fallbackRows)

  const fallbackById = new Map(fallbackRows.map((item) => [item.id, item]))
  const restoredRows = savedRows.map((item) => mergeStoredRow(item, fallbackById.get(item.id)))
  const restoredIds = new Set(restoredRows.map((item) => item.id))
  const newFallbackRows = fallbackRows.filter((item) => !restoredIds.has(item.id))

  return [...restoredRows, ...cloneRows(newFallbackRows)]
}

function getStorageSnapshot() {
  return {
    freightRows: cloneRows(freightRows.value),
    boxRows: cloneRows(boxRows.value),
    carrierRows: cloneRows(carrierRows.value),
    senderRows: cloneRows(senderRows.value),
    stageOwnerRows: cloneRows(stageOwnerRows.value)
  }
}

async function loadStoredRows() {
  try {
    const saved = await idbGet(FREIGHT_CONFIG_STORAGE_KEY)

    if (saved && typeof saved === 'object') {
      freightRows.value = restoreRows(saved.freightRows, freightConfigs)
      boxRows.value = restoreRows(saved.boxRows, packageBoxConfigs)
      carrierRows.value = restoreRows(saved.carrierRows, carrierConfigs)
      senderRows.value = restoreRows(saved.senderRows, senderConfigs)
      stageOwnerRows.value = restoreRows(saved.stageOwnerRows, stageOwnerDefaults)
    }
    storageError.value = ''
  } catch (error) {
    storageError.value = '本地保存不可用，当前修改仅保存在页面内存。'
  } finally {
    storageReady = true
  }
}

async function persistRows() {
  try {
    await idbSet(FREIGHT_CONFIG_STORAGE_KEY, getStorageSnapshot())
    storageError.value = ''
  } catch (error) {
    storageError.value = '本地保存失败，当前修改仅保存在页面内存。'
  }
}

function schedulePersistRows() {
  if (!storageReady) return

  window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => {
    void persistRows()
  }, 250)
}

function applyTableCellTitles() {
  document.querySelectorAll('.freight-config-page .delivery-table th, .freight-config-page .delivery-table td').forEach((cell) => {
    const text = cell.textContent?.replace(/\s+/g, ' ').trim() || ''
    if (!text || cell.classList.contains('empty-cell')) return
    cell.setAttribute('title', text)
  })
}

function getKeywordText(item) {
  if (activeTab.value === TAB_BOX) return `${item.model} ${item.description}`
  if (activeTab.value === TAB_SENDER) return `${item.sender} ${item.employeeNo} ${item.phone || ''} ${item.remark || ''}`
  if (activeTab.value === TAB_STAGE_OWNER) return `${item.stage} ${getStageDisplayName(item.stage)} ${item.owner} ${item.employeeNo || ''} ${item.department || ''} ${item.remark || ''}`
  return item.carrier
}

function getCities(province, direction) {
  if (province === ALL) return [ALL]

  const field = direction === 'from' ? 'fromCity' : 'toCity'
  const provinceField = direction === 'from' ? 'fromProvince' : 'toProvince'
  const names = activeSourceRows.value
    .filter((item) => item[provinceField] === province)
    .map((item) => item[field])
    .filter(Boolean)

  return [ALL, ...new Set(names)]
}

function getEditCities(province, direction) {
  if (!province) return []

  const cityOptions = getCities(province, direction).filter((item) => item !== ALL)
  const currentCity = direction === 'from' ? editForm.fromCity : editForm.toCity
  return currentCity && !cityOptions.includes(currentCity) ? [currentCity, ...cityOptions] : cityOptions
}

function switchTab(tab) {
  activeTab.value = tab
  resetFilters()
  closeEdit()
  closePickupManager()
  closeDeleteConfirm()
}

function applyFilters() {
  appliedFilters.value = { ...filters }
}

function resetFilters() {
  Object.assign(filters, baseFilter)
  applyFilters()
}

function handleProvinceChange(direction) {
  if (direction === 'from') {
    filters.fromCity = ALL
    return
  }

  filters.toCity = ALL
}

function handleEditProvinceChange(direction) {
  if (direction === 'from') {
    editForm.fromCity = editFromCityOptions.value[0] || ''
    return
  }

  editForm.toCity = editToCityOptions.value[0] || ''
}

function getRowsRef() {
  if (activeTab.value === TAB_BOX) return boxRows
  if (activeTab.value === TAB_CARRIER) return carrierRows
  if (activeTab.value === TAB_SENDER) return senderRows
  if (activeTab.value === TAB_STAGE_OWNER) return stageOwnerRows
  return freightRows
}

function getDefaultForm() {
  if (activeTab.value === TAB_BOX) {
    return {
      model: '',
      description: '',
      status: NORMAL,
      length: 0,
      width: 0,
      height: 0,
      volume: 0,
      fromProvince: '广东省',
      fromCity: '深圳市',
      toProvince: '广东省',
      toCity: '惠州市'
    }
  }

  if (activeTab.value === TAB_CARRIER) {
    return {
      carrier: '',
      type: '物流',
      weightRatio: 6000,
      freightAuthorizationLetter: '',
      status: NORMAL
    }
  }

  if (activeTab.value === TAB_SENDER) {
    return {
      sender: '',
      employeeNo: '',
      phone: '',
      remark: '',
      status: NORMAL
    }
  }

  if (activeTab.value === TAB_STAGE_OWNER) {
    return {
      stage: '',
      owner: '',
      employeeNo: '',
      department: '',
      channels: [...notifyChannelOptions],
      remark: '',
      status: NORMAL
    }
  }

  return {
    carrier: '',
    type: '物流',
    status: NORMAL,
    fromProvince: '广东省',
    fromCity: '深圳市',
    toProvince: '广东省',
    toCity: '湛江市',
    volumeFee: 0,
    weightFee: 0,
    leadDays: 1
  }
}

function openEdit(item) {
  editMode.value = 'edit'
  editRowId.value = item.id
  Object.assign(editForm, getDefaultForm(), {
    ...item,
    channels: Array.isArray(item.channels) ? [...item.channels] : item.channels
  })
  formError.value = ''
}

function openCreate() {
  editMode.value = 'create'
  editRowId.value = ''
  Object.assign(editForm, getDefaultForm())
  if (activeTab.value === TAB_FREIGHT) {
    handleEditProvinceChange('from')
    handleEditProvinceChange('to')
  }
  formError.value = ''
}

function closeEdit() {
  editRowId.value = ''
  editMode.value = 'edit'
  formError.value = ''
  closeOwnerSelector()
}

function openOwnerSelector() {
  const selectedIds = String(editForm.employeeNo || '')
    .split('、')
    .map((item) => item.trim())
    .filter(Boolean)
  selectedOwnerIds.value = selectedIds
  ownerSelectorOpen.value = true
}

function closeOwnerSelector() {
  ownerSelectorOpen.value = false
  selectedOwnerIds.value = []
}

function toggleSelectedOwner(employeeNo) {
  if (selectedOwnerIds.value.includes(employeeNo)) {
    selectedOwnerIds.value = selectedOwnerIds.value.filter((item) => item !== employeeNo)
    return
  }

  selectedOwnerIds.value = [...selectedOwnerIds.value, employeeNo]
}

function confirmOwnerSelection() {
  const selectedPeople = stageOwnerPersonOptions.value.filter((person) => selectedOwnerIds.value.includes(person.employeeNo))
  if (!selectedPeople.length) {
    formError.value = '至少选择一个责任人'
    return
  }

  editForm.owner = selectedPeople.map((person) => person.name).join('、')
  editForm.employeeNo = selectedPeople.map((person) => person.employeeNo).join('、')
  editForm.department = [...new Set(selectedPeople.map((person) => person.department).filter(Boolean))].join('、')
  formError.value = ''
  closeOwnerSelector()
}

function openDeleteConfirm(item) {
  pendingDeleteRow.value = item
}

function closeDeleteConfirm() {
  pendingDeleteRow.value = null
}

function confirmDeleteRow() {
  if (!pendingDeleteRow.value) return
  const rowsRef = getRowsRef()
  rowsRef.value = rowsRef.value.filter((item) => item.id !== pendingDeleteRow.value.id)
  applyFilters()
  closeDeleteConfirm()
}

function changeRowStatus(item, status) {
  if (!editableStatusOptions.includes(status) || item.status === status) return

  item.status = status
  item.updateTime = MOCK_NOW
  item.updater = SYSTEM_UPDATER
}

function toggleRowStatus(item) {
  changeRowStatus(item, item.status === NORMAL ? DISABLED : NORMAL)
}

function openPickupManager(item) {
  pickupDialogCarrierId.value = item.id
}

function closePickupManager() {
  pickupDialogCarrierId.value = ''
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function getAddPickupPersonFlowHtml(carrierName) {
  const safeCarrierName = escapeHtml(carrierName || '未选择承运公司')

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>添加提货人流程</title>
  <style>
    :root {
      --bg: #f4f6f8;
      --panel: #fff;
      --line: #d9e0e7;
      --text: #1f2933;
      --muted: #637083;
      --blue: #2563eb;
      --blue-soft: #e8f0ff;
      --green: #0f8f62;
      --green-soft: #e8f7ef;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: "Microsoft YaHei", "PingFang SC", Arial, sans-serif;
      letter-spacing: 0;
    }
    .page {
      max-width: 1180px;
      margin: 0 auto;
      padding: 24px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-start;
      margin-bottom: 16px;
    }
    h1 {
      margin: 0;
      font-size: 24px;
      line-height: 1.3;
    }
    .subline {
      margin-top: 8px;
      color: var(--muted);
      font-size: 13px;
    }
    .tag {
      display: inline-flex;
      align-items: center;
      min-height: 28px;
      padding: 0 10px;
      border-radius: 999px;
      background: var(--blue-soft);
      color: var(--blue);
      font-size: 13px;
      font-weight: 700;
      white-space: nowrap;
    }
    .panel {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      overflow: hidden;
    }
    .steps {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
      margin-bottom: 16px;
    }
    .step {
      min-height: 92px;
      padding: 14px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
    }
    .step strong {
      display: block;
      margin-bottom: 8px;
      color: var(--blue);
      font-size: 15px;
    }
    .step span {
      color: var(--muted);
      font-size: 13px;
      line-height: 1.6;
    }
    .form-head {
      padding: 14px 16px;
      border-bottom: 1px solid var(--line);
      font-weight: 700;
    }
    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
      padding: 16px;
    }
    label {
      display: grid;
      gap: 6px;
      color: var(--muted);
      font-size: 13px;
    }
    input, textarea, select {
      width: 100%;
      min-width: 0;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #fff;
      color: var(--text);
      font: inherit;
      font-size: 14px;
    }
    input, select {
      height: 38px;
      padding: 0 10px;
    }
    textarea {
      min-height: 86px;
      padding: 9px 10px;
      resize: vertical;
    }
    .readonly {
      background: #f3f6f8;
      color: var(--muted);
    }
    .wide {
      grid-column: 1 / -1;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 14px 16px;
      border-top: 1px solid var(--line);
      background: #f8fafc;
    }
    .btn {
      min-height: 34px;
      padding: 0 14px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #fff;
      color: var(--text);
      font-size: 13px;
      cursor: pointer;
    }
    .btn.primary {
      border-color: var(--blue);
      background: var(--blue);
      color: #fff;
    }
    .notice {
      margin-top: 16px;
      padding: 12px 14px;
      border-radius: 8px;
      background: var(--green-soft);
      color: var(--green);
      font-size: 13px;
      font-weight: 700;
    }
    @media (max-width: 760px) {
      .steps,
      .form-grid {
        grid-template-columns: 1fr;
      }
      .header {
        flex-direction: column;
      }
    }
  </style>
</head>
<body>
  <main class="page">
    <div class="header">
      <div>
        <h1>添加提货人流程</h1>
        <div class="subline">承运公司：${safeCarrierName} | 流程编号提交后由系统生成</div>
      </div>
      <span class="tag">申请流程</span>
    </div>

    <section class="steps">
      <div class="step"><strong>1. 发起申请</strong><span>填写提货人姓名、手机号、身份证号，并上传授权材料。</span></div>
      <div class="step"><strong>2. 信息校验</strong><span>校验手机号、身份证号格式，并检查同一承运公司下是否重复。</span></div>
      <div class="step"><strong>3. 业务审批</strong><span>物流管理员审核提货人身份和授权材料，审批通过后生效。</span></div>
      <div class="step"><strong>4. 可用生效</strong><span>状态为正常后，发货完善页可选择该提货人并自动带出联系方式。</span></div>
    </section>

    <section class="panel">
      <div class="form-head">提货人申请单</div>
      <div class="form-grid">
        <label>承运公司<input class="readonly" value="${safeCarrierName}" readonly /></label>
        <label>申请类型<select><option>新增提货人</option></select></label>
        <label>提货人名称<input placeholder="请输入提货人姓名" /></label>
        <label>手机号<input placeholder="请输入 11 位手机号" /></label>
        <label>身份证号<input placeholder="请输入身份证号" /></label>
        <label>授权附件<input type="file" /></label>
        <label class="wide">申请说明<textarea placeholder="填写新增原因、适用仓库或特殊限制"></textarea></label>
      </div>
      <div class="actions">
        <button class="btn" type="button">保存草稿</button>
        <button class="btn primary" type="button">提交申请</button>
      </div>
    </section>

    <div class="notice">提交后生成申请流程号，审批通过后回写到承运公司提货人列表。</div>
  </main>
</body>
</html>`
}

function openAddPickupPersonFlow() {
  const html = getAddPickupPersonFlowHtml(pickupDialogCarrier.value?.carrier)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = window.URL.createObjectURL(blob)
  window.open(url, '_blank', 'noopener,noreferrer')
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000)
}

function togglePickupPersonStatus(person) {
  const carrier = pickupDialogCarrier.value
  if (!carrier || !person) return

  person.status = person.status === NORMAL ? DISABLED : NORMAL
  carrier.updateTime = MOCK_NOW
  carrier.updater = SYSTEM_UPDATER
}

function openApplicationFlow(applicationFlow) {
  const target = applicationFlow.trim()
  if (!target) return

  if (/^https?:\/\//i.test(target)) {
    window.open(target, '_blank', 'noopener,noreferrer')
    return
  }

  window.location.hash = `application-flow-${encodeURIComponent(target)}`
}

function handleCarrierAttachmentChange(event) {
  const file = event.target.files?.[0]
  editForm.freightAuthorizationLetter = file?.name || ''
}

function calculateBoxVolume(length, width, height) {
  const dimensions = [Number(length), Number(width), Number(height)]

  if (dimensions.some((value) => !Number.isFinite(value) || value < 0)) {
    return Number.NaN
  }

  return dimensions.reduce((total, value) => total * value, 1) / 1000000000
}

function formatBoxVolume(value) {
  if (!Number.isFinite(value)) return ''

  return value.toFixed(2)
}

function getEditPayload() {
  if (activeTab.value === TAB_BOX) {
    const length = Number(editForm.length)
    const width = Number(editForm.width)
    const height = Number(editForm.height)
    const volume = calculateBoxVolume(length, width, height)

    if (!editForm.model?.trim()) return { error: '配件箱型号不能为空' }
    if ([length, width, height].some((value) => !Number.isFinite(value) || value < 0)) {
      return { error: '尺寸必须是大于 0 的数字' }
    }

    return {
      model: editForm.model.trim(),
      description: editForm.description?.trim() || '',
      status: editForm.status,
      length,
      width,
      height,
      volume: Number(formatBoxVolume(volume)),
      fromProvince: editForm.fromProvince,
      fromCity: editForm.fromCity,
      toProvince: editForm.toProvince,
      toCity: editForm.toCity
    }
  }

  if (activeTab.value === TAB_CARRIER) {
    const weightRatio = Number(editForm.weightRatio)
    if (!editForm.carrier?.trim()) return { error: '承运公司不能为空' }
    if (Number.isNaN(weightRatio) || weightRatio <= 0) return { error: '重量比必须是大于 0 的数字' }

    return {
      carrier: editForm.carrier.trim(),
      type: editForm.type,
      weightRatio,
      freightAuthorizationLetter: editForm.freightAuthorizationLetter?.trim() || '',
      status: editForm.status
    }
  }

  if (activeTab.value === TAB_SENDER) {
    const phone = editForm.phone?.trim() || ''

    if (!editForm.sender?.trim()) return { error: '发货人不能为空' }
    if (!editForm.employeeNo?.trim()) return { error: '工号不能为空' }
    if (!phone) return { error: '电话不能为空' }
    if (phone.includes('*')) return { error: '电话不需要加星号' }

    return {
      sender: editForm.sender.trim(),
      employeeNo: editForm.employeeNo.trim(),
      phone,
      remark: editForm.remark?.trim() || '',
      status: editForm.status
    }
  }

  if (activeTab.value === TAB_STAGE_OWNER) {
    const channels = Array.isArray(editForm.channels) ? editForm.channels.filter(Boolean) : []

    if (!editForm.owner?.trim()) return { error: '责任人不能为空' }
    if (!editForm.employeeNo?.trim()) return { error: '工号不能为空' }
    if (!channels.length) return { error: '至少选择一个提醒渠道' }

    return {
      stage: editForm.stage,
      owner: editForm.owner.trim(),
      employeeNo: editForm.employeeNo.trim(),
      department: editForm.department?.trim() || '',
      channels,
      remark: editForm.remark?.trim() || '',
      status: editForm.status
    }
  }

  const volumeFee = Number(editForm.volumeFee)
  const weightFee = Number(editForm.weightFee)
  const leadDays = Number(editForm.leadDays)

  if (!editForm.carrier?.trim()) return { error: '承运公司不能为空' }
  if (!editForm.fromProvince || !editForm.fromCity || !editForm.toProvince || !editForm.toCity) return { error: '省份和城市不能为空' }
  if ([volumeFee, weightFee, leadDays].some((value) => Number.isNaN(value))) {
    return { error: '运费和时效必须是数字' }
  }
  if (volumeFee < 0 || weightFee < 0 || leadDays < 1) {
    return { error: '运费不能小于 0，时效不能小于 1 天' }
  }

  return {
    carrier: editForm.carrier.trim(),
    type: editForm.type,
    status: editForm.status,
    fromProvince: editForm.fromProvince,
    fromCity: editForm.fromCity,
    toProvince: editForm.toProvince,
    toCity: editForm.toCity,
    volumeFee,
    weightFee,
    leadDays
  }
}

function saveEdit() {
  const payload = getEditPayload()
  if (payload.error) {
    formError.value = payload.error
    return
  }

  const rowsRef = getRowsRef()
  const updatedRow = {
    ...payload,
    updateTime: MOCK_NOW,
    updater: SYSTEM_UPDATER
  }

  if (editMode.value === 'create') {
    const createdRow = {
      id: `${activeTab.value}-${Date.now()}`,
      ...updatedRow
    }
    rowsRef.value.push(createdRow)
  } else {
    const index = rowsRef.value.findIndex((item) => item.id === editRowId.value)
    if (index === -1) {
      formError.value = `未找到当前${activeTab.value}配置`
      return
    }

    rowsRef.value[index] = {
      ...rowsRef.value[index],
      ...updatedRow
    }
  }

  applyFilters()
  closeEdit()
}

onMounted(() => {
  void loadStoredRows()
  nextTick(applyTableCellTitles)
})

watch([freightRows, boxRows, carrierRows, senderRows, stageOwnerRows], schedulePersistRows, { deep: true })
watch([activeTab, sortedRows], () => nextTick(applyTableCellTitles), { deep: true, flush: 'post' })
</script>

<template>
  <section class="content freight-config-page">
    <section class="panel delivery-manager freight-config-manager">
      <div class="delivery-tabs">
        <button
          v-for="tab in tabs"
          :key="tab"
          class="delivery-tab"
          :class="{ active: tab === activeTab }"
          type="button"
          @click="switchTab(tab)"
        >
          {{ tab }}
        </button>
      </div>

      <div class="delivery-filter freight-filter">
        <label class="filter-field keyword-field">
          {{ keywordLabel }}
          <input
            v-model="filters.keyword"
            type="search"
            :placeholder="keywordPlaceholder"
            @keyup.enter="applyFilters"
          />
        </label>
        <label v-if="showTypeFilter" class="filter-field compact-field">
          类型
          <select v-model="filters.type">
            <option v-for="item in typeOptions" :key="item">{{ item }}</option>
          </select>
        </label>
        <label class="filter-field compact-field">
          状态
          <select v-model="filters.status">
            <option v-for="item in statusOptions" :key="item">{{ item }}</option>
          </select>
        </label>
        <template v-if="showRouteFilter">
          <label class="filter-field compact-field">
            出发地
            <select v-model="filters.fromProvince" @change="handleProvinceChange('from')">
              <option v-for="item in provinceOptions" :key="item">{{ item }}</option>
            </select>
          </label>
          <label class="filter-field compact-field">
            城市
            <select v-model="filters.fromCity">
              <option v-for="item in getCities(filters.fromProvince, 'from')" :key="item">{{ item }}</option>
            </select>
          </label>
          <label class="filter-field compact-field">
            目的地
            <select v-model="filters.toProvince" @change="handleProvinceChange('to')">
              <option v-for="item in provinceOptions" :key="item">{{ item }}</option>
            </select>
          </label>
          <label class="filter-field compact-field">
            城市
            <select v-model="filters.toCity">
              <option v-for="item in getCities(filters.toProvince, 'to')" :key="item">{{ item }}</option>
            </select>
          </label>
        </template>

        <button class="btn primary" type="button" @click="applyFilters">查询</button>
        <button class="btn" type="button" @click="resetFilters">重置</button>
        <button class="btn" type="button">导出</button>
        <button v-if="showImportButtons" class="btn" type="button">下载导入模板</button>
        <button v-if="showImportButtons" class="btn" type="button">导入</button>
        <button v-if="showCreateButton" class="btn primary create-btn" type="button" @click="openCreate">新增</button>
        <span v-if="storageError" class="save-notice">{{ storageError }}</span>
      </div>

      <div class="table-wrap delivery-table-wrap">
        <table v-if="activeTab === TAB_FREIGHT" class="delivery-table freight-table freight-rate-table">
          <thead>
            <tr>
              <th title="承运公司">承运公司</th>
              <th title="类型">类型</th>
              <th title="状态">状态</th>
              <th title="出发省份">出发省份</th>
              <th title="出发城市">出发城市</th>
              <th title="目的省份">目的省份</th>
              <th title="目的城市">目的城市</th>
              <th title="运输费（元/m³）">运输费（元/m³）</th>
              <th title="运输费（元/kg）">运输费（元/kg）</th>
              <th title="时效（不含提货当天）">时效（不含提货当天）</th>
              <th title="最后更新时间">最后更新时间</th>
              <th title="最后更新人">最后更新人</th>
              <th title="操作">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in sortedRows" :key="item.id">
              <td :title="item.carrier">{{ item.carrier }}</td>
              <td :title="item.type">{{ item.type }}</td>
              <td>
                <button
                  class="status-switch"
                  :class="{ active: item.status === NORMAL }"
                  type="button"
                  role="switch"
                  :aria-checked="item.status === NORMAL"
                  :aria-label="`切换状态：${item.status}`"
                  :title="item.status"
                  @click="toggleRowStatus(item)"
                >
                  <span class="status-switch-track"><span class="status-switch-thumb"></span></span>
                  <span class="status-switch-text">{{ item.status }}</span>
                </button>
              </td>
              <td :title="item.fromProvince">{{ item.fromProvince }}</td>
              <td :title="item.fromCity">{{ item.fromCity }}</td>
              <td :title="item.toProvince">{{ item.toProvince }}</td>
              <td :title="item.toCity">{{ item.toCity }}</td>
              <td class="qty" :title="String(item.volumeFee)">{{ item.volumeFee }}</td>
              <td class="qty" :title="String(item.weightFee)">{{ item.weightFee }}</td>
              <td :title="`${item.leadDays}`">{{ item.leadDays }}</td>
              <td :title="item.updateTime">{{ item.updateTime }}</td>
              <td :title="item.updater">{{ item.updater }}</td>
              <td class="action-cell">
                <button class="action-link" type="button" :title="`编辑${item.carrier}`" @click="openEdit(item)">编辑</button>
                <button class="action-link danger-link" type="button" :title="`删除${item.carrier}`" @click="openDeleteConfirm(item)">删除</button>
              </td>
            </tr>
            <tr v-if="!sortedRows.length">
              <td class="empty-cell" colspan="13">暂无运费配置</td>
            </tr>
          </tbody>
        </table>

        <table v-else-if="activeTab === TAB_BOX" class="delivery-table freight-table box-config-table">
          <thead>
            <tr>
              <th>配件箱型号</th>
              <th>描述</th>
              <th>状态</th>
              <th>长（mm）</th>
              <th>宽（mm）</th>
              <th>高（mm）</th>
              <th>体积（m³）</th>
              <th>最后更新时间</th>
              <th>最后更新人</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in sortedRows" :key="item.id">
              <td>{{ item.model }}</td>
              <td>{{ item.description }}</td>
              <td>
                <button
                  class="status-switch"
                  :class="{ active: item.status === NORMAL }"
                  type="button"
                  role="switch"
                  :aria-checked="item.status === NORMAL"
                  :aria-label="`切换状态：${item.status}`"
                  @click="toggleRowStatus(item)"
                >
                  <span class="status-switch-track"><span class="status-switch-thumb"></span></span>
                  <span class="status-switch-text">{{ item.status }}</span>
                </button>
              </td>
              <td>{{ item.length }}</td>
              <td>{{ item.width }}</td>
              <td>{{ item.height }}</td>
              <td>{{ item.volume }}</td>
              <td>{{ item.updateTime }}</td>
              <td>{{ item.updater }}</td>
              <td class="action-cell">
                <button class="action-link" type="button" @click="openEdit(item)">编辑</button>
                <button class="action-link danger-link" type="button" @click="openDeleteConfirm(item)">删除</button>
              </td>
            </tr>
            <tr v-if="!sortedRows.length">
              <td class="empty-cell" colspan="10">暂无配件箱配置</td>
            </tr>
          </tbody>
        </table>

        <table v-else-if="activeTab === TAB_CARRIER" class="delivery-table freight-table carrier-config-table">
          <thead>
            <tr>
              <th>承运公司</th>
              <th>类型</th>
              <th>重量比（cm³/kg）</th>
              <th>货运委托书</th>
              <th>最后更新时间</th>
              <th>最后更新人</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in sortedRows" :key="item.id">
              <td>{{ item.carrier }}</td>
              <td>{{ item.type }}</td>
              <td>{{ item.weightRatio }}</td>
              <td>
                <span v-if="item.freightAuthorizationLetter" class="attachment-name">
                  {{ item.freightAuthorizationLetter }}
                </span>
                <span v-else class="muted-value">未上传</span>
              </td>
              <td>
                <button
                  class="status-switch"
                  :class="{ active: item.status === NORMAL }"
                  type="button"
                  role="switch"
                  :aria-checked="item.status === NORMAL"
                  :aria-label="`切换状态：${item.status}`"
                  @click="toggleRowStatus(item)"
                >
                  <span class="status-switch-track"><span class="status-switch-thumb"></span></span>
                  <span class="status-switch-text">{{ item.status }}</span>
                </button>
              </td>
              <td>{{ item.updateTime }}</td>
              <td>{{ item.updater }}</td>
              <td class="action-cell">
                <button class="action-link" type="button" @click="openEdit(item)">编辑</button>
                <button class="action-link" type="button" @click="openPickupManager(item)">提货人管理</button>
              </td>
            </tr>
            <tr v-if="!sortedRows.length">
              <td class="empty-cell" colspan="8">暂无承运公司配置</td>
            </tr>
          </tbody>
        </table>

        <table v-else-if="activeTab === TAB_SENDER" class="delivery-table freight-table sender-config-table">
          <thead>
            <tr>
              <th>发货人</th>
              <th>工号</th>
              <th>电话</th>
              <th>备注</th>
              <th>最后更新时间</th>
              <th>最后更新人</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in sortedRows" :key="item.id">
              <td>{{ item.sender }}</td>
              <td>{{ item.employeeNo }}</td>
              <td>{{ item.phone || '-' }}</td>
              <td>{{ item.remark || '-' }}</td>
              <td>
                <button
                  class="status-switch"
                  :class="{ active: item.status === NORMAL }"
                  type="button"
                  role="switch"
                  :aria-checked="item.status === NORMAL"
                  :aria-label="`切换状态：${item.status}`"
                  @click="toggleRowStatus(item)"
                >
                  <span class="status-switch-track"><span class="status-switch-thumb"></span></span>
                  <span class="status-switch-text">{{ item.status }}</span>
                </button>
              </td>
              <td>{{ item.updateTime }}</td>
              <td>{{ item.updater }}</td>
              <td class="action-cell"><button class="action-link" type="button" @click="openEdit(item)">编辑</button></td>
            </tr>
            <tr v-if="!sortedRows.length">
              <td class="empty-cell" colspan="8">暂无发货人配置</td>
            </tr>
          </tbody>
        </table>

        <table v-else class="delivery-table freight-table stage-owner-table">
          <thead>
            <tr>
              <th>阶段</th>
              <th>责任人</th>
              <th>工号</th>
              <th>部门</th>
              <th>提醒渠道</th>
              <th>最后更新时间</th>
              <th>最后更新人</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in sortedRows" :key="item.id">
              <td :title="getStageDisplayName(item.stage)" :data-full="getStageDisplayName(item.stage)">{{ getStageDisplayName(item.stage) }}</td>
              <td :title="item.owner || '-'" :data-full="item.owner || '-'">{{ item.owner || '-' }}</td>
              <td :title="item.employeeNo || '-'" :data-full="item.employeeNo || '-'">{{ item.employeeNo || '-' }}</td>
              <td :title="item.department || '-'" :data-full="item.department || '-'">{{ item.department || '-' }}</td>
              <td :title="item.channels.join('、')" :data-full="item.channels.join('、')">
                <div class="channel-tags">
                  <span v-for="channel in item.channels" :key="channel">{{ channel }}</span>
                </div>
              </td>
              <td :title="item.updateTime" :data-full="item.updateTime">{{ item.updateTime }}</td>
              <td :title="item.updater" :data-full="item.updater">{{ item.updater }}</td>
              <td class="action-cell">
                <button class="action-link" type="button" @click="openEdit(item)">编辑</button>
              </td>
            </tr>
            <tr v-if="!sortedRows.length">
              <td class="empty-cell" colspan="8">暂无阶段负责人配置</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pagination-bar">
        <span>第 1 页</span>
        <button class="pager-btn active" type="button">1</button>
        <span>共 {{ sortedRows.length }} 条记录</span>
      </div>
    </section>

    <div v-if="editRowId || editMode === 'create'" class="modal-backdrop" @click.self="closeEdit">
      <section class="org-dialog freight-dialog">
        <div class="org-dialog-head">
          <strong>{{ dialogTitle }}</strong>
          <button class="dialog-close" type="button" aria-label="关闭" @click="closeEdit">×</button>
        </div>
        <div class="freight-dialog-body">
          <template v-if="activeTab === TAB_FREIGHT">
            <label>承运公司<input v-model="editForm.carrier" class="field" /></label>
            <label>类型<select v-model="editForm.type" class="field"><option>物流</option><option>快递</option></select></label>
            <label>出发省份<select v-model="editForm.fromProvince" class="field" @change="handleEditProvinceChange('from')"><option v-for="item in editProvinceOptions" :key="item">{{ item }}</option></select></label>
            <label>出发城市<select v-model="editForm.fromCity" class="field"><option v-for="item in editFromCityOptions" :key="item">{{ item }}</option></select></label>
            <label>目的省份<select v-model="editForm.toProvince" class="field" @change="handleEditProvinceChange('to')"><option v-for="item in editProvinceOptions" :key="item">{{ item }}</option></select></label>
            <label>目的城市<select v-model="editForm.toCity" class="field"><option v-for="item in editToCityOptions" :key="item">{{ item }}</option></select></label>
            <label>状态<select v-model="editForm.status" class="field"><option>正常</option><option>停用</option></select></label>
            <label>运输费（元/m³）<input v-model="editForm.volumeFee" class="field" min="0" step="0.01" type="number" /></label>
            <label>运输费（元/kg）<input v-model="editForm.weightFee" class="field" min="0" step="0.01" type="number" /></label>
            <label>时效（天）<input v-model="editForm.leadDays" class="field" min="1" step="1" type="number" /></label>
          </template>

          <template v-else-if="activeTab === TAB_BOX">
            <label>配件箱型号<input v-model="editForm.model" class="field" /></label>
            <label>状态<select v-model="editForm.status" class="field"><option>正常</option><option>停用</option></select></label>
            <label class="wide-field">描述<input v-model="editForm.description" class="field" /></label>
            <label>长（mm）<input v-model="editForm.length" class="field" min="0" step="1" type="number" /></label>
            <label>宽（mm）<input v-model="editForm.width" class="field" min="0" step="1" type="number" /></label>
            <label>高（mm）<input v-model="editForm.height" class="field" min="0" step="1" type="number" /></label>
            <label>体积（m³）<input class="field readonly-field" type="text" :value="calculatedBoxVolume" readonly aria-readonly="true" tabindex="-1" /></label>
          </template>

          <template v-else-if="activeTab === TAB_CARRIER">
            <label>承运公司<input v-model="editForm.carrier" class="field" /></label>
            <label>类型<select v-model="editForm.type" class="field"><option>物流</option><option>快递</option></select></label>
            <label>重量比（cm³/kg）<input v-model="editForm.weightRatio" class="field" min="1" step="1" type="number" /></label>
            <label>状态<select v-model="editForm.status" class="field"><option>正常</option><option>停用</option></select></label>
            <label class="wide-field">
              货运委托书
              <input class="field" type="file" @change="handleCarrierAttachmentChange" />
              <span v-if="editForm.freightAuthorizationLetter" class="attachment-note">
                已选择：{{ editForm.freightAuthorizationLetter }}
              </span>
            </label>
          </template>

          <template v-else-if="activeTab === TAB_SENDER">
            <label>发货人<input v-model="editForm.sender" class="field" /></label>
            <label>工号<input v-model="editForm.employeeNo" class="field" /></label>
            <label>电话<input v-model="editForm.phone" class="field" type="tel" /></label>
            <label>状态<select v-model="editForm.status" class="field"><option>正常</option><option>停用</option></select></label>
            <label class="wide-field">备注<textarea v-model="editForm.remark" class="field remark-field" rows="4" /></label>
          </template>

          <template v-else>
            <label>阶段<input v-model="editForm.stage" class="field" readonly /></label>
            <label class="person-picker-field">
              责任人
              <div class="person-picker-control">
                <input class="field readonly-field" type="text" :value="editForm.owner || '请选择人员'" readonly aria-readonly="true" />
                <button class="btn" type="button" @click="openOwnerSelector">选择人员</button>
              </div>
            </label>
            <label>工号<input v-model="editForm.employeeNo" class="field" /></label>
            <label>部门<input v-model="editForm.department" class="field" /></label>
            <div class="wide-field channel-checks">
              <span>提醒渠道</span>
              <label v-for="channel in notifyChannelOptions" :key="channel">
                <input v-model="editForm.channels" type="checkbox" :value="channel" />
                {{ channel }}
              </label>
            </div>
          </template>

          <div v-if="formError" class="form-error">{{ formError }}</div>
        </div>
        <div class="org-dialog-foot">
          <button class="btn" type="button" @click="closeEdit">取消</button>
          <button class="btn primary" type="button" @click="saveEdit">保存</button>
        </div>
      </section>
    </div>

    <div v-if="ownerSelectorOpen" class="modal-backdrop nested-modal" @click.self="closeOwnerSelector">
      <section class="org-dialog owner-selector-dialog" role="dialog" aria-modal="true" aria-label="选择人员">
        <div class="org-dialog-head">
          <strong>选择人员</strong>
          <button class="dialog-close" type="button" aria-label="关闭" @click="closeOwnerSelector">×</button>
        </div>
        <div class="owner-selector-body">
          <button
            v-for="person in stageOwnerPersonOptions"
            :key="person.employeeNo"
            class="owner-option"
            :class="{ selected: selectedOwnerIds.includes(person.employeeNo) }"
            type="button"
            @click="toggleSelectedOwner(person.employeeNo)"
          >
            <input type="checkbox" :checked="selectedOwnerIds.includes(person.employeeNo)" tabindex="-1" readonly />
            <span class="owner-option-main">{{ person.name }}</span>
            <span class="owner-option-meta">{{ person.employeeNo }} · {{ person.department }}</span>
          </button>
        </div>
        <div class="org-dialog-foot">
          <button class="btn" type="button" @click="closeOwnerSelector">取消</button>
          <button class="btn primary" type="button" @click="confirmOwnerSelection">确定</button>
        </div>
      </section>
    </div>

    <div v-if="pendingDeleteRow" class="modal-backdrop" @click.self="closeDeleteConfirm">
      <section class="org-dialog alert-dialog" role="alertdialog" aria-modal="true" aria-label="删除确认">
        <div class="org-dialog-head">
          <strong>删除确认</strong>
          <button class="dialog-close" type="button" aria-label="关闭" @click="closeDeleteConfirm">×</button>
        </div>
        <div class="alert-dialog-body">
          确认删除{{ activeTab }}配置 {{ pendingDeleteRow.carrier || pendingDeleteRow.model || pendingDeleteRow.sender || pendingDeleteRow.stage }}？删除后不可恢复。
        </div>
        <div class="org-dialog-foot">
          <button class="btn" type="button" @click="closeDeleteConfirm">取消</button>
          <button class="btn danger" type="button" @click="confirmDeleteRow">确认删除</button>
        </div>
      </section>
    </div>

    <div v-if="pickupDialogCarrier" class="modal-backdrop" @click.self="closePickupManager">
      <section class="org-dialog pickup-dialog">
        <div class="org-dialog-head">
          <strong>提货人管理 - {{ pickupDialogCarrier.carrier }}</strong>
          <button class="dialog-close" type="button" aria-label="关闭" @click="closePickupManager">×</button>
        </div>

        <div class="pickup-manager-body">
          <div class="pickup-manager-toolbar">
            <button class="btn primary" type="button" @click="openAddPickupPersonFlow">添加提货人</button>
          </div>

          <div class="table-wrap pickup-table-wrap">
            <table class="delivery-table pickup-table">
              <thead>
                <tr>
                  <th>提货人名称</th>
                  <th>状态</th>
                  <th>手机号</th>
                  <th>身份证号</th>
                  <th>申请流程</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="person in pickupRows" :key="person.id">
                  <td>{{ person.name }}</td>
                  <td>
                    <button
                      class="status-switch"
                      :class="{ active: person.status === NORMAL }"
                      type="button"
                      role="switch"
                      :aria-checked="person.status === NORMAL"
                      :aria-label="`切换提货人状态：${person.status}`"
                      @click="togglePickupPersonStatus(person)"
                    >
                      <span class="status-switch-track"><span class="status-switch-thumb"></span></span>
                      <span class="status-switch-text">{{ person.status }}</span>
                    </button>
                  </td>
                  <td>{{ person.phone }}</td>
                  <td>{{ person.idCard }}</td>
                  <td>
                    <button class="action-link" type="button" @click="openApplicationFlow(person.applicationFlow)">
                      {{ person.applicationFlow }}
                    </button>
                  </td>
                </tr>
                <tr v-if="!pickupRows.length">
                  <td class="empty-cell" colspan="5">暂无提货人</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="org-dialog-foot">
          <button class="btn" type="button" @click="closePickupManager">关闭</button>
        </div>
      </section>
    </div>
  </section>
</template>
