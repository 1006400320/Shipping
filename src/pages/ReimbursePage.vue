<template>
  <section class="content">
    <section class="page-grid">
      <article class="panel page-hero">
        <h1>报销跟踪</h1>
        <p class="subline">对账确认完成后自动发起报销流程，跟踪总部财务处理状态。</p>
      </article>

      <article class="panel metric">
        <div class="metric-label">报销单</div>
        <div class="metric-value">未生成</div>
        <div class="metric-note">等待对账完成</div>
      </article>
      <article class="panel metric">
        <div class="metric-label">费用闭环</div>
        <div class="metric-value">未完成</div>
        <div class="metric-note">运输和费用均需结束</div>
      </article>
    </section>

    <section class="panel">
      <div class="section-head">
        <div class="section-title">报销流程</div>
        <div class="section-extra">系统自动推进</div>
      </div>
      <div class="flow flow-short">
        <div class="step"><div class="step-name">待对账</div><div class="step-owner">物流公司</div></div>
        <div class="step"><div class="step-name">核价</div><div class="step-owner">财务</div></div>
        <div class="step"><div class="step-name">发起报销</div><div class="step-owner">系统</div></div>
        <div class="step"><div class="step-name">总部确认</div><div class="step-owner">总部财务</div></div>
        <div class="step"><div class="step-name">已报销</div><div class="step-owner">流程结束</div></div>
      </div>
    </section>
  </section>
</template>
