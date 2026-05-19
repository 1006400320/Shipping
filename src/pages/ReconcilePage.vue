<script setup>
import { feeItems } from '../data/logistics'
</script>

<template>
  <section class="content">
    <section class="page-grid">
      <article class="panel page-hero">
        <h1>对账核价</h1>
        <p class="subline">物流公司上传对账单后，财务核价；有改价时需要物流、工厂和总部财务确认。</p>
      </article>

      <article class="panel metric">
        <div class="metric-label">预估费用</div>
        <div class="metric-value">1,940.00</div>
        <div class="metric-note">人民币</div>
      </article>
      <article class="panel metric">
        <div class="metric-label">对账状态</div>
        <div class="metric-value">待上传</div>
        <div class="metric-note">签收后进入</div>
      </article>
    </section>

    <section class="panel">
      <div class="section-head">
        <div class="section-title">费用项</div>
        <div class="section-extra">支持改价确认和附件留痕</div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>费用项</th>
              <th>金额</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in feeItems" :key="item.name">
              <td>{{ item.name }}</td>
              <td class="money">{{ item.amount }}</td>
              <td>{{ item.status }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>
