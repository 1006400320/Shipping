<script setup>
import { carriers } from '../data/logistics'
</script>

<template>
  <section class="content">
    <section class="page-grid">
      <article class="panel page-hero">
        <h1>物流公司</h1>
        <p class="subline">维护承运商、联系人和启停状态，供物流单号和对账流程使用。</p>
      </article>

      <article class="panel metric">
        <div class="metric-label">承运商</div>
        <div class="metric-value">{{ carriers.length }}</div>
        <div class="metric-note">2 家启用</div>
      </article>
      <article class="panel metric">
        <div class="metric-label">对账方式</div>
        <div class="metric-value">按单</div>
        <div class="metric-note">支持附件上传</div>
      </article>
    </section>

    <section class="panel">
      <div class="section-head">
        <div class="section-title">承运商档案</div>
        <div class="section-extra">基础设置页面</div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>公司名称</th>
              <th>联系人</th>
              <th>电话</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in carriers" :key="item.name">
              <td>{{ item.name }}</td>
              <td>{{ item.contact }}</td>
              <td>{{ item.phone }}</td>
              <td :class="item.status === '启用' ? 'ok' : 'warn'">{{ item.status }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>
