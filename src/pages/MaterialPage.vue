<script setup>
import { materials } from '../data/logistics'
</script>

<template>
  <section class="content">
    <section class="page-grid">
      <article class="panel page-hero">
        <h1>物料档案</h1>
        <p class="subline">维护物料名称、大件标识和扫码规则。大件标识会触发 DNA 强校验。</p>
      </article>

      <article class="panel metric">
        <div class="metric-label">物料数量</div>
        <div class="metric-value">{{ materials.length }}</div>
        <div class="metric-note">当前演示数据</div>
      </article>
      <article class="panel metric">
        <div class="metric-label">大件物料</div>
        <div class="metric-value">1</div>
        <div class="metric-note">需录入 DNA</div>
      </article>
    </section>

    <section class="panel">
      <div class="section-head">
        <div class="section-title">物料主数据</div>
        <div class="section-extra">基础设置页面</div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>物料码</th>
              <th>名称</th>
              <th>是否大件</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in materials" :key="item.code">
              <td>{{ item.code }}</td>
              <td>{{ item.name }}</td>
              <td :class="item.large ? 'warn' : ''">{{ item.large ? '是' : '否' }}</td>
              <td class="ok">启用</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>
