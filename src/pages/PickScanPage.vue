<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { freightConfigs, materials, packageBoxConfigs, shipmentTasks } from '../data/logistics'

const props = defineProps({
  taskNo: {
    type: String,
    default: ''
  }
})
const emit = defineEmits(['pick-confirm-state'])

const scanInput = ref(null)
const accessoryMaterialInput = ref(null)
const scanCode = ref('65002008')
const accessoryMaterialScanCode = ref('65002008')
const selectedAccessoryBoxCode = ref('PJX-2604030003-01')
const expandedAccessoryBoxCodes = ref(['PJX-2604030003-01'])
const latestMessage = ref('当前发货单待拣 5 件，等待扫码枪输入物料编码二维码。')
const latestMessageType = ref('neutral')
const exceptionCount = ref(0)
const pickConfirmed = ref(false)
const freightTooltip = ref({
  visible: false,
  text: '',
  x: 0,
  y: 0,
  placement: 'top'
})
const operator = '陈强'
const deviceNo = 'SCAN-03'
const DEFAULT_VOLUME_FEE = 258
const DEFAULT_WEIGHT_FEE = 0.71
const DEFAULT_WEIGHT_RATIO = 4000

const materialMetaMap = new Map(
  materials.map((item) => [
    item.code,
    {
      weightKg: item.weightKg ?? null,
      dimensionsMm:
        [item.lengthMm, item.widthMm, item.heightMm].every((value) => Number.isFinite(Number(value)) && Number(value) > 0)
          ? `${item.lengthMm}*${item.widthMm}*${item.heightMm}`
          : '-'
    }
  ])
)

const activeFreightRule = computed(() => freightConfigs.find((item) => Number(item.volumeFee) === DEFAULT_VOLUME_FEE) || {})
const volumeFreightUnitPrice = computed(() => Number(activeFreightRule.value.volumeFee) || DEFAULT_VOLUME_FEE)
const weightFreightUnitPrice = computed(() => Number(activeFreightRule.value.weightFee) || DEFAULT_WEIGHT_FEE)
const carrierWeightRatio = computed(() => DEFAULT_WEIGHT_RATIO)

const pickRows = ref([
  {
    code: '65001001',
    sku: 'SKU-GATE-PCB',
    name: '通道闸机主控板',
    location: 'A-01-03',
    planned: 4,
    picked: 4,
    box: 'BOX-001',
    requiresAccessoryBox: false,
    lastScan: '10:18:22',
    weightKg: 10,
    dimensionsMm: '1515*250*240',
    ...materialMetaMap.get('65001001')
  },
  {
    code: '65002008',
    sku: 'SKU-GATE-SHELL',
    name: '闸机壳体组件',
    location: 'A-02-01',
    planned: 6,
    picked: 5,
    box: 'BOX-002',
    requiresAccessoryBox: true,
    lastScan: '10:20:41',
    weightKg: 11,
    dimensionsMm: '1515*250*260',
    ...materialMetaMap.get('65002008')
  },
  {
    code: '65003002',
    sku: 'SKU-LARGE-COLUMN',
    name: '大件立柱组件',
    location: 'B-04-02',
    planned: 8,
    picked: 6,
    box: 'BOX-003',
    requiresAccessoryBox: true,
    lastScan: '10:21:13',
    weightKg: 18,
    dimensionsMm: '1515*250*480',
    ...materialMetaMap.get('65003002')
  },
  {
    code: '65004018',
    sku: 'SKU-COUNTERWEIGHT-BLOCK',
    name: '闸机配重块',
    location: 'B-04-05',
    planned: 1,
    picked: 0,
    box: 'BOX-004',
    requiresAccessoryBox: false,
    lastScan: '',
    weightKg: 65,
    dimensionsMm: '600*400*300',
    ...materialMetaMap.get('65004018')
  },
  {
    code: '65000099',
    sku: 'SKU-CABLE-KIT',
    name: '线缆包',
    location: 'C-01-08',
    planned: 2,
    picked: 1,
    box: 'BOX-003',
    requiresAccessoryBox: true,
    lastScan: '10:21:58',
    weightKg: 0.38,
    dimensionsMm: '430*180*90',
    ...materialMetaMap.get('65000099')
  }
])

const accessoryBoxes = ref([
  {
    code: 'PJX-2604030003-01',
    boxConfigId: 'BOXCFG-004',
    name: '配件箱-闸机线材',
    materials: [
      { code: '65000099', name: '线缆包', qty: 1, scannedAt: '10:13:08' },
      { code: '65002008', name: '闸机壳体组件', qty: 1, scannedAt: '10:13:42' }
    ],
    status: '已添加',
    createdAt: '10:12:30',
    printedAt: '10:14:02'
  },
  {
    code: 'PJX-2604030003-02',
    boxConfigId: 'BOXCFG-002',
    name: '配件箱-安装附件',
    materials: [{ code: '65003002', name: '大件立柱组件', qty: 1, scannedAt: '10:20:16' }],
    status: '已添加',
    createdAt: '10:19:45',
    printedAt: ''
  }
])

const selectedTask = computed(() => {
  return shipmentTasks.find((task) => task.no === props.taskNo) || shipmentTasks.find((task) => task.no === '2604030003')
})
const shipmentNo = computed(() => selectedTask.value?.no || '2604030003')
const customer = computed(() => selectedTask.value?.receiverCompany || selectedTask.value?.customer || '惠州市荣实物业管理有限公司')
const totalPlanned = computed(() => pickRows.value.reduce((sum, item) => sum + item.planned, 0))
const totalPicked = computed(() => pickRows.value.reduce((sum, item) => sum + item.picked, 0))
const missingCount = computed(() => Math.max(totalPlanned.value - totalPicked.value, 0))
const accessoryRequiredCount = computed(() => pickRows.value.filter((item) => item.requiresAccessoryBox).length)
const accessoryLinkedCount = computed(
  () =>
    pickRows.value.filter(
      (item) =>
        item.requiresAccessoryBox &&
        accessoryBoxes.value.some((box) => box.materials.some((material) => material.code === item.code || material.code === item.sku))
    ).length
)
const progressPercent = computed(() => Math.round((totalPicked.value / totalPlanned.value) * 100))
const pendingRows = computed(() => pickRows.value.filter((item) => item.picked < item.planned))
const readyForQc = computed(() => missingCount.value === 0)
const nextStep = computed(() => (readyForQc.value ? '进入扫码抽检' : `补拣 ${missingCount.value} 件物料`))
const canConfirmPick = computed(() => readyForQc.value && !pickConfirmed.value)
const accessoryBoxCount = computed(() => accessoryBoxes.value.length)
const selectedAccessoryBox = computed(() => {
  return accessoryBoxes.value.find((box) => box.code === selectedAccessoryBoxCode.value) || accessoryBoxes.value[0]
})
const accessoryRelationRows = computed(() => {
  return accessoryBoxes.value.flatMap((box) =>
    box.materials.map((material) => ({
      ...material,
      boxCode: box.code,
      boxName: box.name
    }))
  )
})
const stats = computed(() => [
  { label: '应拣数量', value: totalPlanned.value },
  { label: '已拣数量', value: totalPicked.value, tone: readyForQc.value ? 'success' : '' },
  { label: '缺失数量', value: missingCount.value, tone: missingCount.value ? 'warn' : 'success' },
  { label: '配件箱关联', value: `${accessoryLinkedCount.value}/${accessoryRequiredCount.value}`, tone: accessoryLinkedCount.value === accessoryRequiredCount.value ? 'success' : 'warn' }
])
const timeline = ref([
  { time: '10:21:58', title: '物料拣配成功', note: '65000099 已拣 1/2，设备 SCAN-03', tone: 'success' },
  { time: '10:21:13', title: '物料拣配成功', note: '65003002 已拣 6/8，设备 SCAN-03', tone: 'success' },
  { time: '10:20:41', title: '物料拣配成功', note: '65002008 已拣 5/6，设备 SCAN-03', tone: 'success' },
  { time: '10:16:09', title: '拣配任务开始', note: '包管员陈强，应拣 20 件', tone: 'success' }
])

function formatWeight(value) {
  return Number.isFinite(Number(value)) ? `${Number(value).toFixed(2).replace(/\.00$/, '')} KG` : '-'
}

function formatDimensions(item) {
  return item.dimensionsMm || '-'
}

function parseDimensionsMm(dimensions) {
  const values = String(dimensions || '')
    .split('*')
    .map((value) => Number(value.trim()))

  if (values.length !== 3 || values.some((value) => !Number.isFinite(value) || value <= 0)) {
    return null
  }

  return values
}

function calculateVolumeCbmFromMm(dimensions) {
  const values = parseDimensionsMm(dimensions)
  if (!values) return Number.NaN

  return values.reduce((total, value) => total * value, 1) / 1000000000
}

function calculateVolumeWeightKg(item) {
  const values = parseDimensionsMm(item.dimensionsMm)
  if (!values) return Number.NaN

  const cubicCentimeters = values.reduce((total, value) => total * value, 1) / 1000
  return cubicCentimeters / carrierWeightRatio.value
}

function getMaterialFreightInfo(item) {
  const weightKg = Number(item.weightKg)
  const volumeCbm = calculateVolumeCbmFromMm(item.dimensionsMm)
  const volumeWeightKg = calculateVolumeWeightKg(item)

  if (!Number.isFinite(volumeCbm) || !Number.isFinite(weightKg)) {
    return { volumeCbm, volumeWeightKg, chargeType: '-', amount: Number.NaN }
  }

  if (volumeWeightKg > weightKg) {
    return {
      volumeCbm,
      volumeWeightKg,
      chargeType: '体积',
      amount: volumeCbm * volumeFreightUnitPrice.value
    }
  }

  return {
    volumeCbm,
    volumeWeightKg,
    chargeType: '重量',
    amount: weightKg * weightFreightUnitPrice.value
  }
}

function getAccessoryBoxFreightInfo(box) {
  const config = packageBoxConfigs.find((item) => item.id === box.boxConfigId)
  const volumeCbm = Number(config?.volume)

  return {
    volumeCbm,
    chargeType: '体积',
    amount: Number.isFinite(volumeCbm) ? volumeCbm * volumeFreightUnitPrice.value : Number.NaN
  }
}

function formatVolume(value) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(2).replace(/\.00$/, '') : '-'
}

function formatMoney(value) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(2) : '-'
}

function formatMaterialFreight(item) {
  const info = getMaterialFreightInfo(item)
  if (!Number.isFinite(info.amount)) return '-'

  return formatMoney(info.amount)
}

function getMaterialFreightTooltip(item) {
  const info = getMaterialFreightInfo(item)
  const weightKg = Number(item.weightKg)

  if (!Number.isFinite(info.amount)) return '缺少重量或尺寸，无法计算运费。'

  if (info.chargeType === '体积') {
    return `1. 计算体积重量\n体积重量 = 长 × 宽 × 高 ÷ 重抛比 = ${formatVolume(info.volumeCbm)}m³ ÷ ${carrierWeightRatio.value}kg/m³ = ${formatMoney(info.volumeWeightKg)}kg\n\n2. 判断货物类型\n${formatMoney(info.volumeWeightKg)}kg > ${formatMoney(weightKg)}kg，该物料为抛货，按体积计费。\n\n3. 计算运费\n运费 = 体积 × 体积计费单价 = ${formatVolume(info.volumeCbm)} × ${formatMoney(volumeFreightUnitPrice.value)} = ${formatMoney(info.amount)}元`
  }

  return `1. 计算体积重量\n体积重量 = 长 × 宽 × 高 ÷ 重抛比 = ${formatVolume(info.volumeCbm)}m³ ÷ ${carrierWeightRatio.value}kg/m³ = ${formatMoney(info.volumeWeightKg)}kg\n\n2. 判断货物类型\n${formatMoney(info.volumeWeightKg)}kg <= ${formatMoney(weightKg)}kg，该物料为重货，按重量计费。\n\n3. 计算运费\n运费 = 重量 × 重量计费单价 = ${formatMoney(weightKg)} × ${formatMoney(weightFreightUnitPrice.value)} = ${formatMoney(info.amount)}元`
}

function formatAccessoryBoxFreight(box) {
  const info = getAccessoryBoxFreightInfo(box)
  if (!Number.isFinite(info.amount)) return '-'

  return `${formatMoney(info.amount)}`
}

function getAccessoryBoxFreightTooltip(box) {
  const info = getAccessoryBoxFreightInfo(box)
  if (!Number.isFinite(info.amount)) return '缺少配件箱体积，无法计算运费。'

  return `配件箱按体积计费。\n运费 = 体积 × 体积计费单价 = ${formatVolume(info.volumeCbm)} × ${formatMoney(volumeFreightUnitPrice.value)} = ${formatMoney(info.amount)}元`
}

function formatTime(date = new Date()) {
  return date.toLocaleTimeString('zh-CN', { hour12: false })
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

function normalizeScanCode(rawCode) {
  const value = rawCode.trim().toUpperCase()
  const parts = value.split(/[|,;\s]+/)
  return parts.find((part) => /^65\d{6}$/.test(part)) || parts.find((part) => /^SKU-[A-Z0-9-]+$/.test(part)) || value
}

function getAccessoryBoxCode(item) {
  return accessoryRelationRows.value.find((relation) => relation.code === item.code || relation.code === item.sku)?.boxCode || ''
}

function getAccessoryDisplay(item) {
  if (!item.requiresAccessoryBox) return '无需关联'
  return getAccessoryBoxCode(item) || '待关联'
}

function rowTone(item) {
  if (item.picked >= item.planned) return 'ok'
  if (item.picked === 0) return 'danger'
  return 'warn'
}

function rowStatus(item) {
  if (item.picked >= item.planned) return '已拣齐'
  if (item.picked === 0) return '未拣'
  return '待补拣'
}

function addTimeline(title, note, tone = 'success') {
  timeline.value.unshift({
    time: formatTime(),
    title,
    note,
    tone
  })
}

function failScan(code, reason) {
  exceptionCount.value += 1
  latestMessage.value = `扫码异常：${code} ${reason}`
  latestMessageType.value = 'danger'
  addTimeline('拣配扫码失败', `${code} ${reason}，设备 ${deviceNo}`, 'danger')
}

function isAccessoryBoxExpanded(code) {
  return expandedAccessoryBoxCodes.value.includes(code)
}

function toggleAccessoryBox(box) {
  selectedAccessoryBoxCode.value = box.code
  if (isAccessoryBoxExpanded(box.code)) {
    expandedAccessoryBoxCodes.value = expandedAccessoryBoxCodes.value.filter((item) => item !== box.code)
  } else {
    expandedAccessoryBoxCodes.value = [...expandedAccessoryBoxCodes.value, box.code]
  }
}

function selectAccessoryBoxForMaterial(box) {
  selectedAccessoryBoxCode.value = box.code
  if (!isAccessoryBoxExpanded(box.code)) {
    expandedAccessoryBoxCodes.value = [...expandedAccessoryBoxCodes.value, box.code]
  }
  nextTick(() => accessoryMaterialInput.value?.select())
}

function bindMaterialToAccessoryBox(code) {
  const box = selectedAccessoryBox.value
  if (!box) {
    failScan(code, '请先选择配件箱。')
    return
  }

  const item = pickRows.value.find((row) => row.code === code || row.sku === code)
  if (!/^65\d{6}$/.test(code) && !/^SKU-[A-Z0-9-]+$/.test(code)) {
    failScan(code, '不是有效物料条形码。')
    return
  }
  if (!item) {
    failScan(code, '不属于当前发货单，不能装入配件箱。')
    return
  }
  if (!item.requiresAccessoryBox) {
    failScan(code, '普通物料无需关联配件箱。')
    return
  }

  const boundBox = accessoryBoxes.value.find((entry) =>
    entry.materials.some((material) => material.code === item.code || material.code === item.sku)
  )
  if (boundBox && boundBox.code !== box.code) {
    failScan(code, `${boundBox.code} 已绑定，禁止跨配件箱重复关联。`)
    return
  }

  const existingMaterial = box.materials.find((material) => material.code === item.code)
  if (existingMaterial) {
    if (existingMaterial.qty >= item.planned) {
      failScan(code, `已达到计划数量 ${item.planned}，禁止重复装箱。`)
      return
    }
    existingMaterial.qty += 1
    existingMaterial.scannedAt = formatTime()
  } else {
    box.materials.push({
      code: item.code,
      name: item.name,
      qty: 1,
      scannedAt: formatTime()
    })
  }

  latestMessage.value = `关联成功：${item.code} 已装入配件箱 ${box.code}。`
  latestMessageType.value = 'success'
  addTimeline('配件箱物料关联', `${item.code} -> ${box.code}，设备 ${deviceNo}`)
}

function unbindMaterialFromAccessoryBox(box, material) {
  const existingMaterial = box.materials.find((item) => item.code === material.code)
  if (!existingMaterial) return

  if (existingMaterial.qty > 1) {
    existingMaterial.qty -= 1
    existingMaterial.scannedAt = formatTime()
  } else {
    box.materials = box.materials.filter((item) => item.code !== material.code)
  }

  latestMessage.value = `已取消关联：${material.code} 已从配件箱 ${box.code} 移除。`
  latestMessageType.value = 'neutral'
  addTimeline('配件箱物料取消关联', `${material.code} 已从 ${box.code} 移除，操作员 ${operator}`, 'success')
}

function scanAccessoryMaterial() {
  const rawCode = accessoryMaterialScanCode.value.trim()
  if (!rawCode) {
    latestMessage.value = '物料码为空，请先扫描物料条形码。'
    latestMessageType.value = 'danger'
    return
  }
  if (!selectedAccessoryBox.value) {
    latestMessage.value = '请先选择配件箱，再扫描配件物料。'
    latestMessageType.value = 'danger'
    return
  }
  bindMaterialToAccessoryBox(normalizeScanCode(rawCode))
  nextTick(() => {
    accessoryMaterialScanCode.value = ''
    accessoryMaterialInput.value?.select()
  })
}

function confirmPickComplete() {
  if (!readyForQc.value) {
    latestMessage.value = `仍缺 ${missingCount.value} 件物料，不能最终确认。`
    latestMessageType.value = 'danger'
    return
  }
  pickConfirmed.value = true
  latestMessage.value = `${shipmentNo.value} 已最终确认拣配完成，可进入扫码抽检。`
  latestMessageType.value = 'success'
  addTimeline('拣配最终确认', `${operator} 确认 ${shipmentNo.value} 已拣齐 ${totalPlanned.value} 件`, 'success')
}

function createAccessoryBox() {
  const nextNo = String(accessoryBoxCount.value + 1).padStart(2, '0')
  const code = `PJX-${shipmentNo.value}-${nextNo}`
  const box = {
    code,
    boxConfigId: 'BOXCFG-004',
    name: `配件箱-${accessoryBoxCount.value + 1}`,
    materials: [],
    status: '已添加',
    createdAt: formatTime(),
    printedAt: ''
  }
  accessoryBoxes.value.unshift(box)
  selectAccessoryBoxForMaterial(box)
  latestMessage.value = `配件箱添加成功：${code}，只需关联配件物料。`
  latestMessageType.value = 'success'
  addTimeline('配件箱添加成功', `${code} 已绑定到 ${shipmentNo.value}，设备 ${deviceNo}`)
}

function printAccessoryBarcode(box = selectedAccessoryBox.value) {
  if (!box) return
  selectedAccessoryBoxCode.value = box.code
  box.printedAt = formatTime()
  latestMessage.value = `配件箱条形码已送印：${box.code}。`
  latestMessageType.value = 'success'
  addTimeline('配件箱条形码打印', `${box.code} 已打印，操作员 ${operator}`)
  nextTick(() => window.print())
}

function submitScan() {
  const rawCode = scanCode.value.trim()
  if (!rawCode) {
    latestMessage.value = '扫码内容为空，请重新扫描。'
    latestMessageType.value = 'danger'
    scanInput.value?.focus()
    return
  }

  const code = normalizeScanCode(rawCode)
  const item = pickRows.value.find((row) => row.code === code || row.sku === code)
  if (!/^65\d{6}$/.test(code) && !/^SKU-[A-Z0-9-]+$/.test(code)) {
    failScan(code, '物料编码必须是 65 开头的 8 位数字。')
  } else if (!item) {
    failScan(code, '不属于当前发货单。')
  } else if (item.picked >= item.planned) {
    failScan(code, '已达到计划数量，禁止重复拣配。')
  } else {
    item.picked += 1
    item.lastScan = formatTime()
    const meta = materialMetaMap.get(item.code)
    if (meta) {
      item.weightKg = meta.weightKg
      item.dimensionsMm = meta.dimensionsMm
    }
    latestMessage.value = readyForQc.value
      ? `拣配完成：${shipmentNo.value} 已拣齐 ${totalPlanned.value} 件，可进入扫码抽检。`
      : `扫码成功：${item.code} 已拣 ${item.picked}/${item.planned}。`
    latestMessageType.value = 'success'
    addTimeline('物料拣配成功', `${item.code} 已拣 ${item.picked}/${item.planned}，设备 ${deviceNo}`)
  }

  nextTick(() => scanInput.value?.select())
}

onMounted(() => {
  scanInput.value?.focus()
  scanInput.value?.select()
})

watch(
  [canConfirmPick, pickConfirmed],
  () => {
    emit('pick-confirm-state', {
      disabled: !canConfirmPick.value,
      label: pickConfirmed.value ? '已确认拣配完成' : '最终确认拣配完成'
    })
  },
  { immediate: true }
)

defineExpose({
  confirmPickComplete
})
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
    <section class="workspace pick-workspace">
      <div class="left-column">
        <div class="body-grid">
          <section class="panel">
            <div class="section-head">
              <div class="section-title">扫码拣配作业台</div>
              <div class="section-extra">{{ deviceNo }} 在线</div>
            </div>
            <div class="scan-console">
              <div class="scan-input-wrap">
                <input ref="scanInput" v-model="scanCode" class="scan-input" aria-label="拣配扫码输入" @keyup.enter="submitScan" />
                <button class="scan-button" type="button" @click="submitScan">扫码确认</button>
              </div>
              <div class="progress-meter" aria-label="拣配进度">
                <span :style="{ width: progressPercent + '%' }"></span>
              </div>
              <div class="progress-row">
                <div v-for="stat in stats" :key="stat.label" class="mini-stat" :class="stat.tone">
                  <span>{{ stat.label }}</span>
                  <strong>{{ stat.value }}</strong>
                </div>
              </div>
              <div class="scan-alert" :class="latestMessageType">{{ latestMessage }}</div>
            </div>
          </section>

          <section class="panel">
            <div class="section-head">
              <div class="section-title">当前发货单</div>
              <div class="section-extra">{{ shipmentNo }}</div>
            </div>
            <div class="info-list">
              <div class="info-row"><span class="label">收货单位</span><span class="value">{{ customer }}</span></div>
              <div class="info-row"><span class="label">包管员</span><span class="value">{{ operator }}</span></div>
              <div class="info-row"><span class="label">当前状态</span><span class="value">拣配中</span></div>
              <div class="info-row"><span class="label">物料进度</span><span class="value">{{ totalPicked }} / {{ totalPlanned }}</span></div>
              <div class="info-row"><span class="label">下一步</span><span class="value">{{ nextStep }}</span></div>
            </div>
          </section>

          <section class="panel accessory-box-panel">
            <div class="section-head">
              <div class="section-title">配件箱</div>
              <div class="section-extra">仅配件物料需要关联，已添加 {{ accessoryBoxCount }} 个</div>
            </div>

            <div class="accessory-box-body">
              <form class="scan-input-wrap accessory-scan-wrap" @submit.prevent="scanAccessoryMaterial">
                <input
                  ref="accessoryMaterialInput"
                  v-model="accessoryMaterialScanCode"
                  class="scan-input accessory-scan-input"
                  aria-label="配件箱物料扫码输入"
                  placeholder="点击配件箱行的关联物料后，连续扫描配件物料码"
                  :disabled="!selectedAccessoryBox"
                />
                <button class="scan-button" type="submit" :disabled="!selectedAccessoryBox">关联配件物料</button>
              </form>

              <div class="accessory-actions">
                <button class="btn primary" type="button" @click="createAccessoryBox">新增配件箱</button>
              </div>

              <div class="accessory-box-list">
                <article
                  v-for="box in accessoryBoxes"
                  :key="box.code"
                  class="accessory-box-item"
                  :class="{ active: selectedAccessoryBoxCode === box.code }"
                >
                  <button class="accessory-box-main" type="button" @click="toggleAccessoryBox(box)">
                    <span>
                      <strong>{{ box.code }}</strong>
                      <em>{{ box.name }} / {{ box.materials.reduce((sum, item) => sum + item.qty, 0) }} 件配件物料</em>
                      <em>
                        体积 {{ formatVolume(getAccessoryBoxFreightInfo(box).volumeCbm) }} m³ / 体积计费 {{ formatAccessoryBoxFreight(box) }} 元
                        <span class="freight-help" tabindex="0" :title="getAccessoryBoxFreightTooltip(box)" :data-tooltip="getAccessoryBoxFreightTooltip(box)" aria-label="查看配件箱运费计算逻辑" @pointerenter="positionFreightTooltip" @mouseenter="positionFreightTooltip" @mouseleave="hideFreightTooltip" @focus="positionFreightTooltip" @blur="hideFreightTooltip">?</span>
                      </em>
                    </span>
                  </button>
                  <div class="accessory-box-row-actions">
                    <button class="btn accessory-print-btn" type="button" @click="printAccessoryBarcode(box)">
                      {{ box.printedAt ? '已打印' : '打印条形码' }}
                    </button>
                    <button class="btn primary" type="button" @click="selectAccessoryBoxForMaterial(box)">关联物料</button>
                    <button class="btn" type="button" @click="toggleAccessoryBox(box)">
                      {{ isAccessoryBoxExpanded(box.code) ? '收起' : '展开' }}
                    </button>
                  </div>
                  <div v-if="isAccessoryBoxExpanded(box.code)" class="accessory-material-list inline">
                    <div v-for="material in box.materials" :key="material.code" class="accessory-material-item">
                      <span>
                        <strong>{{ material.code }}</strong>
                        <em>{{ material.name }}</em>
                      </span>
                      <div class="accessory-material-actions">
                        <small>{{ material.qty }} 件 / {{ material.scannedAt }}</small>
                        <button class="btn danger" type="button" @click="unbindMaterialFromAccessoryBox(box, material)">取消关联</button>
                      </div>
                    </div>
                    <div v-if="!box.materials.length" class="accessory-empty">暂无配件物料，请点击关联物料后连续扫码</div>
                  </div>
                </article>
              </div>
            </div>
          </section>
        </div>

        <section class="panel material-panel">
          <div class="section-head">
            <div class="section-title">拣配清单</div>
            <div class="section-extra">普通物料无需关联配件箱</div>
          </div>
          <div class="table-wrap">
            <table class="pick-material-table">
              <thead>
                <tr>
                  <th>物料编码</th>
                  <th>名称</th>
                  <th>重量(KG)</th>
                  <th>大小(mm)</th>
                  <th>体积(m³)</th>
                  <th>
                    运费(元)
                    <span class="freight-help" tabindex="0" title="物料按体积重与实际重量比较，大者决定计费方式；配件箱直接按体积计费。" data-tooltip="物料按体积重与实际重量比较，大者决定计费方式；配件箱直接按体积计费。" aria-label="查看运费计算逻辑" @pointerenter="positionFreightTooltip" @mouseenter="positionFreightTooltip" @mouseleave="hideFreightTooltip" @focus="positionFreightTooltip" @blur="hideFreightTooltip">?</span>
                  </th>
                  <th>物料类型</th>
                  <th>应拣</th>
                  <th>已拣</th>
                  <th>缺失</th>
                  <th>配件箱</th>
                  <th>最近扫码</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in pickRows" :key="item.code">
                  <td class="link-cell">{{ item.code }}</td>
                  <td>{{ item.name }}</td>
                  <td>{{ formatWeight(item.weightKg) }}</td>
                  <td>{{ formatDimensions(item) }}</td>
                  <td>{{ formatVolume(getMaterialFreightInfo(item).volumeCbm) }}</td>
                  <td>
                    <span class="freight-cell">
                      {{ formatMaterialFreight(item) }}
                      <span class="freight-help" tabindex="0" :title="getMaterialFreightTooltip(item)" :data-tooltip="getMaterialFreightTooltip(item)" aria-label="查看物料运费计算逻辑" @pointerenter="positionFreightTooltip" @mouseenter="positionFreightTooltip" @mouseleave="hideFreightTooltip" @focus="positionFreightTooltip" @blur="hideFreightTooltip">?</span>
                    </span>
                  </td>
                  <td :class="item.requiresAccessoryBox ? 'warn' : 'ok'">{{ item.requiresAccessoryBox ? '配件物料' : '普通物料' }}</td>
                  <td class="qty">{{ item.planned }}</td>
                  <td class="qty">{{ item.picked }}</td>
                  <td class="qty">{{ Math.max(item.planned - item.picked, 0) }}</td>
                  <td :class="item.requiresAccessoryBox && !getAccessoryBoxCode(item) ? 'warn' : 'ok'">{{ getAccessoryDisplay(item) }}</td>
                  <td>{{ item.lastScan || '-' }}</td>
                  <td :class="rowTone(item)">{{ rowStatus(item) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <aside class="side-stack">
        <section class="panel">
          <div class="section-head">
            <div class="section-title">缺失物料</div>
            <div class="section-extra">{{ missingCount }} 件</div>
          </div>
          <div class="info-list pick-shortfall-list">
            <div v-for="item in pendingRows" :key="item.code" class="info-row">
              <span class="label">{{ item.code }}</span>
              <span class="value">{{ item.name }}，缺 {{ item.planned - item.picked }} 件</span>
            </div>
            <div v-if="pendingRows.length === 0" class="info-row">
              <span class="label">结果</span>
              <span class="value">已拣齐</span>
            </div>
          </div>
        </section>

        <section class="panel">
          <div class="section-head">
            <div class="section-title">扫码记录</div>
            <div class="section-extra">最近 6 条</div>
          </div>
          <div class="timeline">
            <div v-for="event in timeline.slice(0, 6)" :key="event.time + event.note" class="event">
              <div class="event-time">{{ event.time }}</div>
              <div>
                <div class="event-main" :class="event.tone">{{ event.title }}</div>
                <div class="event-note">{{ event.note }}</div>
              </div>
            </div>
          </div>
        </section>
      </aside>
    </section>
  </section>
</template>
