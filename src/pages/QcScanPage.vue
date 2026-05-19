<script setup>
import { materials } from '../data/logistics'
</script>

<template>
  <section class="content">
    <section class="page-grid">
      <article class="panel page-hero">
        <h1>扫码抽检</h1>
        <p class="subline">质量员扫描物料或箱码后登记抽检结果，不通过时退回拣配或进入异常处理。</p>
        <div class="scan-input-wrap compact">
          <input class="scan-input" value="BOX-20260518-001" aria-label="抽检扫码输入" />
          <button class="scan-button" type="button">登记通过</button>
        </div>
      </article>

      <article class="panel metric">
        <div class="metric-label">抽检数量</div>
        <div class="metric-value">20</div>
        <div class="metric-note">覆盖当前发货单</div>
      </article>
      <article class="panel metric">
        <div class="metric-label">异常</div>
        <div class="metric-value">0</div>
        <div class="metric-note">可进入封箱</div>
      </article>
    </section>

    <section class="panel">
      <div class="section-head">
        <div class="section-title">抽检明细</div>
        <div class="section-extra">结果必须由扫码记录生成</div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>物料码</th>
              <th>名称</th>
              <th>已拣</th>
              <th>已检</th>
              <th>结果</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in materials" :key="item.code">
              <td>{{ item.code }}</td>
              <td>{{ item.name }}</td>
              <td class="qty">{{ item.picked }}</td>
              <td class="qty">{{ item.checked }}</td>
              <td class="ok">通过</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>
