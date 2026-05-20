<script setup>
import { ref, watch } from 'vue'
import { idbGet, idbSet } from '../storage/indexedDb'

const props = defineProps({
  pageKey: {
    type: String,
    required: true
  },
  pageLabel: {
    type: String,
    required: true
  }
})

const rows = ref([])
const saveError = ref('')
let loading = false
let loadRun = 0

const seedRows = {
  workbench: [
    {
      feature: '发货任务查询',
      rule: '支持按状态、单号、要求到货日期、承运公司筛选；查询结果保留当前筛选条件。'
    },
    {
      feature: '节点任务操作',
      rule: '不同状态展示对应操作；待完善进入完善页，其他操作进入该任务详情。'
    }
  ],
  freightConfig: [
    {
      feature: '运费规则配置',
      rule: '按承运公司、类型、线路维护体积费、重量费和时效；停用记录不参与后续报价。'
    },
    {
      feature: '配件箱规则',
      rule: '箱型需要维护长宽高和体积；体积、尺寸必须大于等于 0。'
    }
  ]
}

function makeRow(feature = '', rule = '') {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    feature,
    rule
  }
}

function getStorageKey() {
  return `logistics-prototype-notes:${props.pageKey}`
}

function getDefaultRows() {
  const defaults = seedRows[props.pageKey] || [
    {
      feature: '',
      rule: ''
    }
  ]

  return defaults.map((item) => makeRow(item.feature, item.rule))
}

function normalizeRows(value) {
  if (!Array.isArray(value)) return getDefaultRows()

  const normalized = value.map((item) => makeRow(item.feature || '', item.rule || ''))
  return normalized.length ? normalized : [makeRow()]
}

function getPayload() {
  return rows.value.map(({ feature, rule }) => ({ feature, rule }))
}

function loadLegacyRows(key) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null

    const saved = window.localStorage.getItem(key)
    return saved ? JSON.parse(saved) : null
  } catch (error) {
    return null
  }
}

async function loadRows() {
  const run = ++loadRun
  const key = getStorageKey()
  loading = true
  saveError.value = ''

  try {
    const saved = await idbGet(key)
    if (run !== loadRun) return

    if (saved) {
      rows.value = normalizeRows(saved)
      return
    }

    const legacyRows = loadLegacyRows(key)
    rows.value = legacyRows ? normalizeRows(legacyRows) : getDefaultRows()

    if (legacyRows) {
      await idbSet(key, getPayload())
      window.localStorage?.removeItem(key)
    }
  } catch (error) {
    saveError.value = '规则暂未保存，请检查浏览器存储权限。'
    rows.value = getDefaultRows()
  } finally {
    if (run === loadRun) loading = false
  }
}

async function saveRows() {
  if (loading) return

  const key = getStorageKey()

  try {
    await idbSet(key, getPayload())
    saveError.value = ''
  } catch (error) {
    saveError.value = '规则暂未保存，请检查浏览器存储权限。'
  }
}

function addRow() {
  rows.value.push(makeRow())
}

function removeRow(rowId) {
  if (rows.value.length === 1) {
    rows.value = [makeRow()]
    return
  }

  rows.value = rows.value.filter((row) => row.id !== rowId)
}

watch(() => props.pageKey, () => {
  void loadRows()
}, { immediate: true })
watch(rows, () => {
  void saveRows()
}, { deep: true })
</script>

<template>
  <section class="panel prototype-notes">
    <div class="section-head prototype-notes-head">
      <div>
        <div class="section-title">原型功能点与规则</div>
        <div class="prototype-context">{{ pageLabel }}</div>
      </div>
      <button class="btn primary" type="button" @click="addRow">新增功能点</button>
    </div>
    <div v-if="saveError" class="toolbar-notice prototype-save-error">{{ saveError }}</div>

    <div class="prototype-note-grid">
      <div class="prototype-note-header">功能点</div>
      <div class="prototype-note-header">对应规则</div>
      <div class="prototype-note-header">操作</div>

      <template v-for="row in rows" :key="row.id">
        <label class="prototype-note-field">
          <span class="visually-hidden">功能点</span>
          <textarea
            v-model="row.feature"
            class="prototype-textarea"
            placeholder="例：批量导入运费配置"
            rows="3"
          />
        </label>
        <label class="prototype-note-field">
          <span class="visually-hidden">对应规则</span>
          <textarea
            v-model="row.rule"
            class="prototype-textarea"
            placeholder="写触发条件、校验规则、边界处理和异常提示"
            rows="3"
          />
        </label>
        <div class="prototype-note-actions">
          <button class="action-link warn" type="button" @click="removeRow(row.id)">删除</button>
        </div>
      </template>
    </div>
  </section>
</template>
