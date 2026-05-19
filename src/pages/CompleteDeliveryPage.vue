<script setup>
defineEmits(['back-to-workbench'])

const deliveryMethods = ['配送', '车辆出货', '工程出货', '快递', '自提']
const settlementMethods = ['月结', '现付']

const materialRows = [
  { code: '', description: '', unit: '', actualQty: '', pieces: '', price: '', total: '', remark: '' }
]

const expenseFields = [
  '中转费',
  '运费',
  '送货费',
  '其他费用',
  '费用变更',
  '该单合计总费用',
  '备注'
]
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
            <input class="sheet-input" type="text" />
            <input class="sheet-input" type="text" />
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
            <span>文件说明</span>
            <textarea class="sheet-input"></textarea>
          </label>
        </div>

        <div class="basic-right">
          <label class="form-line">
            <span>单据号</span>
            <input class="sheet-input" type="text" />
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
          <div class="form-line read-line two-cols">
            <span>状态</span>
            <strong>草稿</strong>
            <span>类型</span>
            <strong>手工单</strong>
          </div>
        </div>
      </section>

      <section class="material-import">
        <div class="import-toolbar">
          <strong>模板导入物料清单</strong>
          <input class="file-picker" type="file" />
          <button class="btn" type="button">上传</button>
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
        <label v-for="field in expenseFields" :key="field" class="expense-cell">
          <span>{{ field }}</span>
          <input class="sheet-input" type="text" />
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
          <label><span>实际收货人/电话</span><input class="sheet-input" type="text" /></label>
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
  </section>
</template>
