<script setup>
import { dnaRecords } from '../data/logistics'
</script>

<template>
  <section class="content">
    <section class="page-grid">
      <article class="panel page-hero">
        <h1>DNA 录入</h1>
        <p class="subline">包含大件产品时必须录入 DNA 编号，校验完成后才能确认发厂。</p>
        <div class="scan-input-wrap compact">
          <input class="scan-input" value="DNA-" aria-label="DNA 编号输入" />
          <button class="scan-button" type="button">保存校验</button>
        </div>
      </article>

      <article class="panel metric">
        <div class="metric-label">大件数量</div>
        <div class="metric-value">1</div>
        <div class="metric-note">需要 DNA 编号</div>
      </article>
      <article class="panel metric">
        <div class="metric-label">发厂确认</div>
        <div class="metric-value">锁定</div>
        <div class="metric-note">等待 DNA 完成</div>
      </article>
    </section>

    <section class="panel">
      <div class="section-head">
        <div class="section-title">DNA 校验清单</div>
        <div class="section-extra">大件产品强制校验</div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>物料码</th>
              <th>名称</th>
              <th>DNA 编号</th>
              <th>校验人</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in dnaRecords" :key="item.material">
              <td>{{ item.material }}</td>
              <td>{{ item.name }}</td>
              <td>{{ item.dnaNo }}</td>
              <td>{{ item.verifier }}</td>
              <td class="warn">{{ item.status }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>
