<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  carrierConfigs,
  freightConfigs,
  packageBoxConfigs,
  senderConfigs
} from '../data/logistics'
import { idbGet, idbSet } from '../storage/indexedDb'

const TAB_FREIGHT = '运费'
const TAB_BOX = '配件箱'
const TAB_CARRIER = '承运公司'
const TAB_SENDER = '发货人'
const ALL = '全部'
const NORMAL = '正常'
const DISABLED = '停用'
const SYSTEM_UPDATER = '张三'
const MOCK_NOW = '2026-05-20 12:00:00'
const FREIGHT_CONFIG_STORAGE_KEY = 'freight-config:v1'

const tabs = [TAB_FREIGHT, TAB_BOX, TAB_CARRIER, TAB_SENDER]
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
const editRowId = ref('')
const editMode = ref('edit')
const editForm = reactive({})
const formError = ref('')
const storageError = ref('')
const pickupDialogCarrierId = ref('')
let storageReady = false
let saveTimer = 0

const activeSourceRows = computed(() => {
  if (activeTab.value === TAB_BOX) return boxRows.value
  if (activeTab.value === TAB_CARRIER) return carrierRows.value
  if (activeTab.value === TAB_SENDER) return senderRows.value
  return freightRows.value
})

const keywordLabel = computed(() => {
  if (activeTab.value === TAB_BOX) return '配件箱型号、描述'
  if (activeTab.value === TAB_SENDER) return '发货人'
  return '承运公司'
})

const keywordPlaceholder = computed(() => {
  if (activeTab.value === TAB_BOX) return '请输入配件箱型号或描述'
  if (activeTab.value === TAB_SENDER) return '发货人 / 工号 / 电话'
  return '承运公司'
})

const showTypeFilter = computed(() => activeTab.value === TAB_FREIGHT || activeTab.value === TAB_CARRIER)
const showRouteFilter = computed(() => activeTab.value === TAB_FREIGHT)
const showImportButtons = computed(() => activeTab.value === TAB_FREIGHT || activeTab.value === TAB_BOX)
const showCreateButton = computed(() => [TAB_BOX, TAB_CARRIER, TAB_SENDER].includes(activeTab.value))

const typeOptions = computed(() => {
  const names = activeSourceRows.value.map((item) => item.type).filter(Boolean)
  return [ALL, ...new Set(names)]
})

const provinceOptions = computed(() => {
  const names = [...freightRows.value, ...boxRows.value].flatMap((item) => [item.fromProvince, item.toProvince])
  return [ALL, ...new Set(names.filter(Boolean))]
})

const editProvinceOptions = computed(() => provinceOptions.value.filter((item) => item !== ALL))

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

const enabledCount = computed(() => activeSourceRows.value.filter((item) => item.status === NORMAL).length)
const dialogTitle = computed(() => `${editMode.value === 'create' ? '新增' : '编辑'}${activeTab.value}`)
const calculatedBoxVolume = computed(() => {
  return formatBoxVolume(calculateBoxVolume(editForm.length, editForm.width, editForm.height))
})
const pickupDialogCarrier = computed(() =>
  carrierRows.value.find((item) => item.id === pickupDialogCarrierId.value)
)
const pickupRows = computed(() => pickupDialogCarrier.value?.pickupPeople || [])

function cloneRows(rows) {
  return rows.map((item) => ({
    ...item,
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
    senderRows: cloneRows(senderRows.value)
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

function getKeywordText(item) {
  if (activeTab.value === TAB_BOX) return `${item.model} ${item.description}`
  if (activeTab.value === TAB_SENDER) return `${item.sender} ${item.employeeNo} ${item.phone || ''} ${item.remark || ''}`
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

function switchTab(tab) {
  activeTab.value = tab
  resetFilters()
  closeEdit()
  closePickupManager()
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

function getRowsRef() {
  if (activeTab.value === TAB_BOX) return boxRows
  if (activeTab.value === TAB_CARRIER) return carrierRows
  if (activeTab.value === TAB_SENDER) return senderRows
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
      toCity: '湛江市'
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
  Object.assign(editForm, getDefaultForm(), item)
  formError.value = ''
}

function openCreate() {
  editMode.value = 'create'
  editRowId.value = ''
  Object.assign(editForm, getDefaultForm())
  formError.value = ''
}

function closeEdit() {
  editRowId.value = ''
  editMode.value = 'edit'
  formError.value = ''
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
      return { error: '尺寸必须是大于等于 0 的数字' }
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
    if (Number.isNaN(weightRatio) || weightRatio <= 0) return { error: '重抛比必须是大于 0 的数字' }

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

  const volumeFee = Number(editForm.volumeFee)
  const weightFee = Number(editForm.weightFee)
  const leadDays = Number(editForm.leadDays)

  if (!editForm.carrier?.trim()) return { error: '承运公司不能为空' }
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
})

watch([freightRows, boxRows, carrierRows, senderRows], schedulePersistRows, { deep: true })
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
      </div>

      <div class="toolbar-notice freight-summary">
        <span>共 {{ sortedRows.length }} 条</span>
        <span>正常 {{ enabledCount }} 条</span>
        <span v-if="storageError" class="save-notice">{{ storageError }}</span>
      </div>

      <div class="table-wrap delivery-table-wrap">
        <table v-if="activeTab === TAB_FREIGHT" class="delivery-table freight-table">
          <thead>
            <tr>
              <th>承运公司</th>
              <th>类型</th>
              <th>状态</th>
              <th>出发省份</th>
              <th>出发城市</th>
              <th>目的省份</th>
              <th>目的城市</th>
              <th>运输费（元/m³）</th>
              <th>运输费（元/kg）</th>
              <th>时效（不含提货当天）</th>
              <th>最后更新时间</th>
              <th>最后更新人</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in sortedRows" :key="item.id">
              <td>{{ item.carrier }}</td>
              <td>{{ item.type }}</td>
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
              <td>{{ item.fromProvince }}</td>
              <td>{{ item.fromCity }}</td>
              <td>{{ item.toProvince }}</td>
              <td>{{ item.toCity }}</td>
              <td class="qty">{{ item.volumeFee }}</td>
              <td class="qty">{{ item.weightFee }}</td>
              <td>{{ item.leadDays }}</td>
              <td>{{ item.updateTime }}</td>
              <td>{{ item.updater }}</td>
            </tr>
            <tr v-if="!sortedRows.length">
              <td class="empty-cell" colspan="12">暂无运费配置</td>
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
              <td class="action-cell"><button class="action-link" type="button" @click="openEdit(item)">编辑</button></td>
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
              <th>重抛比(cm³/kg)</th>
              <th>货运委托书</th>
              <th>状态</th>
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

        <table v-else class="delivery-table freight-table sender-config-table">
          <thead>
            <tr>
              <th>发货人</th>
              <th>工号</th>
              <th>电话</th>
              <th>备注</th>
              <th>状态</th>
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
            <label>状态<select v-model="editForm.status" class="field"><option>正常</option><option>停用</option></select></label>
            <label>出发省份<select v-model="editForm.fromProvince" class="field"><option v-for="item in editProvinceOptions" :key="item">{{ item }}</option></select></label>
            <label>出发城市<input v-model="editForm.fromCity" class="field" /></label>
            <label>目的省份<select v-model="editForm.toProvince" class="field"><option v-for="item in editProvinceOptions" :key="item">{{ item }}</option></select></label>
            <label>目的城市<input v-model="editForm.toCity" class="field" /></label>
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
            <label>重抛比(cm³/kg)<input v-model="editForm.weightRatio" class="field" min="1" step="1" type="number" /></label>
            <label>状态<select v-model="editForm.status" class="field"><option>正常</option><option>停用</option></select></label>
            <label class="wide-field">
              货运委托书
              <input class="field" type="file" @change="handleCarrierAttachmentChange" />
              <span v-if="editForm.freightAuthorizationLetter" class="attachment-note">
                已选择：{{ editForm.freightAuthorizationLetter }}
              </span>
            </label>
          </template>

          <template v-else>
            <label>发货人<input v-model="editForm.sender" class="field" /></label>
            <label>工号<input v-model="editForm.employeeNo" class="field" /></label>
            <label>电话<input v-model="editForm.phone" class="field" type="tel" /></label>
            <label>状态<select v-model="editForm.status" class="field"><option>正常</option><option>停用</option></select></label>
            <label class="wide-field">备注<textarea v-model="editForm.remark" class="field remark-field" rows="4" /></label>
          </template>

          <div v-if="formError" class="form-error">{{ formError }}</div>
        </div>
        <div class="org-dialog-foot">
          <button class="btn" type="button" @click="closeEdit">取消</button>
          <button class="btn primary" type="button" @click="saveEdit">保存</button>
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
