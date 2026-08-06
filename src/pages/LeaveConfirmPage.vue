<script setup>
import { computed, ref, watchEffect } from 'vue'
import { materials, shipmentTasks } from '../data/logistics'

const props = defineProps({
  taskNo: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['back-to-workbench'])

const handoverTime = ref('2026-02-26T14:30')
const warehouseKeeper = ref('张三')
const logisticsStaff = ref('李强')
const staffPhone = ref('13800110001')
const vehicleNo = ref('沪D-K5829')
const waybillNos = ref([''])
const signCode = ref('')
const attachmentName = ref('')
const remark = ref('')
const confirmed = ref(false)
const actionNotice = ref('')

const task = computed(
  () =>
    shipmentTasks.find((item) => item.no === props.taskNo) ||
    shipmentTasks.find((item) => item.status === '待交接装车') ||
    shipmentTasks[0]
)
const isTransportMode = computed(() => task.value?.status === '待装车离厂')
const isAppointmentMode = computed(() => task.value?.status === '待预约送货')
const isSignMode = computed(() => ['待用户签收', '待签收'].includes(task.value?.status))

const pageCopy = computed(() =>
  isSignMode.value
    ? {
        title: '用户签收',
        description: '物流公司将物品送给签收人后，询问签收人签收码，录入后确认用户签收。',
        primaryCardTitle: '签收码确认',
        primaryCardNote: '物流人员录入签收码后提交',
        operatorLabel: '签收人',
        phoneLabel: '签收人手机号',
        checkTitle: '签收核对',
        materialTitle: '签收物料',
        uploadNote: '签收现场照片',
        uploadHint: '用于记录交付现场、签收人确认或异常情况',
        submitLabel: '确认签收',
        success: '已确认用户签收，送货单进入待仓管确认费用，下一步由仓管确认费用。',
        remarkPlaceholder: '填写签收说明、异常情况、客户反馈或后续对账备注'
      }
    : isTransportMode.value
    ? {
        title: '确认离厂',
        description: '物流人员完成装车后，核对物料、配件箱、车辆和物流单号并确认离厂。',
        primaryCardTitle: '离厂确认',
        primaryCardNote: '物流人员核对后提交',
        operatorLabel: '物流人员',
        phoneLabel: '物流人员手机号',
        checkTitle: '离厂核对',
        materialTitle: '离厂物料',
        uploadNote: '现场照片或装车照片',
        uploadHint: '用于记录物料、配件箱、车辆或装车现场',
        submitLabel: '确认离厂',
        success: '已确认离厂，任务进入运输中状态。',
        remarkPlaceholder: '填写装车说明、异常情况或运输补充信息'
      }
    : isAppointmentMode.value
    ? {
        title: '预约送货',
        description: '物流公司与收货人确认送货时间，登记预约结果并发送签收码。',
        primaryCardTitle: '送货预约',
        primaryCardNote: '物流人员预约后提交',
        operatorLabel: '预约收货人',
        phoneLabel: '收货人手机号',
        checkTitle: '预约核对',
        materialTitle: '预约送货物料',
        uploadNote: '预约凭证或沟通记录',
        uploadHint: '用于记录电话、短信、企微或客户确认截图',
        submitLabel: '预约送货',
        success: '已完成预约送货，任务进入待用户签收状态。',
        remarkPlaceholder: '填写预约时间、客户要求、异常情况或改约说明'
      }
    : {
        title: '交接装车',
        description: '仓管员与物流公司现场交接装车，核对货物、单据、提货人信息并留存附件。',
        primaryCardTitle: '现场交接',
        primaryCardNote: '仓管员核对后提交',
        operatorLabel: '提货人',
        phoneLabel: '提货人手机号',
        checkTitle: '交接核对',
        materialTitle: '交接物料',
        uploadNote: '现场照片或装车照片',
        uploadHint: '用于记录货物交接现场、车辆或封签状态',
        submitLabel: '交接装车',
        success: '已完成交接装车，任务进入装车离厂节点。',
        remarkPlaceholder: '填写异常说明、交接补充信息或物流要求'
      }
)

const checks = computed(() =>
  isSignMode.value
    ? []
    : isAppointmentMode.value
    ? [
        { key: 'contact', label: '已与收货人确认送货时间' },
        { key: 'phone', label: '收货人手机号已核对无误' }
      ]
    : isTransportMode.value
    ? [
        { key: 'materials', label: '物料明细已与交货单核对一致' },
        { key: 'boxes', label: '配件箱数量、箱码、封签已核对无误' },
        { key: 'vehicle', label: '车辆信息与物流公司派车信息一致' },
        { key: 'photo', label: '已拍照留存物料或装车现场照片' }
      ]
    : [
        { key: 'carrier', label: '承运公司与提货人身份已核对' },
        { key: 'boxes', label: '配件箱数、箱码、封签完整无破损' },
        { key: 'docs', label: '交货单、交接单随货资料齐全' },
        { key: 'photo', label: '已拍照留存交接现场或装车照片' }
      ]
)

const checkedKeys = ref(new Set(['materials', 'carrier', 'boxes', 'docs', 'vehicle']))
const checkedCount = computed(() => checks.value.filter((item) => checkedKeys.value.has(item.key)).length)
const normalizedWaybillNos = computed(() => waybillNos.value.map((item) => item.trim()).filter(Boolean))
const hasBaseRequiredFields = computed(() => {
  return handoverTime.value && (isSignMode.value || warehouseKeeper.value.trim()) && logisticsStaff.value.trim() && staffPhone.value.trim()
})
const canConfirm = computed(() => {
  if (isSignMode.value) return handoverTime.value && logisticsStaff.value.trim() && staffPhone.value.trim() && signCode.value.trim()
  if (isAppointmentMode.value) return checkedCount.value === checks.value.length && hasBaseRequiredFields.value
  return (
    checkedCount.value === checks.value.length &&
    hasBaseRequiredFields.value &&
    vehicleNo.value.trim() &&
    (!isTransportMode.value || normalizedWaybillNos.value.length > 0)
  )
})

watchEffect(() => {
  if (!isSignMode.value || !task.value) return

  handoverTime.value = task.value.signedAt || handoverTime.value
  logisticsStaff.value = task.value.receiver || ''
  staffPhone.value = task.value.phone || ''
})

function isChecked(key) {
  return checkedKeys.value.has(key)
}

function toggleCheck(key, checked) {
  const next = new Set(checkedKeys.value)
  if (checked) next.add(key)
  else next.delete(key)
  checkedKeys.value = next
}

function handleAttachmentChange(event) {
  const [file] = event.target.files || []
  attachmentName.value = file?.name || ''
  if (file) toggleCheck('photo', true)
}

function addWaybillNo() {
  waybillNos.value = [...waybillNos.value, '']
}

function removeWaybillNo(index) {
  if (waybillNos.value.length === 1) {
    waybillNos.value = ['']
    return
  }
  waybillNos.value = waybillNos.value.filter((_, itemIndex) => itemIndex !== index)
}

function confirmAction() {
  actionNotice.value = ''
  if (isSignMode.value && !signCode.value.trim()) {
    actionNotice.value = '请先录入签收人提供的签收码。'
    return
  }
  if (isTransportMode.value && normalizedWaybillNos.value.length === 0) {
    actionNotice.value = '请至少录入一个物流单号。'
    return
  }
  if (!canConfirm.value) return
  confirmed.value = true
}
</script>

<template>
  <section class="page pickup-handover-page">
    <Teleport to=".topbar-actions">
      <button class="btn primary" type="button" :disabled="!isSignMode && !canConfirm" @click="confirmAction">{{ pageCopy.submitLabel }}</button>
    </Teleport>

    <div class="section-head">
      <div>
        <h1>{{ pageCopy.title }}</h1>
        <p>{{ pageCopy.description }}</p>
      </div>
    </div>

    <section class="panel pickup-confirm-panel pickup-redesign">
      <header class="pickup-ticket-head">
        <div>
          <span class="label">交货单号</span>
          <strong>{{ task.no }}</strong>
        </div>
        <div>
          <span class="label">收货单位</span>
          <strong>{{ task.receiverCompany }}</strong>
        </div>
        <div>
          <span class="label">承运公司</span>
          <strong>{{ task.carrier }}</strong>
        </div>
        <div v-if="!isSignMode" class="pickup-progress-pill">
          <span>{{ checkedCount }} / {{ checks.length }}</span>
          <small>核对完成</small>
        </div>
      </header>

      <div class="pickup-workbench-grid">
        <section class="pickup-card primary-card">
          <div class="card-heading">
            <h2>{{ pageCopy.primaryCardTitle }}</h2>
            <span>{{ pageCopy.primaryCardNote }}</span>
          </div>
          <div class="handover-form">
            <label>
              <span>{{ isSignMode ? '签收时间' : isTransportMode ? '离厂时间' : isAppointmentMode ? '预约送货时间' : '交接时间' }}</span>
              <input v-model="handoverTime" class="field" type="datetime-local" :readonly="isSignMode" required />
            </label>
            <label v-if="!isSignMode">
              <span>{{ isAppointmentMode ? '物流人员' : '仓管员' }}</span>
              <input v-model="warehouseKeeper" class="field" type="text" required />
            </label>
            <label>
              <span>{{ pageCopy.operatorLabel }}</span>
              <input v-model="logisticsStaff" class="field" type="text" :readonly="isSignMode" required />
            </label>
            <label>
              <span>{{ pageCopy.phoneLabel }}</span>
              <input v-model="staffPhone" class="field" type="tel" :readonly="isSignMode" required />
            </label>
            <label v-if="!isSignMode && !isAppointmentMode" class="wide">
              <span>车牌号</span>
              <input v-model="vehicleNo" class="field plate-input" type="text" required />
            </label>
            <div v-if="isTransportMode" class="waybill-list wide">
              <div class="waybill-list-head">
                <span>物流单号</span>
                <button class="btn ghost mini-btn" type="button" @click="addWaybillNo">添加单号</button>
              </div>
              <div v-for="(_, index) in waybillNos" :key="index" class="waybill-input-row">
                <input v-model="waybillNos[index]" class="field plate-input" type="text" :placeholder="`请输入第 ${index + 1} 个物流单号`" />
                <button class="btn ghost icon-btn" type="button" aria-label="删除物流单号" @click="removeWaybillNo(index)">x</button>
              </div>
            </div>
            <label v-if="isSignMode" class="wide">
              <span>签收码</span>
              <input v-model="signCode" class="field plate-input" type="text" placeholder="请输入签收人提供的签收码" required />
            </label>
            <label class="wide">
              <span>备注</span>
              <textarea v-model="remark" class="field remark-field" :placeholder="pageCopy.remarkPlaceholder"></textarea>
            </label>
          </div>
        </section>

        <section v-if="!isSignMode" class="pickup-card">
          <div class="card-heading">
            <h2>{{ pageCopy.checkTitle }}</h2>
            <span>逐项确认无误</span>
          </div>
          <div class="pickup-check-list">
            <label v-for="item in checks" :key="item.key" class="pickup-check-item">
              <input :checked="isChecked(item.key)" type="checkbox" @change="toggleCheck(item.key, $event.target.checked)" />
              <span>{{ item.label }}</span>
            </label>
          </div>
          <div class="handover-stats">
            <div>
              <span>物料</span>
              <strong>{{ task.progress.done }} / {{ task.progress.total }}</strong>
            </div>
            <div>
              <span>配件箱数</span>
              <strong>{{ task.boxes.sealed }} / {{ task.boxes.total }}</strong>
            </div>
          </div>
        </section>

        <section class="pickup-card">
          <div class="card-heading">
            <h2>附件留存</h2>
            <span>{{ pageCopy.uploadNote }}</span>
          </div>
          <label class="photo-upload-zone">
            <input type="file" accept="image/*" capture="environment" @change="handleAttachmentChange" />
            <span class="upload-icon">+</span>
            <strong>{{ attachmentName || '拍照 / 上传附件' }}</strong>
            <small>{{ pageCopy.uploadHint }}</small>
          </label>
        </section>
      </div>

      <section class="pickup-card material-card">
        <div class="card-heading">
          <h2>{{ pageCopy.materialTitle }}</h2>
          <span>来自拣配、抽检、封箱记录</span>
        </div>
        <div class="table-scroll compact-materials">
          <table class="qc-table">
            <thead>
              <tr>
                <th>物料编码</th>
                <th>名称</th>
                <th>箱码</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in materials" :key="item.code">
                <td>{{ item.code }}</td>
                <td>{{ item.name }}</td>
                <td>{{ item.box }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div class="departure-actions">
        <span v-if="actionNotice" class="notice warn">{{ actionNotice }}</span>
        <span v-if="confirmed" class="notice success">{{ pageCopy.success }}</span>
      </div>
    </section>
  </section>
</template>
