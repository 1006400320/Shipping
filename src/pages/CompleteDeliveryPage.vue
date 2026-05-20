<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { senderConfigs } from '../data/logistics'
import { idbGet } from '../storage/indexedDb'

defineEmits(['back-to-workbench'])

const NORMAL = '正常'
const FREIGHT_CONFIG_STORAGE_KEY = 'freight-config:v1'
const deliveryMethods = ['货运', '车辆出货', '工程出货', '快递', '自提']
const settlementMethods = ['月结', '现付']
const showOrgDialog = ref(false)
const selectedCostCenter = ref(null)
const senderRows = ref(senderConfigs.map((item) => ({ ...item })))
const selectedSenderId = ref('')

const organizationTree = [
  {
    name: '深圳市捷顺科技实业股份有限公司',
    code: 'JS000',
    children: [
      {
        name: '营销中心',
        code: 'JS100',
        children: [
          { name: '华南销售部', code: 'JS101' },
          { name: '大客户业务部', code: 'JS102' }
        ]
      },
      {
        name: '制造中心',
        code: 'JS200',
        children: [
          { name: '交付管理部', code: 'JS201' },
          { name: '物流管理部', code: 'JS202' }
        ]
      },
      {
        name: '工程服务中心',
        code: 'JS300',
        children: [
          { name: '项目实施部', code: 'JS301' },
          { name: '售后服务部', code: 'JS302' }
        ]
      }
    ]
  }
]

const materialRows = reactive([
  { code: '', description: '', unit: '', actualQty: '', pieces: '', price: '', total: '', remark: '' }
])

const expenseForm = reactive({
  transferFee: '',
  deliveryFee: '',
  otherFee: '',
  feeChange: '',
  remark: ''
})

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
const totalFee = computed(() => {
  return (
    transportFee.value +
    parseMoney(expenseForm.transferFee) +
    parseMoney(expenseForm.deliveryFee) +
    parseMoney(expenseForm.otherFee)
  )
})
const enabledSenderOptions = computed(() => senderRows.value.filter((item) => item.status === NORMAL))
const selectedSender = computed(() =>
  enabledSenderOptions.value.find((item) => item.id === selectedSenderId.value)
)
const selectedSenderPhone = computed(() => selectedSender.value?.phone || '')

function cloneRows(rows) {
  return rows.map((item) => ({ ...item }))
}

function mergeSenderRow(item, fallback) {
  const merged = { ...(fallback || {}), ...item }

  if (fallback?.phone && typeof merged.phone === 'string' && merged.phone.includes('*')) {
    merged.phone = fallback.phone
  }

  return merged
}

function restoreSenderRows(savedRows) {
  if (!Array.isArray(savedRows)) return cloneRows(senderConfigs)

  const fallbackById = new Map(senderConfigs.map((item) => [item.id, item]))
  const restoredRows = savedRows.map((item) => mergeSenderRow(item, fallbackById.get(item.id)))
  const restoredIds = new Set(restoredRows.map((item) => item.id))
  const newFallbackRows = senderConfigs.filter((item) => !restoredIds.has(item.id))

  return [...restoredRows, ...cloneRows(newFallbackRows)]
}

async function loadSenderOptions() {
  try {
    const saved = await idbGet(FREIGHT_CONFIG_STORAGE_KEY)
    senderRows.value = restoreSenderRows(saved?.senderRows)

    if (!enabledSenderOptions.value.some((item) => item.id === selectedSenderId.value)) {
      selectedSenderId.value = ''
    }
  } catch (error) {
    senderRows.value = cloneRows(senderConfigs)
  }
}

function openOrgDialog() {
  showOrgDialog.value = true
}

function closeOrgDialog() {
  showOrgDialog.value = false
}

function selectCostCenter(node) {
  selectedCostCenter.value = node
  closeOrgDialog()
}

function parseMoney(value) {
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : 0
}

function formatMoney(value) {
  return value.toFixed(2)
}

function normalizeMoney(value) {
  const cleaned = String(value).replace(/[^\d.]/g, '')
  const [integer = '', ...decimalParts] = cleaned.split('.')
  const hasDecimal = cleaned.includes('.')
  const normalizedInteger = integer.replace(/^0+(?=\d)/, '') || (hasDecimal ? '0' : '')
  const decimal = decimalParts.join('').slice(0, 2)

  return hasDecimal ? `${normalizedInteger}.${decimal}` : normalizedInteger
}

function updateExpenseAmount(key, event) {
  const value = normalizeMoney(event.target.value)
  expenseForm[key] = value
  event.target.value = value
}

function getReadonlyExpenseValue(key) {
  return formatMoney(key === 'transportFee' ? transportFee.value : totalFee.value)
}

onMounted(() => {
  void loadSenderOptions()
})
</script>

<template>
  <section class="content complete-page">
    <section class="panel delivery-sheet">
      <div class="sheet-actions">
        <button class="btn" type="button" @click="$emit('back-to-workbench')">返回工作台</button>
        <button class="btn primary" type="button">保存</button>
      </div>

      <header class="delivery-header">
        <div class="jieshun-brand">
          <span class="logo-mark">
            <span class="mark-red"></span>
            <span class="mark-blue"></span>
          </span>
          <div>
            <div class="logo-text">捷顺</div>
            <div class="logo-en">JIESHUN</div>
            <div class="logo-site">http://www.jieshun.cn</div>
          </div>
        </div>
        <div class="sheet-title">
          <h1>深圳市捷顺科技实业股份有限公司</h1>
          <strong>送货单</strong>
        </div>
      </header>

      <section class="delivery-basic">
        <div class="basic-left">
          <label class="form-line form-line-wide">
            <span>收货单位<span class="required">*</span></span>
            <input class="sheet-input" type="text" />
          </label>

          <div class="form-line split-line">
            <span>成本中心<span class="required">*</span></span>
            <button class="sheet-select-button" type="button" @click="openOrgDialog">
              {{ selectedCostCenter?.code ? `${selectedCostCenter.code} ${selectedCostCenter.name}` : '选择' }}
            </button>
          </div>

          <div class="form-line option-line">
            <span>发运方式<span class="required">*</span></span>
            <label v-for="method in deliveryMethods" :key="method" class="radio-item">
              <input type="radio" name="deliveryMethod" />
              {{ method }}
            </label>
          </div>

          <div class="form-line option-line">
            <span>结算方式<span class="required">*</span></span>
            <label v-for="method in settlementMethods" :key="method" class="radio-item">
              <input type="radio" name="settlementMethod" />
              {{ method }}
            </label>
          </div>

          <div class="form-line location-line">
            <span>始发地</span>
            <select class="sheet-input"><option>中国</option></select>
            <select class="sheet-input"><option>广东省</option></select>
            <select class="sheet-input"><option>深圳市</option></select>
          </div>

          <div class="form-line location-line">
            <span>目的地</span>
            <select class="sheet-input"><option>中国</option></select>
            <select class="sheet-input"><option>请选择省份</option></select>
            <select class="sheet-input"><option>请选择城市</option></select>
          </div>

          <label class="form-line textarea-line">
            <span>详细地址<span class="required">*</span></span>
            <textarea class="sheet-input"></textarea>
          </label>

          <label class="form-line textarea-line">
            <span>交付说明</span>
            <textarea class="sheet-input"></textarea>
          </label>
        </div>

        <div class="basic-right">
          <label class="form-line">
            <span>单据号</span>
            <input
              class="sheet-input readonly-field"
              type="text"
              value="系统自动生成"
              readonly
              aria-readonly="true"
              tabindex="-1"
            />
          </label>
          <label class="form-line">
            <span>合同号</span>
            <input class="sheet-input" type="text" />
          </label>
          <label class="form-line">
            <span>销售订单号</span>
            <input class="sheet-input" type="text" />
          </label>
          <label class="form-line">
            <span>指定收货人<span class="required">*</span></span>
            <input class="sheet-input" type="text" />
          </label>
          <label class="form-line">
            <span>收货人电话<span class="required">*</span></span>
            <input class="sheet-input" type="tel" />
          </label>
          <div class="form-line read-line">
            <span>打印时间</span>
            <span class="plain-value"></span>
          </div>
        </div>
      </section>

      <section class="material-import">
        <div class="import-toolbar">
          <strong>模板导入物料清单</strong>
          <input class="file-picker" type="file" />
          <span>请点击<a href="#">这里</a>下载模板，并严格按照模板维护数据后再上传</span>
        </div>

        <div class="sheet-table-wrap">
          <table class="sheet-table">
            <thead>
              <tr>
                <th>操作</th>
                <th>物料编号</th>
                <th>物料描述</th>
                <th>单位</th>
                <th>实发数</th>
                <th>件数</th>
                <th>运价</th>
                <th>运价合计</th>
                <th>运价备注</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in materialRows" :key="index">
                <td><button class="table-icon" type="button" title="新增">+</button></td>
                <td><input v-model="item.code" class="cell-input" type="text" /></td>
                <td><input v-model="item.description" class="cell-input" type="text" /></td>
                <td><input v-model="item.unit" class="cell-input" type="text" /></td>
                <td><input v-model="item.actualQty" class="cell-input" type="number" /></td>
                <td><input v-model="item.pieces" class="cell-input" type="number" /></td>
                <td><input v-model="item.price" class="cell-input" type="number" /></td>
                <td><input v-model="item.total" class="cell-input" type="number" /></td>
                <td><input v-model="item.remark" class="cell-input" type="text" /></td>
              </tr>
              <tr class="total-row">
                <td></td>
                <td></td>
                <td></td>
                <td>合计</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="expense-strip">
        <label v-for="field in expenseCells" :key="field.key" class="expense-cell">
          <span>{{ field.label }}</span>
          <input
            v-if="field.type === 'amount'"
            class="sheet-input amount-input"
            type="text"
            inputmode="decimal"
            :value="expenseForm[field.key]"
            @input="updateExpenseAmount(field.key, $event)"
          />
          <input
            v-else-if="field.type === 'readonly'"
            class="sheet-input readonly-field amount-input"
            type="text"
            :value="getReadonlyExpenseValue(field.key)"
            readonly
            aria-readonly="true"
            tabindex="-1"
          />
          <input v-else v-model="expenseForm[field.key]" class="sheet-input" type="text" />
        </label>
      </section>

      <section class="sign-grid">
        <div class="sign-title carrier-title">承运方签收</div>
        <div class="carrier-fields">
          <label><span>公司名称</span><select class="sheet-input"><option></option></select></label>
          <label><span>提货人</span><input class="sheet-input" type="text" /></label>
          <label><span>证件号码</span><input class="sheet-input" type="text" /></label>
          <label><span>提货人电话</span><input class="sheet-input" type="tel" /></label>
          <label><span>车牌号</span><input class="sheet-input" type="text" /></label>
        </div>

        <div class="sign-title sender-title">发货方信息</div>
        <div class="sender-fields">
          <label class="sender-picker-field">
            <span>发货人/电话</span>
            <div class="sender-picker">
              <select v-model="selectedSenderId" class="sheet-input">
                <option value="">请选择发货人</option>
                <option v-for="sender in enabledSenderOptions" :key="sender.id" :value="sender.id">
                  {{ sender.sender }}
                </option>
              </select>
              <input
                class="sheet-input readonly-field"
                type="tel"
                :value="selectedSenderPhone"
                placeholder="自动带出电话"
                readonly
                aria-readonly="true"
                tabindex="-1"
              />
            </div>
          </label>
          <label><span>实际发货日</span><input class="sheet-input" type="date" /></label>
          <label><span>要求到店日</span><input class="sheet-input" type="date" /></label>
          <label><span>接货人/电话<span class="required">*</span></span><input class="sheet-input" type="text" /></label>
          <label><span>签收日期</span><input class="sheet-input" type="date" /></label>
        </div>

        <div class="sign-title receiver-title">收货方签收</div>
        <label class="receiver-name">
          <span>收货人姓名(盖章)</span>
          <input class="sheet-input" type="text" />
        </label>
        <div class="id-note">身份证号码(可写前6位或者后6位)收货后异常备注</div>
        <div class="sign-note">签收说明：请参考背面签收说明</div>
      </section>
    </section>

    <div
      v-if="showOrgDialog"
      class="modal-backdrop"
      role="presentation"
      @click.self="closeOrgDialog"
    >
      <section class="org-dialog" role="dialog" aria-modal="true" aria-labelledby="orgDialogTitle">
        <header class="org-dialog-head">
          <strong id="orgDialogTitle">选择成本中心</strong>
          <button class="dialog-close" type="button" aria-label="关闭" @click="closeOrgDialog">×</button>
        </header>

        <div class="org-tree">
          <ul>
            <li v-for="company in organizationTree" :key="company.code">
              <button class="org-node root-node" type="button" @click="selectCostCenter(company)">
                <span>{{ company.name }}</span>
                <em>{{ company.code }}</em>
              </button>
              <ul>
                <li v-for="center in company.children" :key="center.code">
                  <button class="org-node" type="button" @click="selectCostCenter(center)">
                    <span>{{ center.name }}</span>
                    <em>{{ center.code }}</em>
                  </button>
                  <ul>
                    <li v-for="dept in center.children" :key="dept.code">
                      <button class="org-node leaf-node" type="button" @click="selectCostCenter(dept)">
                        <span>{{ dept.name }}</span>
                        <em>{{ dept.code }}</em>
                      </button>
                    </li>
                  </ul>
                </li>
              </ul>
            </li>
          </ul>
        </div>

        <footer class="org-dialog-foot">
          <button class="btn" type="button" @click="closeOrgDialog">取消</button>
        </footer>
      </section>
    </div>
  </section>
</template>
