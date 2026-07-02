const palette = [
  "#1f6feb",
  "#16a34a",
  "#dc2626",
  "#7c3aed",
  "#f59e0b",
  "#0891b2",
  "#ea580c",
  "#475569",
  "#be185d",
  "#0f766e",
  "#4f46e5",
  "#65a30d",
];

const yuan = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  maximumFractionDigits: 2,
});

const sortStorageKey = "fundDashboardHoldingSort";
const manualOrderStorageKey = "fundDashboardHoldingManualOrder";
let latestRows = [];

function fmtMoney(value) {
  return yuan.format(Number(value || 0));
}

function fmtPct(value) {
  if (!Number.isFinite(value)) return "--";
  return `${value.toFixed(2)}%`;
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toneClass(value) {
  if (!Number.isFinite(value) || value === 0) return "";
  return value > 0 ? "positive" : "negative";
}

function localTime(iso) {
  if (!iso) return "--";
  return new Date(iso).toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour12: false,
  });
}

function loadSortState() {
  try {
    return {
      field: "profit",
      direction: "desc",
      ...JSON.parse(localStorage.getItem(sortStorageKey) || "{}"),
    };
  } catch {
    return { field: "profit", direction: "desc" };
  }
}

function saveSortState(state) {
  localStorage.setItem(sortStorageKey, JSON.stringify(state));
}

function loadManualOrder() {
  try {
    const value = JSON.parse(localStorage.getItem(manualOrderStorageKey) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function saveManualOrder(order) {
  localStorage.setItem(manualOrderStorageKey, JSON.stringify(order));
}

function sortValue(row, field) {
  const fund = row.fund || {};
  if (field === "rate1m") return fund.rates?.m1;
  if (field === "rate1y") return fund.rates?.y1;
  if (field === "name") return row.name || "";
  if (field === "group") return row.group || "";
  return row[field];
}

function compareRows(a, b, state) {
  const valueA = sortValue(a, state.field);
  const valueB = sortValue(b, state.field);
  const direction = state.direction === "asc" ? 1 : -1;
  if (typeof valueA === "string" || typeof valueB === "string") {
    return String(valueA || "").localeCompare(String(valueB || ""), "zh-CN") * direction;
  }
  const numberA = Number.isFinite(valueA) ? valueA : -Infinity;
  const numberB = Number.isFinite(valueB) ? valueB : -Infinity;
  if (numberA !== numberB) return (numberA - numberB) * direction;
  return String(a.name || "").localeCompare(String(b.name || ""), "zh-CN");
}

function sortedHoldingRows(rows) {
  const state = loadSortState();
  if (state.field === "manual") {
    const order = loadManualOrder();
    const index = new Map(order.map((code, idx) => [code, idx]));
    return [...rows].sort((a, b) => {
      const aIndex = index.has(a.code) ? index.get(a.code) : Number.MAX_SAFE_INTEGER;
      const bIndex = index.has(b.code) ? index.get(b.code) : Number.MAX_SAFE_INTEGER;
      if (aIndex !== bIndex) return aIndex - bIndex;
      return String(a.name || "").localeCompare(String(b.name || ""), "zh-CN");
    });
  }
  return [...rows].sort((a, b) => compareRows(a, b, state));
}

function syncSortControls() {
  const state = loadSortState();
  const select = document.querySelector("#holding-sort");
  const direction = document.querySelector("#holding-sort-direction");
  if (select) select.value = state.field;
  if (direction) {
    direction.textContent = state.direction === "asc" ? "升序" : "降序";
    direction.disabled = state.field === "manual";
  }
}

function moveManualHolding(code, delta) {
  const rows = sortedHoldingRows(latestRows);
  const order = rows.map((row) => row.code);
  const index = order.indexOf(code);
  const nextIndex = index + delta;
  if (index < 0 || nextIndex < 0 || nextIndex >= order.length) return;
  [order[index], order[nextIndex]] = [order[nextIndex], order[index]];
  saveManualOrder(order);
  renderTable(latestRows);
}

function drawDonut(canvas, groups, total) {
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, rect.width, rect.height);

  const cx = rect.width / 2;
  const cy = rect.height / 2;
  const radius = Math.min(rect.width, rect.height) / 2 - 12;
  const width = Math.max(28, radius * 0.28);
  let angle = -Math.PI / 2;

  groups.forEach((group, index) => {
    const slice = group.value / total * Math.PI * 2;
    ctx.beginPath();
    ctx.strokeStyle = palette[index % palette.length];
    ctx.lineWidth = width;
    ctx.arc(cx, cy, radius - width / 2, angle, angle + slice);
    ctx.stroke();
    angle += slice;
  });

  ctx.fillStyle = "#182033";
  ctx.font = "700 22px Microsoft YaHei, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(fmtMoney(total).replace("CN¥", "¥"), cx, cy - 8);
  ctx.fillStyle = "#697386";
  ctx.font = "12px Microsoft YaHei, sans-serif";
  ctx.fillText("总资金", cx, cy + 18);
}

function renderAllocation(data) {
  const canvas = document.querySelector("#allocation");
  drawDonut(canvas, data.groups, data.total);

  const legend = document.querySelector("#allocation-list");
  legend.innerHTML = data.groups.map((group, index) => {
    const pct = group.value / data.total * 100;
    return `
      <div class="legend-item">
        <span class="swatch" style="background:${palette[index % palette.length]}"></span>
        <span>${group.name}</span>
        <strong>${fmtMoney(group.value)} · ${pct.toFixed(1)}%</strong>
      </div>
    `;
  }).join("");
}

function renderPulse(rows) {
  const pulse = rows
    .filter((row) => Number.isFinite(row.intradayPct))
    .sort((a, b) => b.intradayPct - a.intradayPct);
  document.querySelector("#pulse-list").innerHTML = pulse.map((row) => `
    <div class="pulse-row">
      <strong>${row.proxyLabel}</strong>
      <span>${row.estimateSource === "realtime-proxy" ? `实时源 ${row.quote?.source || ""}` : "净值兜底"}</span>
      <strong class="${toneClass(row.intradayPct)}">${fmtPct(row.intradayPct)}</strong>
    </div>
  `).join("");
}

function renderAnalysis(data) {
  const analysis = data.analysis || {};
  const reminder = analysis.reminder || {};
  document.querySelector("#analysis-stance").textContent = analysis.opportunity || "--";
  document.querySelector("#analysis-badge").textContent = analysis.stance || "--";
  document.querySelector("#analysis-headline").textContent = analysis.headline || "--";
  document.querySelector("#analysis-action").textContent = analysis.action || "--";
  document.querySelector("#sell-alert-meta").textContent = `实时建议每${reminder.refreshSeconds || 15}秒重算 · 本次更新 ${localTime(reminder.updatedAt || data.updatedAt)} · 下次交易复核 ${localTime(reminder.nextReviewAt)} · 每日邮件 ${localTime(reminder.nextEmailAt)}`;

  document.querySelector("#analysis-metrics").innerHTML = (analysis.metrics || []).map((metric) => `
    <div class="analysis-metric">
      <span>${metric.label}</span>
      <strong class="${metric.label.includes("盈亏") ? toneClass(Number(String(metric.value).replace(/[¥,]/g, ""))) : ""}">${metric.value}</strong>
      <em>${metric.detail}</em>
    </div>
  `).join("");

  document.querySelector("#priority-list").innerHTML = (analysis.priorities || []).map((item) => `
    <li>${item}</li>
  `).join("");

  document.querySelector("#skill-list").innerHTML = (analysis.skills || []).map((skill) => `
    <div class="skill-item">
      <strong>${skill.name}</strong>
      <span>${skill.use}</span>
    </div>
  `).join("");

  const plan = analysis.allocationPlan || {};
  document.querySelector("#allocation-summary").textContent = plan.summary || "--";
  document.querySelector("#allocation-plan").innerHTML = (plan.items || []).map((item) => `
    <div class="plan-item">
      <div>
        <strong>${item.name}</strong>
        <span>${item.code === "cash" ? "机会资金" : item.code}</span>
      </div>
      <strong>${fmtMoney(item.amount)}</strong>
      <p>${item.reason}</p>
    </div>
  `).join("");

  document.querySelector("#sell-alerts").innerHTML = (analysis.sellAlerts || []).map((alert) => `
    <div class="sell-alert ${alert.level === "清仓候选" ? "critical" : ""}">
      <div class="sell-title">
        <span>${alert.level}</span>
        <strong>${alert.name}</strong>
        <em>${alert.code}</em>
      </div>
      <div class="sell-directives">
        <p><b>现在</b>${alert.nowAction || alert.action}</p>
        <p><b>金额</b>${alert.sellAmount || "--"}</p>
        <p><b>时间</b>${alert.timing || "--"}</p>
        <p><b>依据</b>${alert.liveLine || "--"}</p>
        <p><b>更新</b>${localTime(alert.updatedAt)}</p>
        <p><b>提醒</b>交易复核 ${localTime(alert.nextReviewAt)}；邮件 ${localTime(alert.nextEmailAt)}</p>
        <p><b>下一步</b>${alert.nextAction || "--"}</p>
      </div>
      <small>${alert.reason}</small>
    </div>
  `).join("");

  document.querySelector("#buy-alert-meta").textContent = `补仓建议每${reminder.refreshSeconds || 15}秒重算 · 本次更新 ${localTime(reminder.updatedAt || data.updatedAt)} · 下次交易复核 ${localTime(reminder.nextReviewAt)} · 机会资金 ${fmtMoney(data.cash)}`;
  document.querySelector("#buy-alerts").innerHTML = (analysis.buyOpportunities || []).map((item) => `
    <div class="buy-alert ${item.level === "条件补仓" || item.level === "稳健补仓" ? "active" : ""}">
      <div class="buy-title">
        <span>${item.level}</span>
        <strong>${item.sector}</strong>
        <em>${item.code}</em>
      </div>
      <h3>${item.name}</h3>
      <div class="buy-directives">
        <p><b>现在</b>${item.nowAction || "--"}</p>
        <p><b>金额</b>${item.buyAmount || "--"}</p>
        <p><b>条件</b>${item.trigger || "--"}</p>
        <p><b>时间</b>${item.timing || "--"}</p>
        <p><b>依据</b>${item.liveLine || "--"}</p>
        <p><b>下一步</b>${item.nextAction || "--"}</p>
      </div>
      <small>${item.reason || ""}</small>
    </div>
  `).join("");

  renderFutureTrends(analysis);
}

function renderFutureTrends(analysis = {}) {
  const trends = analysis.futureTrends || {};
  const meta = document.querySelector("#future-meta");
  if (!meta) return;

  meta.textContent = `未来3到15天趋势每15秒随行情重算 · 本次更新 ${localTime(trends.updatedAt || analysis.reminder?.updatedAt)}`;
  const metrics = (trends.metrics || []).map((metric) => `
    <div class="future-metric">
      <span>${escapeHtml(metric.label)}</span>
      <strong>${escapeHtml(metric.value)}</strong>
      <em>${escapeHtml(metric.detail || "")}</em>
    </div>
  `).join("");

  document.querySelector("#future-summary").innerHTML = `
    <div>
      <span class="future-bias">${escapeHtml(trends.bias || "观察")}</span>
      <strong>${escapeHtml(trends.summary || "--")}</strong>
    </div>
    <div class="future-metrics">${metrics}</div>
  `;

  document.querySelector("#future-windows").innerHTML = (trends.windows || []).map((item) => `
    <div class="future-window">
      <span>${escapeHtml(item.label)}</span>
      <p>${escapeHtml(item.text || "")}</p>
    </div>
  `).join("");

  document.querySelector("#future-groups").innerHTML = (trends.groups || []).map((group) => `
    <article class="future-card ${escapeHtml(group.tone || "neutral")}">
      <div class="future-card-head">
        <div>
          <strong>${escapeHtml(group.group)}</strong>
          <span>${fmtMoney(group.amount)} · ${fmtPct(group.weightPct)}</span>
        </div>
        <em>${escapeHtml(group.trend || "--")}</em>
      </div>
      <div class="future-card-grid">
        <p><b>3天</b>${escapeHtml(group.threeDay || "")}</p>
        <p><b>7天</b>${escapeHtml(group.sevenDay || "")}</p>
        <p><b>15天</b>${escapeHtml(group.fifteenDay || "")}</p>
        <p><b>操作</b>${escapeHtml(group.action || "")}</p>
      </div>
      <div class="future-card-foot">
        <span>风险 ${escapeHtml(group.risk || "--")}</span>
        <span>持有盈亏 ${fmtMoney(group.profit || 0)}</span>
        <span>盘中估算 ${fmtMoney(group.estimated || 0)}</span>
      </div>
    </article>
  `).join("");

  document.querySelector("#future-watchlist").innerHTML = (trends.watchlist || []).map((item) => `
    <article class="future-watch-item ${escapeHtml(item.tone || "neutral")}">
      <div>
        <strong>${escapeHtml(item.name)}</strong>
        <span>${escapeHtml(item.code)} · ${escapeHtml(item.group)} · ${fmtMoney(item.amount)}</span>
      </div>
      <em>${escapeHtml(item.trend || "--")}</em>
      <p>${escapeHtml(item.reason || "")}</p>
      <p><b>下一步</b>${escapeHtml(item.nextMove || "")}</p>
    </article>
  `).join("");
}

function renderOpinions(opinions = {}) {
  const consensus = opinions.consensus || {};
  const items = opinions.items || [];
  document.querySelector("#opinion-meta").textContent = `本次抓取 ${localTime(opinions.updatedAt)} · 下次抓取 ${localTime(opinions.nextRefreshAt)} · 每${opinions.refreshMinutes || 10}分钟更新`;
  document.querySelector("#opinion-badge").textContent = consensus.dominant || "待确认";
  document.querySelector("#opinion-summary").textContent = consensus.summary || opinions.sourceNote || "--";
  document.querySelector("#opinion-common").innerHTML = (consensus.commonPoints || []).map((point) => `
    <span>${escapeHtml(point)}</span>
  `).join("");
  document.querySelector("#opinion-list").innerHTML = items.map((item) => {
    const linkLabel = item.status === "ok" ? "查看来源" : "查看搜索";
    const link = item.link ? `<a href="${escapeHtml(item.link)}" target="_blank" rel="noreferrer">${linkLabel}</a>` : "<span>暂无链接</span>";
    return `
      <article class="opinion-card">
        <div class="opinion-card-head">
          <span class="stance ${escapeHtml(item.stance || "待确认")}">${escapeHtml(item.stance || "待确认")}</span>
          <strong>${escapeHtml(item.name || item.source || "观点源")}</strong>
          <em>${escapeHtml(item.sector || "")}</em>
        </div>
        <h3>${escapeHtml(item.title || "--")}</h3>
        <p>${escapeHtml(item.summary || "")}</p>
        <div class="opinion-insights">
          <p><b>建议</b>${escapeHtml(item.suggestion || "暂不作为交易依据，继续观察。")}</p>
          <p><b>前瞻</b>${escapeHtml(item.forwardView || "继续看观点是否与盘面强弱一致。")}</p>
        </div>
        <div class="opinion-foot">
          <span>${escapeHtml(item.source || "公开网页")}</span>
          ${link}
        </div>
      </article>
    `;
  }).join("");
}

function renderTable(rows) {
  const recommendationByCode = new Map((window.currentAnalysisRows || []).map((row) => [row.code, row.recommendation]));
  const sortState = loadSortState();
  const sortedRows = sortedHoldingRows(rows);
  document.querySelector("#holdings").innerHTML = sortedRows.map((row) => {
    const fund = row.fund || {};
    const rate1m = fund.rates?.m1;
    const rate1y = fund.rates?.y1;
    const manualControls = sortState.field === "manual"
      ? `<span class="manual-controls"><button type="button" data-move="${row.code}" data-delta="-1" title="上移">↑</button><button type="button" data-move="${row.code}" data-delta="1" title="下移">↓</button></span>`
      : "";
    return `
      <tr>
        <td>
          <div class="fund-name">
            <strong>${manualControls}${row.name}</strong>
            <span>${row.code} · ${row.proxyLabel}</span>
          </div>
        </td>
        <td>${fmtMoney(row.amount)}</td>
        <td><span class="group-badge">${row.group}</span></td>
        <td>${fund.nav ? fund.nav.toFixed(4) : "--"}<br><span class="subtle">${fund.date || ""}</span></td>
        <td class="${toneClass(row.profitPct)}">${fmtMoney(row.profit || 0)}<br><span>${fmtPct(row.profitPct)}</span></td>
        <td class="${toneClass(rate1m)}">${fmtPct(rate1m)}</td>
        <td class="${toneClass(rate1y)}">${fmtPct(rate1y)}</td>
        <td class="${toneClass(row.intradayPct)}">${fmtPct(row.intradayPct)}<br><span class="subtle">${row.estimateSource === "realtime-proxy" ? "实时代理" : row.estimateSource === "fund-nav" ? "净值兜底" : "缺失"}</span></td>
        <td class="${toneClass(row.estimatedChange)}">${Number.isFinite(row.estimatedChange) ? fmtMoney(row.estimatedChange) : "--"}</td>
        <td class="recommendation">${recommendationByCode.get(row.code) || "持有"}</td>
      </tr>
    `;
  }).join("");
  syncSortControls();
}

function render(data) {
  document.querySelector("#data-note").textContent = data.note;
  document.querySelector("#updated").textContent = `更新 ${localTime(data.updatedAt)}`;
  document.querySelector("#invested").textContent = fmtMoney(data.invested);
  document.querySelector("#cash").textContent = fmtMoney(data.cash);
  const cashInput = document.querySelector("#cash-input");
  if (document.activeElement !== cashInput) {
    cashInput.value = Number(data.cash || 0).toFixed(2);
  }
  document.querySelector("#total").textContent = fmtMoney(data.total);
  document.querySelector("#pending-buy").textContent = fmtMoney(data.pendingBuy);
  document.querySelector("#pending-sell").textContent = fmtMoney(data.pendingSell);
  const actualDay = document.querySelector("#actual-day-change");
  actualDay.textContent = fmtMoney(data.actualDayChange);
  actualDay.className = toneClass(data.actualDayChange);
  const day = document.querySelector("#day-change");
  day.textContent = fmtMoney(data.estimatedDayChange);
  day.className = toneClass(data.estimatedDayChange);
  const estimate = data.estimate || {};
  const realtimeCoverage = Number.isFinite(estimate.realtimeCoverage) ? Math.round(estimate.realtimeCoverage * 100) : 0;
  const coverage = Number.isFinite(data.coverage) ? Math.round(data.coverage * 100) : 0;
  document.querySelector("#day-change-source").textContent = `非支付宝实际收益 · 实时代理覆盖 ${realtimeCoverage}% · 15秒刷新`;
  document.querySelector("#coverage").textContent = `实际昨日 ${fmtMoney(data.actualDayChange)} · 盘中代理 ${fmtMoney(data.estimatedDayChange)} · 覆盖 ${coverage}%`;
  window.currentAnalysisRows = data.analysis?.rows || [];
  latestRows = data.rows || [];
  renderAnalysis(data);
  renderOpinions(data.opinions);
  renderAllocation(data);
  renderPulse(data.rows);
  renderTable(data.rows);
}

async function load() {
  const buttons = [
    document.querySelector("#refresh"),
    document.querySelector("#sell-refresh"),
    document.querySelector("#buy-refresh"),
    document.querySelector("#future-refresh"),
  ].filter(Boolean);
  buttons.forEach((button) => {
    button.disabled = true;
    button.dataset.label = button.textContent;
    button.textContent = "刷新中";
  });
  try {
    const response = await fetch(`/api/portfolio?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    render(await response.json());
  } catch (error) {
    document.querySelector("#data-note").textContent = `加载失败：${error.message}`;
  } finally {
    buttons.forEach((button) => {
      button.disabled = false;
      button.textContent = button.dataset.label || "刷新";
      delete button.dataset.label;
    });
  }
}

document.querySelector("#refresh").addEventListener("click", load);
document.querySelector("#sell-refresh").addEventListener("click", load);
document.querySelector("#buy-refresh").addEventListener("click", load);
document.querySelector("#future-refresh").addEventListener("click", load);

document.querySelector("#holding-sort").addEventListener("change", (event) => {
  const state = loadSortState();
  const nextState = { ...state, field: event.target.value };
  if (nextState.field === "manual" && loadManualOrder().length === 0) {
    saveManualOrder(sortedHoldingRows(latestRows).map((row) => row.code));
  }
  saveSortState(nextState);
  renderTable(latestRows);
});

document.querySelector("#holding-sort-direction").addEventListener("click", () => {
  const state = loadSortState();
  if (state.field === "manual") return;
  saveSortState({ ...state, direction: state.direction === "asc" ? "desc" : "asc" });
  renderTable(latestRows);
});

document.querySelector("#holdings").addEventListener("click", (event) => {
  const button = event.target.closest("[data-move]");
  if (!button) return;
  moveManualHolding(button.dataset.move, Number(button.dataset.delta));
});

document.querySelector("#cash-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const status = document.querySelector("#cash-status");
  const input = document.querySelector("#cash-input");
  const cash = Number(input.value);
  if (!Number.isFinite(cash) || cash < 0) {
    status.textContent = "请输入非负金额";
    return;
  }
  status.textContent = "保存中";
  try {
    const response = await fetch("/api/cash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cash }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    status.textContent = "已保存";
    await load();
  } catch (error) {
    status.textContent = `保存失败：${error.message}`;
  }
});

load();
setInterval(load, 15_000);
