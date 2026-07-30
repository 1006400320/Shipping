<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { packageBoxConfigs } from '../data/logistics'
import { idbGet, idbSet } from '../storage/indexedDb'

const STORAGE_KEY = 'accessory-boxes:v1'
const FREIGHT_CONFIG_STORAGE_KEY = 'freight-config:v1'
const NORMAL = '正常'
const SYSTEM_UPDATER = '张三'
const PAGE_SIZE = 10
const statusOptions = ['全部', '未使用', '已使用', '停用']
const editableStatusOptions = ['未使用', '已使用', '停用']

const filters = reactive({
  keyword: '',
  model: '全部',
  status: '全部'
})
const appliedFilters = ref({ ...filters })
const rows = ref([])
const boxConfigs = ref(packageBoxConfigs.map((item) => ({ ...item })))
const selectedCodes = ref([])
const currentPage = ref(1)
const editMode = ref('')
const editCode = ref('')
const editForm = reactive(getEmptyForm())
const generateOpen = ref(false)
const printDialogOpen = ref(false)
const generateForm = reactive({
  boxConfigId: '',
  quantity: 1
})
const alertOpen = ref(false)
const alertMessage = ref('')
const formError = ref('')
const generateError = ref('')
const storageError = ref('')
let storageReady = false
let saveTimer = 0

const normalBoxConfigs = computed(() => boxConfigs.value.filter((item) => item.status === NORMAL))
const modelOptions = computed(() => ['全部', ...new Set(rows.value.map((item) => item.model).filter(Boolean))])
const filteredRows = computed(() => {
  const keyword = appliedFilters.value.keyword.trim().toLowerCase()

  return rows.value.filter((item) => {
    const keywordText = `${item.code} ${item.model} ${item.description} ${item.remark || ''}`.toLowerCase()
    const keywordMatched = !keyword || keywordText.includes(keyword)
    const modelMatched = appliedFilters.value.model === '全部' || item.model === appliedFilters.value.model
    const statusMatched = appliedFilters.value.status === '全部' || item.status === appliedFilters.value.status

    return keywordMatched && modelMatched && statusMatched
  })
})
const sortedRows = computed(() =>
  [...filteredRows.value].sort((left, right) => String(right.updateTime).localeCompare(String(left.updateTime)))
)
const totalPages = computed(() => Math.max(Math.ceil(sortedRows.value.length / PAGE_SIZE), 1))
const pagedRows = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return sortedRows.value.slice(start, start + PAGE_SIZE)
})
const allPagedSelected = computed(
  () => pagedRows.value.length > 0 && pagedRows.value.every((item) => selectedCodes.value.includes(item.code))
)
const selectedRows = computed(() => rows.value.filter((item) => selectedCodes.value.includes(item.code)))
const selectedPrintRows = ref([])
const dialogTitle = computed(() => (editMode.value === 'create' ? '新增配件箱' : '编辑配件箱'))
const selectedEditConfig = computed(() => boxConfigs.value.find((item) => item.id === editForm.boxConfigId))
const selectedGenerateConfig = computed(() => normalBoxConfigs.value.find((item) => item.id === generateForm.boxConfigId))
const barcodeSegments = Array.from({ length: 58 }, (_, index) => ({
  width: ((index * 7) % 4) + 1,
  blank: index % 9 === 0 || index % 13 === 0
}))

function getEmptyForm() {
  return {
    code: '',
    boxConfigId: '',
    model: '',
    description: '',
    length: 0,
    width: 0,
    height: 0,
    volume: 0,
    status: '未使用',
    remark: ''
  }
}

function nowText(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function dateKey(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
}

function cloneRows(value) {
  return value.map((item) => ({ ...item }))
}

function createSeedRows() {
  const configsById = new Map(packageBoxConfigs.map((item) => [item.id, item]))
  return [
    {
      code: 'PJX-20260605-0001',
      boxConfigId: 'BOXCFG-004',
      remark: '线材与壳体同箱，注意防压。',
      printedAt: '2026-06-05 10:14:02'
    },
    {
      code: 'PJX-20260605-0002',
      boxConfigId: 'BOXCFG-002',
      remark: '',
      printedAt: ''
    },
    {
      code: 'PJX-20260605-0003',
      boxConfigId: 'BOXCFG-004',
      remark: '',
      printedAt: ''
    }
  ].map((item, index) => {
    const config = configsById.get(item.boxConfigId) || packageBoxConfigs[0]
    return createRowFromConfig(config, {
      code: item.code,
      status: index === 1 ? '停用' : '未使用',
      createdAt: `2026-06-05 10:${String(12 + index).padStart(2, '0')}:00`,
      updateTime: `2026-06-05 10:${String(12 + index).padStart(2, '0')}:00`,
      printedAt: item.printedAt,
      remark: item.remark
    })
  })
}

function createRowFromConfig(config, overrides = {}) {
  const time = nowText()
  return {
    id: overrides.id || `ACCESSORY-${crypto.randomUUID?.() || Date.now()}`,
    code: overrides.code || getNextBoxCode(),
    boxConfigId: config.id,
    model: config.model,
    description: config.description,
    length: Number(config.length) || 0,
    width: Number(config.width) || 0,
    height: Number(config.height) || 0,
    volume: Number(config.volume) || 0,
    status: overrides.status || '未使用',
    createdAt: overrides.createdAt || time,
    updateTime: overrides.updateTime || time,
    updater: overrides.updater || SYSTEM_UPDATER,
    printedAt: overrides.printedAt || '',
    remark: overrides.remark || ''
  }
}

async function loadBoxConfigs() {
  try {
    const saved = await idbGet(FREIGHT_CONFIG_STORAGE_KEY)
    const savedBoxRows = Array.isArray(saved?.boxRows) ? saved.boxRows : null
    boxConfigs.value = cloneRows(savedBoxRows || packageBoxConfigs)
  } catch (error) {
    boxConfigs.value = packageBoxConfigs.map((item) => ({ ...item }))
  }
}

async function loadRows() {
  try {
    const saved = await idbGet(STORAGE_KEY)
    rows.value = Array.isArray(saved?.rows) ? cloneRows(saved.rows) : createSeedRows()
    storageError.value = ''
  } catch (error) {
    rows.value = createSeedRows()
    storageError.value = '本地保存不可用，当前修改仅保存在页面内存。'
  } finally {
    storageReady = true
  }
}

async function persistRows() {
  try {
    await idbSet(STORAGE_KEY, { rows: cloneRows(rows.value) })
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

function applyFilters() {
  appliedFilters.value = { ...filters }
  currentPage.value = 1
}

function resetFilters() {
  filters.keyword = ''
  filters.model = '全部'
  filters.status = '全部'
  applyFilters()
}

function gotoPage(page) {
  currentPage.value = Math.min(Math.max(page, 1), totalPages.value)
}

function toggleAllPagedRows(event) {
  const pagedCodes = pagedRows.value.map((item) => item.code)
  if (event.target.checked) {
    selectedCodes.value = [...new Set([...selectedCodes.value, ...pagedCodes])]
    return
  }
  selectedCodes.value = selectedCodes.value.filter((code) => !pagedCodes.includes(code))
}

function syncConfigToForm(config) {
  if (!config) return
  editForm.boxConfigId = config.id
  editForm.model = config.model
  editForm.description = config.description
  editForm.length = Number(config.length) || 0
  editForm.width = Number(config.width) || 0
  editForm.height = Number(config.height) || 0
  editForm.volume = Number(config.volume) || 0
}

function handleEditConfigChange() {
  syncConfigToForm(selectedEditConfig.value)
}

function openCreate() {
  editMode.value = 'create'
  editCode.value = ''
  Object.assign(editForm, getEmptyForm())
  editForm.code = getNextBoxCode()
  syncConfigToForm(normalBoxConfigs.value[0] || boxConfigs.value[0])
  formError.value = ''
}

function openEdit(row) {
  editMode.value = 'edit'
  editCode.value = row.code
  Object.assign(editForm, getEmptyForm(), row)
  formError.value = ''
}

function closeEdit() {
  editMode.value = ''
  editCode.value = ''
  formError.value = ''
}

function validateEditForm() {
  const code = editForm.code.trim()
  if (!code) return '配件箱编号不能为空。'
  if (!editForm.boxConfigId) return '请选择配件箱型号。'
  if (!editableStatusOptions.includes(editForm.status)) return '请选择有效状态。'
  if (rows.value.some((item) => item.code === code && item.code !== editCode.value)) return '配件箱编号已存在。'
  return ''
}

function saveEdit() {
  const error = validateEditForm()
  if (error) {
    formError.value = error
    return
  }

  const time = nowText()
  const payload = {
    ...editForm,
    code: editForm.code.trim(),
    updateTime: time,
    updater: SYSTEM_UPDATER
  }

  if (editMode.value === 'create') {
    rows.value.unshift({
      id: `ACCESSORY-${crypto.randomUUID?.() || Date.now()}`,
      ...payload,
      createdAt: time,
      printedAt: ''
    })
  } else {
    const index = rows.value.findIndex((item) => item.code === editCode.value)
    if (index === -1) {
      formError.value = '未找到当前配件箱。'
      return
    }
    rows.value[index] = {
      ...rows.value[index],
      ...payload
    }
  }

  applyFilters()
  closeEdit()
}

function deleteRow(row) {
  if (row.status !== '未使用') {
    showAlert('只能删除未使用状态的配件箱。')
    return
  }
  rows.value = rows.value.filter((item) => item.code !== row.code)
  selectedCodes.value = selectedCodes.value.filter((code) => code !== row.code)
  if (currentPage.value > totalPages.value) gotoPage(totalPages.value)
}

function openGenerate() {
  generateOpen.value = true
  generateForm.boxConfigId = normalBoxConfigs.value[0]?.id || ''
  generateForm.quantity = 1
  generateError.value = ''
}

function closeGenerate() {
  generateOpen.value = false
  generateError.value = ''
}

function getNextBoxCode(existingRows = rows.value) {
  const key = dateKey()
  const prefix = `PJX-${key}-`
  const maxNo = existingRows.reduce((max, item) => {
    if (!String(item.code).startsWith(prefix)) return max
    const value = Number(String(item.code).slice(prefix.length))
    return Number.isFinite(value) ? Math.max(max, value) : max
  }, 0)
  return `${prefix}${String(maxNo + 1).padStart(4, '0')}`
}

function generateBoxes() {
  const quantity = Number(generateForm.quantity)
  const config = selectedGenerateConfig.value
  if (!config) {
    generateError.value = '请选择状态正常的配件箱型号。'
    return
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 200) {
    generateError.value = '数量必须是 1-200 的正整数。'
    return
  }

  const created = []
  const sourceRows = [...rows.value]
  for (let index = 0; index < quantity; index += 1) {
    const row = createRowFromConfig(config, {
      code: getNextBoxCode([...sourceRows, ...created])
    })
    created.push(row)
  }

  rows.value = [...created, ...rows.value]
  selectedCodes.value = created.map((item) => item.code)
  applyFilters()
  closeGenerate()
}

function printSelectedRows() {
  if (!selectedRows.value.length) {
    showAlert('请先勾选需要打印条码的配件箱。')
    return
  }

  selectedPrintRows.value = cloneRows(selectedRows.value)
  printDialogOpen.value = true
}

function confirmPrintRows() {
  if (!selectedPrintRows.value.length) return

  const time = nowText()
  rows.value
    .filter((row) => selectedPrintRows.value.some((item) => item.code === row.code))
    .forEach((row) => {
    row.printedAt = time
    row.updateTime = time
    row.updater = SYSTEM_UPDATER
  })
  selectedPrintRows.value = selectedPrintRows.value.map((row) => ({ ...row, printedAt: time, updateTime: time, updater: SYSTEM_UPDATER }))
  document.body.classList.add('printing-accessory-barcode')
  nextTick(() => window.print())
}

function handleAfterPrint() {
  document.body.classList.remove('printing-accessory-barcode')
}

function closePrintDialog() {
  printDialogOpen.value = false
  selectedPrintRows.value = []
  document.body.classList.remove('printing-accessory-barcode')
}

function showAlert(message) {
  alertMessage.value = message
  alertOpen.value = true
}

function closeAlert() {
  alertOpen.value = false
  alertMessage.value = ''
}

function formatDimension(row) {
  return `${row.length}*${row.width}*${row.height} mm`
}

onMounted(async () => {
  await loadBoxConfigs()
  await loadRows()
  window.addEventListener('afterprint', handleAfterPrint)
})

onBeforeUnmount(() => {
  window.clearTimeout(saveTimer)
  window.removeEventListener('afterprint', handleAfterPrint)
  document.body.classList.remove('printing-accessory-barcode')
})

watch(rows, schedulePersistRows, { deep: true })
watch(totalPages, () => {
  if (currentPage.value > totalPages.value) gotoPage(totalPages.value)
})
</script>

<template>
  <section class="content accessory-manage-page">
    <section class="panel delivery-manager accessory-manager">
      <div class="section-head accessory-manager-head">
        <div>
          <div class="section-title">配件箱管理</div>
          <div class="section-extra">生成、维护并批量打印配件箱条码</div>
        </div>
        <div class="accessory-manager-actions">
          <button class="btn" type="button" @click="printSelectedRows">打印条码</button>
          <button class="btn primary" type="button" @click="openGenerate">生成配件箱</button>
        </div>
      </div>

      <div class="delivery-filter accessory-filter">
        <label class="filter-field keyword-field">
          关键字
          <input v-model="filters.keyword" type="search" placeholder="配件箱编号、型号、描述、备注" @keyup.enter="applyFilters" />
        </label>
        <label class="filter-field compact-field">
          配件箱型号
          <select v-model="filters.model">
            <option v-for="item in modelOptions" :key="item">{{ item }}</option>
          </select>
        </label>
        <label class="filter-field compact-field">
          状态
          <select v-model="filters.status">
            <option v-for="item in statusOptions" :key="item">{{ item }}</option>
          </select>
        </label>
        <button class="btn primary" type="button" @click="applyFilters">查询</button>
        <button class="btn" type="button" @click="resetFilters">重置</button>
      </div>

      <div class="toolbar-notice freight-summary">
        <span>共 {{ sortedRows.length }} 条</span>
        <span>已选择 {{ selectedCodes.length }} 条</span>
        <span>可用型号 {{ normalBoxConfigs.length }} 个</span>
        <span v-if="storageError" class="save-notice">{{ storageError }}</span>
      </div>

      <div class="table-wrap delivery-table-wrap">
        <table class="delivery-table accessory-manage-table">
          <thead>
            <tr>
              <th>
                <input type="checkbox" :checked="allPagedSelected" aria-label="选择当前页配件箱" @change="toggleAllPagedRows" />
              </th>
              <th>配件箱编号</th>
              <th>配件箱型号</th>
              <th>描述</th>
              <th>尺寸</th>
              <th>体积(m³)</th>
              <th>状态</th>
              <th>创建时间</th>
              <th>打印时间</th>
              <th>备注</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in pagedRows" :key="item.code">
              <td>
                <input v-model="selectedCodes" type="checkbox" :value="item.code" :aria-label="`选择配件箱 ${item.code}`" />
              </td>
              <td class="link-cell">{{ item.code }}</td>
              <td>{{ item.model }}</td>
              <td>{{ item.description }}</td>
              <td>{{ formatDimension(item) }}</td>
              <td class="qty">{{ item.volume }}</td>
              <td :class="{ ok: item.status === '未使用', warn: item.status === '已使用', danger: item.status === '停用' }">{{ item.status }}</td>
              <td>{{ item.createdAt }}</td>
              <td>{{ item.printedAt || '-' }}</td>
              <td>{{ item.remark || '-' }}</td>
              <td class="action-cell">
                <button class="action-link" type="button" @click="openEdit(item)">编辑</button>
                <button class="action-link danger-link" type="button" @click="deleteRow(item)">删除</button>
              </td>
            </tr>
            <tr v-if="!pagedRows.length">
              <td class="empty-cell" colspan="11">暂无配件箱</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pagination-bar">
        <span>第 {{ currentPage }} / {{ totalPages }} 页</span>
        <button class="pager-btn" type="button" :disabled="currentPage === 1" @click="gotoPage(currentPage - 1)">上一页</button>
        <button class="pager-btn active" type="button">{{ currentPage }}</button>
        <button class="pager-btn" type="button" :disabled="currentPage === totalPages" @click="gotoPage(currentPage + 1)">下一页</button>
        <span>共 {{ sortedRows.length }} 条记录</span>
      </div>
    </section>

    <section class="accessory-print-page" aria-hidden="true">
      <article v-for="item in selectedPrintRows" :key="item.code" class="accessory-print-card">
        <header>
          <strong>配件箱条码</strong>
          <span>{{ item.model }}</span>
        </header>
        <div class="barcode" aria-label="配件箱条码">
          <span
            v-for="(segment, index) in barcodeSegments"
            :key="index"
            :class="{ blank: segment.blank }"
            :style="{ width: `${segment.width}px` }"
          ></span>
        </div>
        <div class="barcode-code">{{ item.code }}</div>
        <div class="barcode-meta">
          <span>型号：{{ item.model }}</span>
          <span>尺寸：{{ formatDimension(item) }}</span>
          <span>体积：{{ item.volume }} m³</span>
          <span>打印：{{ item.printedAt || '-' }}</span>
        </div>
      </article>
    </section>

    <div v-if="printDialogOpen" class="print-dialog-backdrop" @click.self="closePrintDialog">
      <section class="print-dialog accessory-barcode-dialog" role="dialog" aria-modal="true" aria-label="打印配件箱条码">
        <div class="print-dialog-toolbar">
          <div>
            <strong>打印配件箱条码</strong>
            <span>已选择 {{ selectedPrintRows.length }} 个配件箱</span>
          </div>
          <div class="print-dialog-actions">
            <button class="btn" type="button" @click="closePrintDialog">取消</button>
            <button class="btn primary" type="button" @click="confirmPrintRows">打印</button>
          </div>
        </div>

        <div class="print-preview-scroll accessory-barcode-preview">
          <article v-for="item in selectedPrintRows" :key="item.code" class="accessory-print-card">
            <header>
              <strong>配件箱条码</strong>
              <span>{{ item.model }}</span>
            </header>
            <div class="barcode" aria-label="配件箱条码">
              <span
                v-for="(segment, index) in barcodeSegments"
                :key="index"
                :class="{ blank: segment.blank }"
                :style="{ width: `${segment.width}px` }"
              ></span>
            </div>
            <div class="barcode-code">{{ item.code }}</div>
            <div class="barcode-meta">
              <span>型号：{{ item.model }}</span>
              <span>尺寸：{{ formatDimension(item) }}</span>
              <span>体积：{{ item.volume }} m³</span>
              <span>打印：{{ item.printedAt || '待打印' }}</span>
            </div>
          </article>
        </div>
      </section>
    </div>

    <div v-if="editMode" class="modal-backdrop" @click.self="closeEdit">
      <section class="org-dialog freight-dialog">
        <div class="org-dialog-head">
          <strong>{{ dialogTitle }}</strong>
          <button class="dialog-close" type="button" aria-label="关闭" @click="closeEdit">×</button>
        </div>
        <div class="freight-dialog-body">
          <label>配件箱编号<input v-model="editForm.code" class="field" /></label>
          <label>
            配件箱型号
            <select v-model="editForm.boxConfigId" class="field" @change="handleEditConfigChange">
              <option v-for="item in boxConfigs" :key="item.id" :value="item.id">{{ item.model }}</option>
            </select>
          </label>
          <label>状态<select v-model="editForm.status" class="field"><option v-for="item in editableStatusOptions" :key="item">{{ item }}</option></select></label>
          <label>体积(m³)<input v-model="editForm.volume" class="field readonly-field" readonly /></label>
          <label class="wide-field">描述<input v-model="editForm.description" class="field readonly-field" readonly /></label>
          <label>长(mm)<input v-model="editForm.length" class="field readonly-field" readonly /></label>
          <label>宽(mm)<input v-model="editForm.width" class="field readonly-field" readonly /></label>
          <label>高(mm)<input v-model="editForm.height" class="field readonly-field" readonly /></label>
          <label class="wide-field">备注<textarea v-model="editForm.remark" class="field remark-field" rows="4" maxlength="120" /></label>
          <div v-if="formError" class="form-error">{{ formError }}</div>
        </div>
        <div class="org-dialog-foot">
          <button class="btn" type="button" @click="closeEdit">取消</button>
          <button class="btn primary" type="button" @click="saveEdit">保存</button>
        </div>
      </section>
    </div>

    <div v-if="generateOpen" class="modal-backdrop" @click.self="closeGenerate">
      <section class="org-dialog freight-dialog">
        <div class="org-dialog-head">
          <strong>生成配件箱</strong>
          <button class="dialog-close" type="button" aria-label="关闭" @click="closeGenerate">×</button>
        </div>
        <div class="freight-dialog-body">
          <label class="wide-field">
            配件箱型号
            <select v-model="generateForm.boxConfigId" class="field">
              <option value="" disabled>请选择状态正常的配件箱型号</option>
              <option v-for="item in normalBoxConfigs" :key="item.id" :value="item.id">
                {{ item.model }} / {{ item.description }}
              </option>
            </select>
          </label>
          <label>数量<input v-model="generateForm.quantity" class="field" min="1" max="200" step="1" type="number" /></label>
          <label>下一编号<input class="field readonly-field" type="text" :value="getNextBoxCode()" readonly /></label>
          <div v-if="generateError" class="form-error">{{ generateError }}</div>
        </div>
        <div class="org-dialog-foot">
          <button class="btn" type="button" @click="closeGenerate">取消</button>
          <button class="btn primary" type="button" @click="generateBoxes">生成</button>
        </div>
      </section>
    </div>

    <div v-if="alertOpen" class="modal-backdrop">
      <section class="org-dialog alert-dialog" role="alertdialog" aria-modal="true" aria-label="提示">
        <div class="org-dialog-head">
          <strong>提示</strong>
          <button class="dialog-close" type="button" aria-label="关闭" @click="closeAlert">×</button>
        </div>
        <div class="alert-dialog-body">{{ alertMessage }}</div>
        <div class="org-dialog-foot">
          <button class="btn primary" type="button" @click="closeAlert">知道了</button>
        </div>
      </section>
    </div>
  </section>
</template>
