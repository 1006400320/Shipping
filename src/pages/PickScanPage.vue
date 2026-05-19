<script setup>
import { materials } from '../data/logistics'
</script>

<template>
  <section class="content">
    <section class="page-grid">
      <article class="panel page-hero">
        <h1>扫码拣配</h1>
        <p class="subline">包管员连续扫描物料码，系统校验是否属于当前发货单并累计应拣数量。</p>
        <div class="scan-input-wrap compact">
          <input class="scan-input" value="MAT-A1001" aria-label="拣配扫码输入" />
          <button class="scan-button" type="button">扫码确认</button>
        </div>
      </article>

      <article class="panel metric">
        <div class="metric-label">应拣数量</div>
        <div class="metric-value">20</div>
        <div class="metric-note">全部来自发货清单</div>
      </article>
      <article class="panel metric">
        <div class="metric-label">已拣数量</div>
        <div class="metric-value">20</div>
        <div class="metric-note">已满足抽检条件</div>
      </article>
    </section>

    <section class="panel">
      <div class="section-head">
        <div class="section-title">拣配清单</div>
        <div class="section-extra">多扫、错扫会进入异常处理</div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>物料码</th>
              <th>名称</th>
              <th>计划</th>
              <th>已拣</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in materials" :key="item.code">
              <td>{{ item.code }}</td>
              <td>{{ item.name }}</td>
              <td class="qty">{{ item.planned }}</td>
              <td class="qty">{{ item.picked }}</td>
              <td :class="item.picked === item.planned ? 'ok' : 'warn'">
                {{ item.picked === item.planned ? '已拣齐' : '待补拣' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>
