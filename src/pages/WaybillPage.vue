<template>
  <section class="content">
    <section class="page-grid">
      <article class="panel page-hero">
        <h1>物流单号</h1>
        <p class="subline">发厂确认后由物流公司填写承运信息和物流单号，未填写前不能进入运输中。</p>
        <div class="form-grid">
          <label>
            物流公司
            <select class="field">
              <option>待分配</option>
              <option>顺丰速运</option>
              <option>德邦物流</option>
            </select>
          </label>
          <label>
            物流单号
            <input class="field" value="" placeholder="请输入物流单号" />
          </label>
        </div>
      </article>

      <article class="panel metric">
        <div class="metric-label">当前状态</div>
        <div class="metric-value">未发厂</div>
        <div class="metric-note">等待 DNA 和发厂确认</div>
      </article>
      <article class="panel metric">
        <div class="metric-label">通知用户</div>
        <div class="metric-value">待触发</div>
        <div class="metric-note">录入单号后发送</div>
      </article>
    </section>

    <section class="panel">
      <div class="section-head">
        <div class="section-title">运输节点</div>
        <div class="section-extra">承运后持续追踪</div>
      </div>
      <div class="info-list">
        <div class="info-row"><span class="label">发厂确认</span><span class="value warn">待确认</span></div>
        <div class="info-row"><span class="label">物流单号</span><span class="value">待填写</span></div>
        <div class="info-row"><span class="label">签收状态</span><span class="value">未开始</span></div>
      </div>
    </section>
  </section>
</template>
