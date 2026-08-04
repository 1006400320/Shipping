<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { boxes, materials } from '../data/logistics'

const packingListOpen = ref(false)

function toShortBoxNo(boxNo) {
  const match = boxNo.match(/^BOX-\d{8}-(\d+)$/)
  return match ? `BOX-${match[1]}` : boxNo
}

const expandedBoxes = ref(new Set([toShortBoxNo('BOX-20260518-003')]))

const packingListInfo = {
  remark: '封箱前核对箱内物料，贴单后交由物流发运。',
  deliveryNo: '81113003',
  salesNo: '10337400',
  receiverCompany: '东莞市塘厦镇骏景高尔夫花园第二',
  route: '北京 → 深圳',
  receiver: '张*三',
  address: '北京市朝阳区项目仓 → 广东省深圳市南山区科技园'
}

const packRows = ref(
  materials.map((item) => ({
    code: item.code,
    name: item.name,
    planned: item.planned,
    packed: item.packed,
    unit: '个',
    box: item.box,
    status: item.packed >= item.planned ? '完成' : '待补扫',
    tone: item.packed >= item.planned ? 'ok' : 'warn',
    lastScan: item.packed >= item.planned ? '10:41:55' : '-'
  }))
)

const totalPacked = computed(() => packRows.value.reduce((sum, item) => sum + item.packed, 0))
const boxRows = computed(() =>
  boxes.map((box) => {
    const items = packRows.value.filter((item) => toShortBoxNo(item.box) === box.no)
    const planned = items.reduce((sum, item) => sum + item.planned, 0)
    const packed = items.reduce((sum, item) => sum + item.packed, 0)
    return {
      ...box,
      items,
      planned,
      packed,
      expanded: expandedBoxes.value.has(box.no),
      statusTone: packed >= planned ? 'ok' : 'warn',
      status: packed >= planned ? '已打印封箱' : '待打印封箱',
      printTime: items.reduce((latest, item) => (item.lastScan > latest ? item.lastScan : latest), '-'),
      printer: box.operator || '-'
    }
  })
)

function toggleBox(boxNo) {
  const next = new Set(expandedBoxes.value)
  if (next.has(boxNo)) {
    next.delete(boxNo)
  } else {
    next.add(boxNo)
  }
  expandedBoxes.value = next
}

function openPackingList() {
  packingListOpen.value = true
}

function closePackingList() {
  packingListOpen.value = false
  document.body.classList.remove('printing-delivery')
}

function printPackingList() {
  document.body.classList.add('printing-delivery')
  nextTick(() => window.print())
}

function handleAfterPrint() {
  document.body.classList.remove('printing-delivery')
}

onMounted(() => {
  window.addEventListener('afterprint', handleAfterPrint)
})

onBeforeUnmount(() => {
  window.removeEventListener('afterprint', handleAfterPrint)
  document.body.classList.remove('printing-delivery')
})
</script>

<template>
  <section class="content">
    <section class="workspace pack-workspace">
      <div class="left-column">
        <section class="panel material-panel">
          <div class="section-head">
            <div class="section-title">配件箱明细</div>
          </div>
          <div class="table-wrap">
            <table class="pack-table">
              <thead>
                <tr>
                  <th>配件箱</th>
                  <th>计划</th>
                  <th>已装箱</th>
                  <th>打印时间</th>
                  <th>打印人</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="box in boxRows" :key="box.no">
                  <tr class="box-summary-row" @click="toggleBox(box.no)">
                    <td>
                      <button class="box-toggle" type="button" :aria-expanded="box.expanded">
                        <span class="box-toggle-icon" aria-hidden="true">{{ box.expanded ? '−' : '+' }}</span>
                        <span>{{ box.no }}</span>
                      </button>
                    </td>
                    <td class="qty">{{ box.planned }}</td>
                    <td class="qty">{{ box.packed }}</td>
                    <td>{{ box.printTime }}</td>
                    <td>{{ box.printer }}</td>
                    <td :class="box.statusTone">{{ box.status }}</td>
                    <td>
                      <button class="table-action-btn" type="button" @click.stop="openPackingList">打印封箱</button>
                    </td>
                  </tr>
                  <tr v-if="box.expanded" class="box-detail-row">
                    <td colspan="7">
                      <table class="box-material-table" :aria-label="`${box.no} 箱内物料`">
                        <thead>
                          <tr>
                            <th>物料编码</th>
                            <th>名称</th>
                            <th>计划</th>
                            <th>已装箱</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="item in box.items" :key="`${box.no}-${item.code}`">
                            <td class="link-cell">{{ item.code }}</td>
                            <td>{{ item.name }}</td>
                            <td class="qty">{{ item.planned }}</td>
                            <td class="qty">{{ item.packed }}</td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>

    <div v-if="packingListOpen" class="print-dialog-backdrop" @click.self="closePackingList">
      <section class="print-dialog packing-list-dialog" role="dialog" aria-modal="true" aria-label="装箱清单">
        <div class="print-dialog-toolbar">
          <strong>装箱清单</strong>
          <div class="print-dialog-actions">
            <button class="btn primary" type="button" @click="printPackingList">打印</button>
            <button class="btn" type="button" @click="closePackingList">关闭</button>
          </div>
        </div>
        <div class="print-preview-scroll">
          <div class="delivery-print-page packing-list-sheet">
            <table class="packing-excel-table">
              <thead>
                <tr>
                  <th colspan="5" class="packing-company">深圳市捷顺科技实业股份有限公司</th>
                </tr>
                <tr>
                  <th colspan="5" class="packing-doc-title">装箱清单</th>
                </tr>
                <tr>
                  <th colspan="2" class="packing-meta">销售单号：{{ packingListInfo.salesNo }}</th>
                  <th class="packing-meta">交货单号：{{ packingListInfo.deliveryNo }}</th>
                  <th colspan="2" class="packing-meta">收货单位：{{ packingListInfo.receiverCompany }}</th>
                </tr>
                <tr>
                  <th class="packing-index-col">序号</th>
                  <th class="packing-code-col">物料号</th>
                  <th class="packing-name-col">物料名称</th>
                  <th class="packing-unit-col">单位</th>
                  <th class="packing-qty-col">数量</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in packRows" :key="item.code">
                  <td>{{ index + 1 }}</td>
                  <td>{{ item.code }}</td>
                  <td class="print-text-left">{{ item.name }}</td>
                  <td>{{ item.unit }}</td>
                  <td>{{ item.packed }}</td>
                </tr>
                <tr class="packing-total-row">
                  <td colspan="4">合计</td>
                  <td>{{ totalPacked }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  </section>
</template>
