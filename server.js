const http = require("http");
const fs = require("fs");
const net = require("net");
const path = require("path");

const DEFAULT_PORT = 9020;
const PORT = Number(process.env.PORT || DEFAULT_PORT);
const MAX_PORT_ATTEMPTS = 10;
const HOST = process.env.HOST || (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1");
const STRICT_PORT = Boolean(process.env.PORT);
const DASHBOARD_USER = process.env.DASHBOARD_USER || "admin";
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || "";
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const STATE_FILE = path.join(ROOT, "state.json");

const previousHoldingsSnapshot = [
  { code: "025209", name: "永赢先锋半导体智选混合C", amount: 754.29, dayProfit: 33.69, profit: 125.93, profitPct: 20.04, group: "半导体", proxy: "1.512480", proxyLabel: "半导体ETF" },
  { code: "027574", name: "天弘上证科创板芯片设计主题ETF发起联接A", amount: 100.01, dayProfit: 0.01, profit: 0.01, profitPct: 0.01, group: "科创芯片", proxy: "1.589070", proxyLabel: "科创芯片设计ETF" },
  { code: "014880", name: "天弘中证机器人ETF发起联接A", amount: 403.29, dayProfit: 1.06, profit: 3.29, profitPct: 0.82, group: "机器人", proxy: "0.159770", proxyLabel: "机器人ETF" },
  { code: "110007", name: "易方达稳健收益债券A", amount: 598.07, dayProfit: -0.77, profit: -1.93, profitPct: -0.32, group: "债券", proxy: null, proxyLabel: "净值更新" },
  { code: "110020", name: "易方达沪深300ETF联接A", amount: 1201.78, dayProfit: -7.79, profit: 1.78, profitPct: 0.15, group: "宽基", proxy: "1.510310", proxyLabel: "沪深300ETF" },
  { code: "007466", name: "华泰柏瑞中证红利低波ETF联接A", amount: 494.53, dayProfit: -5.64, profit: -3.93, profitPct: -0.79, group: "红利低波", proxy: "1.512890", proxyLabel: "红利低波ETF" },
  { code: "000216", name: "华安黄金ETF联接A", amount: 197.79, dayProfit: 0.29, profit: -2.21, profitPct: -1.11, group: "黄金", proxy: "1.518880", proxyLabel: "黄金ETF" },
  { code: "016453", name: "南方纳斯达克100指数(QDII)C", amount: 100, dayProfit: 0, profit: 0, profitPct: 0, group: "美股科技", proxy: null, proxyLabel: "QDII净值更新" },
  { code: "160119", name: "南方中证500ETF联接(LOF)A", amount: 399.73, dayProfit: -0.15, profit: -0.27, profitPct: -0.07, group: "宽基", proxy: "1.510500", proxyLabel: "中证500ETF" },
  { code: "023598", name: "景顺长城港股通创新药ETF联接C", amount: 140.05, dayProfit: -1.53, profit: -9.95, profitPct: -6.63, group: "创新药", proxy: "1.520700", proxyLabel: "港股创新药ETF" },
  { code: "003017", name: "广发中证军工ETF联接A", amount: 298.34, dayProfit: 1.06, profit: -1.66, profitPct: -0.55, group: "军工航天", proxy: "1.512680", proxyLabel: "军工ETF" },
  { code: "013176", name: "海富通碳中和主题混合C", amount: 95.09, dayProfit: 0, profit: 0, profitPct: 0, group: "碳中和", proxy: null, proxyLabel: "净值更新" },
  { code: "019305", name: "摩根标普500指数(QDII)C", amount: 10, dayProfit: 0, profit: 0, profitPct: 0, group: "美股科技", proxy: null, proxyLabel: "标普500指数" },
  { code: "017641", name: "摩根标普500指数(QDII)A", amount: 10, dayProfit: 0, profit: 0, profitPct: 0, group: "美股科技", proxy: null, proxyLabel: "标普500指数" },
  { code: "023638", name: "国泰A股电网设备ETF联接A", amount: 203.91, dayProfit: 0, profit: -0.19, profitPct: -0.09, group: "电网设备", proxy: null, proxyLabel: "净值更新" },
  { code: "020640", name: "广发半导体材料设备主题ETF联接C", amount: 595.46, dayProfit: 13.51, profit: 17.83, profitPct: 3.09, group: "半导体设备", proxy: "1.561980", proxyLabel: "半导体设备ETF" },
  { code: "021580", name: "华夏人工智能ETF联接D", amount: 143.8, dayProfit: -0.96, profit: 3.8, profitPct: 2.72, group: "AI算力", proxy: "1.515070", proxyLabel: "人工智能ETF" },
  { code: "008887", name: "华夏国证半导体芯片ETF联接A", amount: 287.77, dayProfit: 5.1, profit: 3.22, profitPct: 1.13, group: "半导体", proxy: "0.159995", proxyLabel: "芯片ETF" },
];

const holdings = [
  { code: "020640", name: "广发半导体材料设备主题ETF联接C", amount: 989.33, dayProfit: 3.63, profit: 281.12, profitPct: 46.99, group: "半导体设备", proxy: "1.561980", proxyLabel: "半导体设备ETF" },
  { code: "270042", name: "广发纳斯达克100ETF联接人民币(QDII)A", amount: 91.40, dayProfit: 0.95, profit: 1.40, profitPct: 2.00, group: "美股科技", proxy: null, proxyLabel: "QDII净值更新" },
  { code: "003017", name: "广发中证军工ETF联接A", amount: 300.72, dayProfit: 1.90, profit: 0.72, profitPct: 0.24, group: "军工航天", proxy: "1.512680", proxyLabel: "军工ETF" },
  { code: "008971", name: "大成纳斯达克100ETF联接(QDII)C", amount: 50.49, dayProfit: 0.32, profit: 0.49, profitPct: 1.63, group: "美股科技", proxy: null, proxyLabel: "QDII净值更新" },
  { code: "025209", name: "永赢先锋半导体智选混合C", amount: 3202.17, dayProfit: -33.89, profit: 509.53, profitPct: 18.99, group: "半导体", proxy: "1.512480", proxyLabel: "半导体ETF" },
  { code: "025208", name: "永赢先锋半导体智选混合A", amount: 320.15, dayProfit: -3.23, profit: 30.15, profitPct: 10.77, group: "半导体", proxy: "1.512480", proxyLabel: "半导体ETF" },
  { code: "110020", name: "易方达沪深300ETF联接A", amount: 767.50, dayProfit: -2.96, profit: 12.66, profitPct: 1.70, group: "宽基", proxy: "1.510310", proxyLabel: "沪深300ETF" },
  { code: "012922", name: "易方达全球成长精选混合(QDII)C", amount: 10.00, dayProfit: 0.00, profit: 0.00, profitPct: 0.00, group: "全球成长", proxy: null, proxyLabel: "QDII净值更新" },
  { code: "110007", name: "易方达稳健收益债券A", amount: 180.76, dayProfit: 0.61, profit: 0.28, profitPct: 0.16, group: "债券", proxy: null, proxyLabel: "净值更新" },
  { code: "013309", name: "易方达恒生科技ETF联接(QDII)C", amount: 376.59, dayProfit: -0.32, profit: -23.41, profitPct: -5.85, group: "港股科技", proxy: null, proxyLabel: "QDII净值更新" },
  { code: "017641", name: "摩根标普500指数(QDII)人民币A", amount: 191.61, dayProfit: 1.08, profit: 1.61, profitPct: 0.94, group: "美股宽基", proxy: null, proxyLabel: "QDII净值更新" },
  { code: "019305", name: "摩根标普500指数(QDII)人民币C", amount: 181.76, dayProfit: 1.08, profit: 1.76, profitPct: 1.10, group: "美股宽基", proxy: null, proxyLabel: "QDII净值更新" },
  { code: "021528", name: "财通成长优选混合C", amount: 348.93, dayProfit: -2.94, profit: 5.10, profitPct: 1.53, group: "成长主动", proxy: null, proxyLabel: "净值更新" },
  { code: "014915", name: "财通匠心优选一年持有混合A", amount: 411.30, dayProfit: -2.87, profit: 11.30, profitPct: 2.83, group: "成长主动", proxy: null, proxyLabel: "净值更新" },
  { code: "014978", name: "华安纳斯达克100ETF联接(QDII)C", amount: 91.38, dayProfit: 0.90, profit: 1.38, profitPct: 1.98, group: "美股科技", proxy: null, proxyLabel: "QDII净值更新" },
  { code: "017102", name: "大摩数字经济混合A", amount: 371.69, dayProfit: -14.42, profit: -18.31, profitPct: -4.82, group: "AI数字经济", proxy: null, proxyLabel: "净值更新" },
  { code: "016452", name: "南方纳斯达克100指数发起(QDII)A", amount: 456.59, dayProfit: 4.59, profit: 6.59, profitPct: 1.88, group: "美股科技", proxy: null, proxyLabel: "QDII净值更新" },
  { code: "016453", name: "南方纳斯达克100指数发起(QDII)C", amount: 272.09, dayProfit: 3.82, profit: 2.09, profitPct: 0.84, group: "美股科技", proxy: null, proxyLabel: "QDII净值更新" },
  { code: "160119", name: "南方中证500ETF联接(LOF)A", amount: 432.20, dayProfit: -0.22, profit: 32.20, profitPct: 8.05, group: "宽基", proxy: "1.510500", proxyLabel: "中证500ETF" },
  { code: "027575", name: "天弘上证科创板芯片设计主题ETF发起联接C", amount: 176.39, dayProfit: -4.25, profit: 35.39, profitPct: 27.01, group: "科创芯片", proxy: "1.589070", proxyLabel: "科创芯片设计ETF" },
  { code: "017193", name: "天弘中证工业有色金属主题ETF发起联接C", amount: 299.67, dayProfit: -0.33, profit: -0.33, profitPct: -0.11, group: "工业有色", proxy: null, proxyLabel: "净值更新" },
  { code: "014880", name: "天弘中证机器人ETF发起联接A", amount: 492.32, dayProfit: 0.75, profit: 3.30, profitPct: 0.67, group: "机器人", proxy: "0.159770", proxyLabel: "机器人ETF" },
  { code: "014881", name: "天弘中证机器人ETF发起联接C", amount: 102.40, dayProfit: 0.18, profit: 2.40, profitPct: 2.40, group: "机器人", proxy: "0.159770", proxyLabel: "机器人ETF" },
  { code: "016371", name: "信澳业绩驱动混合C", amount: 623.27, dayProfit: -34.37, profit: -14.76, profitPct: -4.52, group: "成长主动", proxy: null, proxyLabel: "净值更新" },
  { code: "026622", name: "招商上证科创板芯片设计主题指数发起式A", amount: 1289.31, dayProfit: -32.61, profit: 39.71, profitPct: 3.18, group: "科创芯片", proxy: "1.589070", proxyLabel: "科创芯片设计ETF" },
  { code: "004569", name: "招商制造业转型灵活配置混合C", amount: 296.68, dayProfit: -11.03, profit: -3.32, profitPct: -1.11, group: "制造业转型", proxy: null, proxyLabel: "净值更新" },
  { code: "008887", name: "华夏国证半导体芯片ETF联接A", amount: 782.87, dayProfit: -17.54, profit: 87.11, profitPct: 12.52, group: "半导体", proxy: "0.159995", proxyLabel: "芯片ETF" },
  { code: "018344", name: "华夏中证机器人ETF发起式联接A", amount: 202.01, dayProfit: 0.35, profit: 2.01, profitPct: 1.00, group: "机器人", proxy: "0.159770", proxyLabel: "机器人ETF" },
  { code: "021580", name: "华夏人工智能ETF联接D", amount: 153.71, dayProfit: -3.41, profit: 13.71, profitPct: 9.79, group: "AI算力", proxy: "1.515070", proxyLabel: "人工智能ETF" },
  { code: "011452", name: "华泰柏瑞质量成长混合C", amount: 291.30, dayProfit: -11.22, profit: -8.70, profitPct: -2.90, group: "成长主动", proxy: null, proxyLabel: "净值更新" },
  { code: "023638", name: "国泰A股电网设备ETF联接A", amount: 198.51, dayProfit: -6.02, profit: -5.59, profitPct: -2.74, group: "电网设备", proxy: null, proxyLabel: "净值更新" },
  { code: "023598", name: "景顺长城中证港股通创新药ETF联接C", amount: 142.78, dayProfit: -0.12, profit: -7.22, profitPct: -4.81, group: "创新药", proxy: "1.520700", proxyLabel: "港股创新药ETF" },
];

const defaultState = {
  cash: 50,
  pendingBuy: 20,
  pendingSell: 0,
};

const OPINION_TTL_MS = 10 * 60 * 1000;
let opinionCache = null;

const opinionWatchers = [
  { id: "douyin-semi", name: "抖音公开搜索", sector: "半导体设备", query: "半导体设备 ETF 今日 博主 观点 财经 2026", keywords: ["半导体设备", "半导体", "设备", "ETF"] },
  { id: "xueqiu-chip", name: "雪球公开讨论", sector: "芯片ETF", query: "芯片ETF 雪球 今日 观点 财经 2026", keywords: ["芯片", "半导体", "ETF", "雪球"] },
  { id: "eastmoney-chip", name: "东方财富讨论", sector: "半导体芯片", query: "半导体芯片 ETF 东方财富 股吧 今日 2026", keywords: ["半导体", "芯片", "ETF", "东方财富", "股吧"] },
  { id: "weibo-hbm", name: "微博公开搜索", sector: "HBM/存储", query: "HBM 存储芯片 DRAM NAND 投资 观点 2026", keywords: ["HBM", "存储", "DRAM", "NAND", "芯片"] },
  { id: "zhihu-ai", name: "知乎公开观点", sector: "AI算力", query: "AI算力 芯片 ETF 投资 观点 2026", keywords: ["AI", "算力", "芯片", "人工智能"] },
  { id: "robot-etf", name: "全网机器人观点", sector: "机器人", query: "机器人ETF 今日 分析 财经 观点 2026", keywords: ["机器人", "ETF", "智能制造"] },
  { id: "military-etf", name: "全网军工观点", sector: "军工航天", query: "军工ETF 航天 今日 分析 财经 2026", keywords: ["军工", "航天", "ETF"] },
  { id: "innov-med", name: "全网创新药观点", sector: "港股创新药", query: "港股创新药 ETF 今日 观点 财经 2026", keywords: ["创新药", "港股", "医药", "ETF"] },
  { id: "hs300", name: "宽基观点源", sector: "沪深300", query: "沪深300 ETF 今日 分析 财经 2026", keywords: ["沪深300", "宽基", "ETF"] },
  { id: "defensive", name: "防守资产观点", sector: "红利低波/黄金/债券", query: "红利低波 黄金 债券 ETF 今日 观点 2026", keywords: ["红利", "黄金", "债券", "低波", "ETF"] },
];

const blockedOpinionDomains = [
  "baike.baidu.com",
  "wikipedia.org",
  "tripadvisor.",
  "dictionary",
  "translate.google",
];

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function isAuthorized(req) {
  if (!DASHBOARD_PASSWORD) return true;
  const header = req.headers.authorization || "";
  const [scheme, encoded] = header.split(" ");
  if (scheme !== "Basic" || !encoded) return false;
  try {
    const decoded = Buffer.from(encoded, "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator < 0) return false;
    const user = decoded.slice(0, separator);
    const password = decoded.slice(separator + 1);
    return user === DASHBOARD_USER && password === DASHBOARD_PASSWORD;
  } catch {
    return false;
  }
}

function requireAuth(res) {
  res.writeHead(401, {
    "WWW-Authenticate": 'Basic realm="Fund Dashboard", charset="UTF-8"',
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end("Authentication required");
}

function readState() {
  try {
    const data = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    const cash = Number(data.cash);
    const pendingBuy = Number(data.pendingBuy);
    const pendingSell = Number(data.pendingSell);
    return {
      ...defaultState,
      ...data,
      cash: Number.isFinite(cash) && cash >= 0 ? cash : defaultState.cash,
      pendingBuy: Number.isFinite(pendingBuy) && pendingBuy >= 0 ? pendingBuy : defaultState.pendingBuy,
      pendingSell: Number.isFinite(pendingSell) && pendingSell >= 0 ? pendingSell : defaultState.pendingSell,
    };
  } catch {
    return { ...defaultState };
  }
}

function writeState(nextState) {
  fs.writeFileSync(STATE_FILE, `${JSON.stringify(nextState, null, 2)}\n`, "utf8");
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Referer: "https://fund.eastmoney.com/",
    },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.text();
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Referer: options.referer || "https://fund.eastmoney.com/",
    },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

async function fetchTextWithTimeout(url, options = {}, timeoutMs = 6000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0",
        Referer: options.referer || "https://www.bing.com/",
      },
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function extractVar(text, key) {
  const match = text.match(new RegExp(`var\\s+${key}\\s*=\\s*"([^"]*)"`));
  return match ? match[1] : "";
}

function extractExpression(text, key) {
  const marker = `var ${key} =`;
  const startIndex = text.indexOf(marker);
  if (startIndex < 0) return null;
  const start = text.indexOf("=", startIndex) + 1;
  const end = text.indexOf(";", start);
  return text.slice(start, end).trim();
}

function parseJsExpression(expr) {
  if (!expr) return null;
  return Function(`"use strict"; return (${expr});`)();
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function fetchFund(code) {
  try {
    const text = await fetchText(`https://fund.eastmoney.com/pingzhongdata/${code}.js?v=${Date.now()}`);
    const trend = parseJsExpression(extractExpression(text, "Data_netWorthTrend")) || [];
    const latest = trend.at(-1) || {};
    return {
      code,
      name: extractVar(text, "fS_name"),
      date: latest.x ? new Date(latest.x + 8 * 3600 * 1000).toISOString().slice(0, 10) : "",
      nav: toNumber(latest.y),
      dailyPct: toNumber(latest.equityReturn),
      rates: {
        m1: toNumber(extractVar(text, "syl_1y")),
        m3: toNumber(extractVar(text, "syl_3y")),
        m6: toNumber(extractVar(text, "syl_6y")),
        y1: toNumber(extractVar(text, "syl_1n")),
      },
    };
  } catch (error) {
    return { code, error: error.message, rates: {} };
  }
}

function secidToTencentSymbol(secid) {
  const [market, code] = secid.split(".");
  return `${market === "1" ? "sh" : "sz"}${code}`;
}

function tencentSymbolToSecid(symbol) {
  const market = symbol.startsWith("sh") ? "1" : "0";
  return `${market}.${symbol.slice(2)}`;
}

async function fetchEastmoneyQuotesBatch(secids) {
  if (secids.length === 0) return new Map();
  const fields = "f2,f3,f4,f6,f12,f14,f18,f21,f124,f127";
  const url = `https://push2.eastmoney.com/api/qt/ulist.np/get?fields=${fields}&secids=${secids.join(",")}`;
  const json = await fetchJson(url, { referer: "https://quote.eastmoney.com/" });
  const rawDiff = json.data?.diff;
  const diff = Array.isArray(rawDiff) ? rawDiff : Object.values(rawDiff || {});
  return new Map(diff.map((data) => {
    const priceDivisor = Math.abs(data.f2) > 1000 ? 1000 : 100;
    const quote = {
      code: data.f12,
      name: data.f14,
      price: data.f2 / priceDivisor,
      previousClose: data.f18 / priceDivisor,
      change: data.f4 / priceDivisor,
      changePct: data.f3 / 100,
      amount: data.f6,
      marketValue: data.f21,
      timestamp: data.f124 ? new Date(data.f124 * 1000).toISOString() : null,
      source: "eastmoney",
    };
    const secid = secids.find((item) => item.endsWith(`.${data.f12}`));
    return [secid || data.f12, quote];
  }));
}

async function fetchTencentQuotesBatch(secids) {
  if (secids.length === 0) return new Map();
  const symbols = secids.map(secidToTencentSymbol);
  const response = await fetch(`https://qt.gtimg.cn/q=${symbols.join(",")}`, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Referer: "https://gu.qq.com/",
    },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  const text = await response.text();
  const quoteMap = new Map();
  const regex = /v_([a-z]{2}\d{6})="([^"]*)"/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const symbol = match[1];
    const parts = match[2].split("~");
    const price = toNumber(parts[3]);
    const previousClose = toNumber(parts[4]);
    const change = toNumber(parts[31]);
    const changePct = toNumber(parts[32]);
    if (!Number.isFinite(price) || !Number.isFinite(changePct)) continue;
    quoteMap.set(tencentSymbolToSecid(symbol), {
      code: parts[2] || symbol.slice(2),
      name: parts[1] || symbol,
      price,
      previousClose,
      change,
      changePct,
      amount: toNumber(parts[37]),
      timestamp: parts[30] || null,
      source: "tencent",
    });
  }
  return quoteMap;
}

async function fetchQuotesBatch(secids) {
  let quoteMap = new Map();
  try {
    quoteMap = await fetchEastmoneyQuotesBatch(secids);
  } catch {
    quoteMap = new Map();
  }

  const missing = secids.filter((secid) => !quoteMap.has(secid));
  if (missing.length > 0) {
    try {
      const fallback = await fetchTencentQuotesBatch(missing);
      for (const [secid, quote] of fallback.entries()) quoteMap.set(secid, quote);
    } catch {
      // Leave missing quotes to the fund NAV fallback.
    }
  }

  return quoteMap;
}

async function fetchQuote(secid) {
  if (!secid) return null;
  try {
    const fields = "f43,f44,f45,f46,f47,f48,f57,f58,f60,f169,f170,f171,f168";
    const json = await fetchJson(`https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=${fields}`);
    const data = json.data;
    if (!data) return null;
    const priceDivisor = Math.abs(data.f43) > 1000 ? 1000 : 100;
    return {
      code: data.f57,
      name: data.f58,
      price: data.f43 / priceDivisor,
      previousClose: data.f60 / priceDivisor,
      change: data.f169 / 100,
      changePct: data.f170 / 100,
      amplitude: data.f171 / 100,
      turnover: data.f168 / 100,
      amount: data.f48,
    };
  } catch (error) {
    return { error: error.message };
  }
}

function groupTotals(items) {
  const groups = new Map();
  for (const item of items) {
    groups.set(item.group, (groups.get(item.group) || 0) + item.amount);
  }
  return [...groups.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function pct(value) {
  return `${value.toFixed(2)}%`;
}

function money(value) {
  return `¥${value.toFixed(2)}`;
}

function sumByGroup(rows, groups) {
  return rows
    .filter((row) => groups.includes(row.group))
    .reduce((sum, row) => sum + row.amount, 0);
}

function quoteFor(rows, code) {
  return rows.find((row) => row.code === code)?.intradayPct ?? null;
}

function nextWeekday(date) {
  const next = new Date(date);
  while ([0, 6].includes(next.getDay())) next.setDate(next.getDate() + 1);
  return next;
}

function atLocalTime(date, hour, minute) {
  const next = new Date(date);
  next.setHours(hour, minute, 0, 0);
  return next;
}

function nextTradingReviewAt(now = new Date()) {
  const day = now.getDay();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const reviewMinute = 14 * 60 + 50;
  let target = new Date(now);

  if ([0, 6].includes(day)) {
    target.setDate(target.getDate() + 1);
    target = nextWeekday(target);
    return atLocalTime(target, 14, 50);
  }

  if (minutes < reviewMinute) return atLocalTime(target, 14, 50);

  target.setDate(target.getDate() + 1);
  target = nextWeekday(target);
  return atLocalTime(target, 14, 50);
}

function nextDailyEmailAt(now = new Date()) {
  const target = atLocalTime(now, 21, 0);
  if (now >= target) target.setDate(target.getDate() + 1);
  return target;
}

function buildReminderMeta(now = new Date()) {
  const nextReviewAt = nextTradingReviewAt(now);
  const nextEmailAt = nextDailyEmailAt(now);
  return {
    updatedAt: now.toISOString(),
    nextReviewAt: nextReviewAt.toISOString(),
    nextEmailAt: nextEmailAt.toISOString(),
    refreshSeconds: 15,
    reminderText: `页面每15秒刷新；下一次交易复核 ${formatLocalDateTime(nextReviewAt)}；每日邮件 ${formatLocalDateTime(nextEmailAt)}。`,
  };
}

function formatLocalDateTime(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function decodeHtml(value = "") {
  return value
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function stripHtml(value = "") {
  return decodeHtml(value)
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTag(block, tag) {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? stripHtml(match[1]) : "";
}

function extractRssItems(xml) {
  const blocks = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((match) => match[1]);
  return blocks.map((block) => ({
    title: extractTag(block, "title"),
    link: extractTag(block, "link"),
    description: extractTag(block, "description"),
    pubDate: extractTag(block, "pubDate"),
  })).filter((item) => item.title || item.description);
}

function sourceFromLink(link) {
  try {
    const hostname = new URL(link).hostname.replace(/^www\./, "");
    if (hostname.includes("douyin")) return "抖音公开页";
    if (hostname.includes("xueqiu")) return "雪球";
    if (hostname.includes("eastmoney")) return "东方财富";
    if (hostname.includes("weibo")) return "微博";
    if (hostname.includes("zhihu")) return "知乎";
    if (hostname.includes("bing")) return "必应搜索";
    return hostname;
  } catch {
    return "公开网页";
  }
}

function opinionStance(text) {
  const positiveWords = ["看好", "机会", "修复", "反弹", "企稳", "上行", "景气", "利好", "突破", "增持", "国产替代", "订单", "放量"];
  const negativeWords = ["谨慎", "风险", "回调", "下跌", "承压", "减仓", "高位", "亏损", "利空", "不及预期", "杀跌", "观望"];
  const positive = positiveWords.reduce((sum, word) => sum + (text.includes(word) ? 1 : 0), 0);
  const negative = negativeWords.reduce((sum, word) => sum + (text.includes(word) ? 1 : 0), 0);
  if (positive >= negative + 2) return "偏多";
  if (negative >= positive + 2) return "偏空";
  return "谨慎";
}

function opinionTags(text) {
  const tags = ["半导体设备", "芯片", "科创芯片", "HBM", "存储", "AI算力", "机器人", "军工", "创新药", "沪深300", "红利", "黄金", "债券"];
  return tags.filter((tag) => text.toLowerCase().includes(tag.toLowerCase()));
}

function opinionActionFields(item) {
  const sector = item.sector || "";
  const stance = item.stance || "待确认";
  const status = item.status || "empty";
  const isPositive = stance === "偏多";
  const isNegative = stance === "偏空";

  if (status !== "ok") {
    return {
      suggestion: "暂不作为交易依据；继续按持仓明细、卖出预警和14:50复核执行。",
      forwardView: "下一轮若仍未命中有效观点，建议指定具体抖音、雪球、微博账号加入追踪，减少无效搜索噪音。",
    };
  }

  if (["半导体设备", "芯片ETF", "半导体芯片", "HBM/存储"].some((keyword) => sector.includes(keyword))) {
    return {
      suggestion: isPositive
        ? "可作为半导体设备/芯片企稳的辅助信号，但只适合小额确认，不追高；若14:50回落，取消补仓。"
        : isNegative
          ? "优先控制芯片和半导体设备仓位，不补仓；若盘中转弱，按卖出预警处理。"
          : "维持观察，半导体相关仓位已经不低，先看成交放量和尾盘能否守住涨幅。",
      forwardView: "重点跟踪HBM、DRAM/NAND、先进封装、半导体设备订单和国产替代链；如果连续两天强于芯片ETF，可提高020640优先级。",
    };
  }

  if (sector.includes("AI算力")) {
    return {
      suggestion: isPositive
        ? "AI算力可列为第二补仓方向，但必须排在半导体设备确认之后，单次控制在50-100元级别。"
        : "AI算力与芯片相关性高，若芯片回落，AI不单独补仓。",
      forwardView: "后续看算力基础设施、光模块、服务器、电网设备和云资本开支；若美股AI链继续强，QDII和AI算力会一起受益。",
    };
  }

  if (sector.includes("机器人")) {
    return {
      suggestion: isPositive
        ? "机器人可继续持有观察，不建议追涨补仓，等连续两天强于宽基再考虑小额。"
        : "机器人先保持观察仓，不加仓；若板块继续弱于AI和半导体，资金优先给更强方向。",
      forwardView: "前瞻看人形机器人产业订单、减速器/传感器/控制器链条和政策催化；板块弹性高，适合等确认不适合预判重仓。",
    };
  }

  if (sector.includes("军工")) {
    return {
      suggestion: "军工仓位小，当前以持有观察为主；不作为今日补仓第一方向。",
      forwardView: "后续看航天、低空经济、军贸订单和事件催化；若没有放量突破，继续小仓位跟踪即可。",
    };
  }

  if (sector.includes("创新药")) {
    return {
      suggestion: isPositive
        ? "创新药可继续持有，但仓位小即可；短期不和半导体抢补仓资金。"
        : "创新药继续观察，不加仓；若港股医药继续弱，保留小仓即可。",
      forwardView: "前瞻看医保谈判、BD出海、港股流动性和创新药ETF资金流；若政策和港股风险偏好改善，再提高关注。",
    };
  }

  if (sector.includes("沪深300")) {
    return {
      suggestion: isNegative
        ? "若沪深300温和回调且未恐慌，可作为稳健补仓方向，优先级高于继续堆芯片。"
        : "宽基上涨不追，继续作为底仓持有；回调时再小额补。",
      forwardView: "前瞻看政策预期、外资流向、权重股成交和指数能否站稳均线；宽基用于降低主题基金波动。",
    };
  }

  if (sector.includes("红利") || sector.includes("黄金") || sector.includes("债券")) {
    return {
      suggestion: "防守资产继续保留，不为了追科技线全部削掉；上涨时不追，回落再看。"
      ,
      forwardView: "前瞻看利率、避险情绪和红利拥挤度；若科技线波动加大，红利/债券/黄金仍是组合缓冲。",
    };
  }

  return {
    suggestion: "作为辅助信息，不直接触发买卖；最终仍以持仓盈亏、代理涨跌和14:50复核为准。",
    forwardView: "后续关注观点是否连续出现、是否与盘面强弱一致，以及是否能转化成明确的加仓或减仓条件。",
  };
}

async function fetchBingRss(query) {
  const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&format=rss&mkt=zh-CN&cc=CN`;
  const xml = await fetchTextWithTimeout(url, { referer: "https://www.bing.com/" }, 6000);
  return extractRssItems(xml);
}

function isRelevantOpinion(item, watcher) {
  const text = `${item.title || ""} ${item.description || ""}`.toLowerCase();
  const link = String(item.link || "").toLowerCase();
  if (blockedOpinionDomains.some((domain) => link.includes(domain))) return false;
  const keywords = watcher.keywords || [watcher.sector];
  const keywordHit = keywords.some((keyword) => text.includes(String(keyword).toLowerCase()));
  const financeHit = ["etf", "基金", "财经", "投资", "股市", "证券", "板块", "行情", "观点", "分析", "讨论", "减仓", "加仓"].some((word) => text.includes(word.toLowerCase()));
  const notReference = !["是什么", "百科", "词条", "definition", "行情中心", "行情_"].some((word) => text.includes(word.toLowerCase()));
  return keywordHit && financeHit && notReference;
}

async function fetchOpinionForWatcher(watcher) {
  try {
    const items = await fetchBingRss(watcher.query);
    const item = items.find((candidate) => isRelevantOpinion(candidate, watcher)) || {};
    const text = `${item.title || ""} ${item.description || ""}`;
    const stance = opinionStance(text);
    const tags = opinionTags(`${watcher.sector} ${text}`);
    const result = {
      ...watcher,
      source: sourceFromLink(item.link),
      title: item.title || `${watcher.sector} 本轮未命中有效公开观点`,
      summary: item.description || "搜索结果未通过板块相关性过滤，下一轮会自动重试；你也可以指定具体抖音/雪球/微博账号加入追踪。",
      link: item.link || `https://www.bing.com/search?q=${encodeURIComponent(watcher.query)}`,
      pubDate: item.pubDate || "",
      stance: item.title ? stance : "待确认",
      tags,
      updatedAt: new Date().toISOString(),
      status: item.title ? "ok" : "empty",
    };
    return {
      ...result,
      ...opinionActionFields(result),
    };
  } catch (error) {
    const result = {
      ...watcher,
      source: watcher.name,
      title: `${watcher.sector} 公开观点抓取失败`,
      summary: `本轮搜索失败：${error.message}。页面会在下一轮自动重试。`,
      link: "",
      pubDate: "",
      stance: "待确认",
      tags: [watcher.sector],
      updatedAt: new Date().toISOString(),
      status: "error",
    };
    return {
      ...result,
      ...opinionActionFields(result),
    };
  }
}

function buildOpinionConsensus(items) {
  const validItems = items.filter((item) => item.status === "ok");
  const sourceItems = validItems.length > 0 ? validItems : items;
  const counts = validItems.reduce((acc, item) => {
    acc[item.stance] = (acc[item.stance] || 0) + 1;
    return acc;
  }, {});
  const tagCounts = new Map();
  for (const item of sourceItems) {
    for (const tag of item.tags || []) tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
  }
  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag, count]) => ({ tag, count }));
  const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "待确认";
  const summary = validItems.length === 0
    ? "本轮未抓到足够相关的公开博主观点，暂不作为交易依据；下一轮自动重试。"
    : validItems.length < 3
      ? `本轮仅命中${validItems.length}个相关公开观点，不足以形成可靠共识；暂以持仓风险预警为主。`
    : dominant === "偏多"
    ? "公开观点偏积极，但你的科技仓位已经偏高，适合看确认信号，不适合无脑追。"
    : dominant === "偏空"
      ? "公开观点偏谨慎，优先控制半导体/芯片仓位回撤。"
      : "公开观点分歧较大，适合以仓位控制和14:50复核为主。";
  return {
    dominant,
    counts,
    topTags,
    validCount: validItems.length,
    totalCount: items.length,
    summary,
    commonPoints: topTags.map((item) => `${item.tag} 被 ${item.count} 个来源反复提到`),
  };
}

async function buildOpinionTracker() {
  const now = Date.now();
  if (opinionCache && now - opinionCache.cachedAt < OPINION_TTL_MS) return opinionCache.payload;

  const items = await Promise.all(opinionWatchers.map(fetchOpinionForWatcher));
  const updatedAt = new Date().toISOString();
  const nextRefreshAt = new Date(Date.now() + OPINION_TTL_MS).toISOString();
  const payload = {
    updatedAt,
    nextRefreshAt,
    refreshMinutes: OPINION_TTL_MS / 60_000,
    sourceNote: "优先抓取公开网页/搜索结果；抖音私域或登录态内容无法稳定自动抓取，后续可按指定账号补充。",
    consensus: buildOpinionConsensus(items),
    items,
  };
  opinionCache = { cachedAt: now, payload };
  return payload;
}

function recommendationFor(row) {
  const pctMove = row.intradayPct;
  if (row.code === "020640") {
    if (Number.isFinite(pctMove) && pctMove <= -4) return "持有，等企稳；若午后收回跌幅可小额加100元";
    if (Number.isFinite(pctMove) && pctMove > 0) return "持有，已加仓后先看确认，不继续追";
    return "持有，作为半导体设备/材料核心观察仓";
  }
  if (row.code === "027574") return "新仓观察，科创芯片设计弹性高，短期不急着补";
  if (["025209", "008887"].includes(row.code)) {
    if (Number.isFinite(pctMove) && pctMove <= -3) return "持有，不补；半导体仓位已高";
    return "持有；反弹后再看是否轻止盈";
  }
  if (row.code === "021580") return "持有，金额小；AI算力回调企稳后再补";
  if (row.code === "014880") return "持有，等机器人板块连续止跌";
  if (row.code === "003017") return "持有，小仓观察，不加仓";
  if (row.code === "110020") return "持有；若沪深300继续回调可小额补";
  if (row.code === "110007") return "持有，保留组合稳定器";
  if (row.code === "007466") return "持有，红利低波继续负责防守";
  if (row.code === "000216") return "持有，不追高，等回落";
  if (row.code === "023598") return "持有，创新药仓位小，继续观察";
  return "持有";
}

function sellAlertFor(row) {
  const day = row.intradayPct;
  const loss = Number.isFinite(row.profitPct) ? row.profitPct : 0;
  const amount = Number.isFinite(row.amount) ? row.amount : 0;
  const tradeTime = "交易日15:00前执行；若已过15:00，下一交易日14:50复核后执行。";
  const liveLine = `实时：代理涨跌${fmtIntraday(day)}，持有收益${pct(loss)}，盘中估算${Number.isFinite(row.estimatedChange) ? money(row.estimatedChange) : "暂无"}。`;

  if (loss <= -12 || (Number.isFinite(day) && day <= -8 && loss <= -6)) {
    const firstSell = amount * 0.5;
    return {
      level: "清仓候选",
      name: row.name,
      code: row.code,
      nowAction: `先卖出${money(firstSell)}，保留最多半仓观察。`,
      sellAmount: `${money(firstSell)}-${money(amount)}`,
      timing: tradeTime,
      nextAction: `如果下一交易日仍弱，卖出剩余部分，清到${money(0)}。`,
      action: `现在先卖出${money(firstSell)}；若下一交易日仍弱，清掉剩余仓位。`,
      liveLine,
      reason: `持有亏损${pct(loss)}，代理盘中${fmtIntraday(day)}，说明方向和持仓成本同时承压。`,
    };
  }

  if (["020640", "008887"].includes(row.code) && (loss <= -5 || (Number.isFinite(day) && day <= -5))) {
    const firstSell = amount * 0.3;
    const secondSell = amount * 0.2;
    const isRebounding = Number.isFinite(day) && day >= 1;
    const isFlat = Number.isFinite(day) && day > -1 && day < 1;
    const level = isRebounding ? "减仓观察" : isFlat ? "减仓待确认" : "减仓预警";
    const nowAction = isRebounding
      ? "暂不卖，先看反弹能否持续；不补仓。"
      : isFlat
        ? "暂不卖，等14:50确认强弱；不补仓。"
        : `先卖出${money(firstSell)}，不再补仓。`;
    const sellAmount = isRebounding || isFlat
      ? `当前¥0.00；若14:50转弱，卖${money(firstSell)}起，最多${money(amount * 0.5)}`
      : `${money(firstSell)}起，最多${money(amount * 0.5)}`;
    const timing = isRebounding || isFlat
      ? "今天14:50复核；若代理涨幅回落到0%附近或转跌，再执行减仓。"
      : tradeTime;
    const nextAction = isRebounding
      ? `如果14:50涨幅不能维持在+1%以上或明天转跌，再卖${money(firstSell)}；若亏损扩大到-8%，再加卖${money(secondSell)}。`
      : isFlat
        ? `如果14:50转跌或明天继续弱，再卖${money(firstSell)}；若亏损扩大到-8%，把减仓提高到50%。`
        : `明天14:50如果仍跌或持有亏损扩大到-8%，再卖${money(secondSell)}，把减仓提高到50%。`;
    return {
      level,
      name: row.name,
      code: row.code,
      nowAction,
      sellAmount,
      timing,
      nextAction,
      action: nowAction,
      liveLine,
      reason: isRebounding
        ? "持有亏损仍超过-5%，但盘中代理正在反弹；先不在反弹中卖低价，等14:50确认是否冲高回落。"
        : "半导体设备/芯片仓位已经偏高，亏损继续扩大时优先控制回撤，而不是摊平成本。",
    };
  }

  if (row.code === "027574" && Number.isFinite(day) && day <= -5) {
    return {
      level: "新仓观察",
      name: row.name,
      code: row.code,
      nowAction: "不加仓；如果可卖，先不急卖，观察到下一交易日14:50。",
      sellAmount: money(amount),
      timing: "下一交易日14:50检查；如果今天买入仍待确认，等可卖后按同一规则处理。",
      nextAction: `如果明天仍跌超3%或继续弱于芯片ETF，卖出全部${money(amount)}新仓。`,
      action: `现在不卖；明天14:50仍弱就卖出全部${money(amount)}。`,
      liveLine,
      reason: "科创芯片设计弹性很高，新仓试错成本要低，不能刚买就连续补。",
    };
  }

  if (row.code === "025209" && loss >= 10 && Number.isFinite(day) && day <= -3) {
    const firstSell = Math.min(200, amount * 0.25);
    const secondSell = Math.min(150, amount * 0.18);
    return {
      level: "止盈保护",
      name: row.name,
      code: row.code,
      nowAction: `先止盈${money(firstSell)}，锁住一部分利润。`,
      sellAmount: money(firstSell),
      timing: tradeTime,
      nextAction: `如果明天半导体ETF继续跌超2%或该基金收益回落到+8%附近，再止盈${money(secondSell)}。`,
      action: `现在先止盈${money(firstSell)}；若明天继续弱，再止盈${money(secondSell)}。`,
      liveLine,
      reason: `当前仍有${pct(loss)}收益，是组合主要利润来源，板块转弱时先保护利润。`,
    };
  }

  if (["021580", "014880", "003017", "023598"].includes(row.code) && loss <= -6) {
    const firstSell = amount * 0.3;
    return {
      level: "减仓观察",
      name: row.name,
      code: row.code,
      nowAction: "先不卖，保留观察仓。",
      sellAmount: money(firstSell),
      timing: "下一交易日14:50检查。",
      nextAction: `如果继续跌破-8%，卖出${money(firstSell)}左右。`,
      action: `现在不卖；跌破-8%时卖出${money(firstSell)}。`,
      liveLine,
      reason: "主题基金不是核心仓，持续跑弱时要让位给现金或宽基。",
    };
  }

  return null;
}

function fmtIntraday(value) {
  return Number.isFinite(value) ? pct(value) : "无实时代理数据";
}

function buildSellAlerts(rows) {
  const alerts = rows.map(sellAlertFor).filter(Boolean);
  if (alerts.length > 0) return alerts;
  return [
    {
      level: "暂无平仓信号",
      name: "组合整体",
      code: "portfolio",
      nowAction: "不需要卖出。",
      sellAmount: "¥0.00",
      timing: "继续按15秒实时看板观察。",
      nextAction: "触发减仓或清仓规则时，本模块会直接给出卖出金额。",
      action: "当前没有必须平仓的触发项；继续观察半导体设备、芯片和AI方向。",
      liveLine: "实时：暂无减仓或清仓触发，页面每15秒重算一次。",
      reason: "卖出规则未触发：单日代理跌幅、持有亏损和主题集中风险尚未同时恶化。",
    },
  ];
}

function rowByCode(rows, code) {
  return rows.find((row) => row.code === code) || null;
}

function buyLiveLine(row) {
  if (!row) return "实时：暂无对应代理数据。";
  const estimated = Number.isFinite(row.estimatedChange) ? money(row.estimatedChange) : "暂无";
  return `实时：代理涨跌${fmtIntraday(row.intradayPct)}，持有收益${pct(row.profitPct || 0)}，盘中估算${estimated}。`;
}

function buyLimit(cashAmount, maxAmount, reserveAmount = 50) {
  if (cashAmount <= 0) return 0;
  if (cashAmount <= reserveAmount) return Math.min(cashAmount, maxAmount);
  return Math.min(cashAmount - reserveAmount, maxAmount);
}

function buyRangeText(amount) {
  if (amount <= 0) return "¥0.00";
  const floor = Math.min(50, amount);
  return amount <= floor ? money(amount) : `${money(floor)}-${money(amount)}`;
}

function buildBuyOpportunities(rows, cashAmount, context) {
  const cash = Number.isFinite(cashAmount) ? cashAmount : 0;
  const total = context.total || rows.reduce((sum, row) => sum + row.amount, 0) + cash;
  const hardTechRatio = total > 0 ? context.hardTechAmount / total * 100 : 0;
  const semiEquipment = rowByCode(rows, "020640");
  const chip = rowByCode(rows, "008887");
  const pioneerSemi = rowByCode(rows, "025209");
  const hs300 = rowByCode(rows, "110020");
  const ai = rowByCode(rows, "021580");
  const items = [];
  const reserveTarget = cash > 100 ? 50 : 0;
  let plannedBuy = 0;

  function commitBuyAmount(maxAmount) {
    const available = Math.max(0, cash - reserveTarget - plannedBuy);
    const amount = Math.min(available, maxAmount);
    plannedBuy += amount;
    return amount;
  }

  function previewBuyAmount(maxAmount) {
    return Math.min(Math.max(0, cash - reserveTarget - plannedBuy), maxAmount);
  }

  if (cash <= 0) {
    return [{
      level: "暂无补仓",
      sector: "机会资金",
      name: "现金不足",
      code: "cash",
      nowAction: "当前没有可分配机会资金，不补仓。",
      buyAmount: "¥0.00",
      timing: "等你新增机会资金后，本模块会自动重算。",
      trigger: "机会资金大于0。",
      liveLine: "实时：机会资金为¥0.00。",
      nextAction: "保持持仓观察，优先处理卖出/减仓预警。",
      reason: "补仓必须先有可用现金，不能为了补仓被动提高组合风险。",
    }];
  }

  if (context.hasHardSellAlert) {
    return [{
      level: "暂停补仓",
      sector: "风险控制",
      name: "组合整体",
      code: "portfolio",
      nowAction: "先不补仓，优先处理减仓/清仓信号。",
      buyAmount: "¥0.00",
      timing: "等卖出预警解除后再看补仓。",
      trigger: "减仓预警消失，且科技线不再继续放量下跌。",
      liveLine: `实时：硬科技仓位约${pct(hardTechRatio)}，机会资金${money(cash)}。`,
      nextAction: "下一次刷新若预警解除，会重新列出补仓候选。",
      reason: "出现硬性卖出风险时继续补仓，会把亏损方向越加越重。",
    }];
  }

  const semiCap = previewBuyAmount(hardTechRatio >= 35 ? 80 : 100);
  const semiDay = semiEquipment?.intradayPct;
  const chipDay = chip?.intradayPct;
  const pioneerDay = pioneerSemi?.intradayPct;
  if (semiEquipment && semiCap > 0) {
    if (Number.isFinite(semiDay) && semiDay >= 2 && [chipDay, pioneerDay].some((value) => Number.isFinite(value) && value > 0)) {
      const amount = commitBuyAmount(hardTechRatio >= 35 ? 80 : 100);
      items.push({
        level: "条件补仓",
        sector: "半导体设备/存储链",
        name: semiEquipment.name,
        code: semiEquipment.code,
        nowAction: "现在不追，等14:50确认；若反弹没有明显回落，再小额补仓。",
        buyAmount: buyRangeText(amount),
        timing: "今天14:50复核；15:00前执行，过时则下一交易日14:50再确认。",
        trigger: "020640代理涨幅维持+2%以上，同时芯片/半导体主线没有转跌。",
        liveLine: buyLiveLine(semiEquipment),
        nextAction: `若14:50涨幅仍强，补${buyRangeText(amount)}；若回落到+1%以下或转跌，今天不补。`,
        reason: "这个方向最贴近你关注的存储、芯片、半导体设备和国产替代，但已有仓位亏损，必须等企稳确认。",
      });
    } else if (Number.isFinite(semiDay) && semiDay > 0) {
      const amount = previewBuyAmount(50);
      items.push({
        level: "观察补仓",
        sector: "半导体设备/存储链",
        name: semiEquipment.name,
        code: semiEquipment.code,
        nowAction: "暂不补，等反弹强度提高或连续两次刷新维持上涨。",
        buyAmount: buyRangeText(Math.min(semiCap, 50)),
        timing: "14:50复核；若强度不足则继续留现金。",
        trigger: "代理涨幅提高到+2%以上，且芯片主线同步走强。",
        liveLine: buyLiveLine(semiEquipment),
        nextAction: "若强度确认，只补50元级别；若转弱，不补并继续看卖出预警。",
        reason: "半导体设备仍是优先板块，但当前不适合连续追同一方向。",
      });
    } else {
      items.push({
        level: "暂不补仓",
        sector: "半导体设备/存储链",
        name: semiEquipment.name,
        code: semiEquipment.code,
        nowAction: "不补仓，等止跌。",
        buyAmount: "¥0.00",
        timing: "下一次15秒刷新继续观察。",
        trigger: "由跌转稳，或14:50仍能收回到0%以上。",
        liveLine: buyLiveLine(semiEquipment),
        nextAction: "若继续下跌，先看减仓预警，不做摊平成本。",
        reason: "补仓不是越跌越买，亏损仓需要先确认止跌。",
      });
    }
  }

  const hs300Cap = previewBuyAmount(100);
  const hs300Day = hs300?.intradayPct;
  if (hs300 && hs300Cap > 0) {
    if (Number.isFinite(hs300Day) && hs300Day <= -0.5 && hs300Day > -2) {
      const amount = commitBuyAmount(100);
      items.push({
        level: "稳健补仓",
        sector: "宽基核心",
        name: hs300.name,
        code: hs300.code,
        nowAction: `可小额补${buyRangeText(amount)}，优先级高于继续堆芯片。`,
        buyAmount: buyRangeText(amount),
        timing: "交易日15:00前执行；若已过15:00，下一交易日再看。",
        trigger: "沪深300温和回调但没有恐慌式下跌。",
        liveLine: buyLiveLine(hs300),
        nextAction: "若跌幅扩大到-2%附近，先不补，等待更低成本。",
        reason: "宽基可以降低组合过度依赖半导体的风险。",
      });
    } else {
      items.push({
        level: "候选观察",
        sector: "宽基核心",
        name: hs300.name,
        code: hs300.code,
        nowAction: "当前不追，等回调再补。",
        buyAmount: "¥0.00",
        timing: "盘中回调到-0.5%到-1.5%区间时再看。",
        trigger: "沪深300出现温和回调，且科技线没有硬性减仓预警。",
        liveLine: buyLiveLine(hs300),
        nextAction: "若宽基转为温和回调，补50-100元作为组合底仓。",
        reason: "沪深300是组合底仓，不适合追涨，但适合在回调中慢慢补。",
      });
    }
  }

  const aiCap = previewBuyAmount(hardTechRatio >= 35 ? 50 : 80);
  const aiDay = ai?.intradayPct;
  if (ai) {
    const aiCanBuy = aiCap > 0 && Number.isFinite(aiDay) && aiDay >= 2 && hardTechRatio < 38;
    const amount = aiCanBuy ? commitBuyAmount(hardTechRatio >= 35 ? 50 : 80) : 0;
    items.push({
      level: aiCanBuy ? "小额候选" : "观察候选",
      sector: "AI算力/机器人链",
      name: ai.name,
      code: ai.code,
      nowAction: aiCanBuy
        ? `只适合小额补${buyRangeText(amount)}，不能替代半导体风控。`
        : "先观察，不作为今天第一补仓方向。",
      buyAmount: aiCanBuy ? buyRangeText(amount) : "¥0.00",
      timing: "等半导体设备确认强度后，再决定是否轮到AI算力。",
      trigger: "AI算力代理涨幅维持+2%以上，且半导体设备没有转弱。",
      liveLine: buyLiveLine(ai),
      nextAction: "若科技线同步强，可补50元级别；若半导体回落，AI也不补。",
      reason: "AI算力和芯片相关性高，不能和半导体亏损仓一起无节制加。",
    });
  }

  const remainingCash = Math.max(0, cash - plannedBuy);
  if (remainingCash > 0 || plannedBuy === 0) {
    items.push({
      level: "现金底仓",
      sector: "机会资金",
      name: "保留现金",
      code: "cash",
      nowAction: `保留${money(remainingCash)}，等下一次更明确机会。`,
      buyAmount: money(remainingCash),
      timing: "全天保留，不强制买满。",
      trigger: "半导体设备或宽基出现更便宜、更明确的买点。",
      liveLine: `实时：当前机会资金${money(cash)}，硬科技仓位约${pct(hardTechRatio)}。`,
      nextAction: "如果14:50没有满足补仓条件，今天就保留现金。",
      reason: "你目前仍有半导体/芯片亏损仓，现金本身就是风险缓冲。",
    });
  }

  return items.slice(0, 4);
}

function allocationPlanForCash(cashAmount, flags) {
  if (cashAmount <= 0) {
    return {
      summary: "当前没有待分配机会资金。",
      items: [],
    };
  }

  if (cashAmount <= 150 && (flags.severeSemi || flags.weakSemi)) {
    return {
      summary: `你已动用300元机会资金，剩余${money(cashAmount)}先保留，等半导体设备和科创芯片确认企稳。`,
      items: [
        { code: "cash", name: "继续保留", amount: cashAmount, reason: "今天已经补过020640和科创芯片设计，剩余资金不继续追，留给下一次更明确的回踩或放量企稳。" },
      ],
    };
  }

  if (flags.severeSemi) {
    const first = Math.min(100, cashAmount);
    return {
      summary: `半导体仍在明显回调，建议只动用${money(first)}试探，其余继续保留。`,
      items: [
        { code: "020640", name: "广发半导体设备ETF联接C", amount: first, reason: "更贴近设备材料、先进封装和国产替代链；只适合小额试探。" },
        { code: "cash", name: "继续保留", amount: cashAmount - first, reason: "等待芯片/半导体放量下跌结束或出现企稳信号。" },
      ].filter((item) => item.amount > 0),
    };
  }

  if (flags.weakSemi) {
    const first = Math.min(150, cashAmount);
    const second = Math.min(100, Math.max(0, cashAmount - first));
    return {
      summary: `可动用${money(first + second)}以内，分散到半导体设备和AI算力，剩余保留。`,
      items: [
        { code: "020640", name: "广发半导体设备ETF联接C", amount: first, reason: "半导体设备进入观察买点，但不能重仓。" },
        { code: "021580", name: "华夏人工智能ETF联接D", amount: second, reason: "AI算力链与芯片相关，但比单一半导体略分散。" },
        { code: "cash", name: "继续保留", amount: cashAmount - first - second, reason: "防止继续下跌后没有资金。" },
      ].filter((item) => item.amount > 0),
    };
  }

  if (flags.marketWeak) {
    const first = Math.min(120, cashAmount);
    return {
      summary: `宽基偏弱，优先考虑${money(first)}补沪深300，其余等待。`,
      items: [
        { code: "110020", name: "易方达沪深300ETF联接A", amount: first, reason: "比继续加主题基金更稳，适合作为回调补核心仓。" },
        { code: "cash", name: "继续保留", amount: cashAmount - first, reason: "等待科技线企稳。" },
      ].filter((item) => item.amount > 0),
    };
  }

  return {
    summary: "当前没有必须动用的信号，机会资金以保留为主。",
    items: [
      { code: "cash", name: "继续保留", amount: cashAmount, reason: "等待半导体设备、AI算力或沪深300出现更明确买点。" },
    ],
  };
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(max, Math.max(min, value));
}

function trendTone(score) {
  if (score >= 3) return "strong";
  if (score >= 1) return "positive";
  if (score > -1) return "neutral";
  if (score > -3) return "weak";
  return "danger";
}

function trendLabel(score) {
  if (score >= 3) return "偏强延续";
  if (score >= 1) return "震荡向上";
  if (score > -1) return "横盘观察";
  if (score > -3) return "震荡偏弱";
  return "风险释放";
}

function riskLevelFromWeight(weightPct) {
  if (weightPct >= 28) return "高";
  if (weightPct >= 15) return "中高";
  if (weightPct >= 8) return "中";
  return "低";
}

function rowTrendScore(row) {
  const daily = Number.isFinite(row.intradayPct) ? row.intradayPct : row.fundDailyPct || 0;
  const month = Number.isFinite(row.fund?.rates?.m1) ? row.fund.rates.m1 : 0;
  const year = Number.isFinite(row.fund?.rates?.y1) ? row.fund.rates.y1 : 0;
  const profit = Number.isFinite(row.profitPct) ? row.profitPct : 0;
  const crowdedPenalty = ["半导体", "科创芯片", "半导体设备", "AI算力", "机器人"].includes(row.group) && profit > 15 ? -0.8 : 0;
  const lossPenalty = profit <= -8 ? -1.2 : profit <= -5 ? -0.6 : 0;
  return {
    short: daily * 0.85 + clamp(month, -25, 35) / 12 + crowdedPenalty + lossPenalty,
    middle: daily * 0.35 + clamp(month, -25, 35) / 7 + clamp(year, -30, 120) / 45 + crowdedPenalty + lossPenalty,
    long: clamp(month, -25, 35) / 12 + clamp(year, -30, 120) / 28 + crowdedPenalty + lossPenalty,
  };
}

function summarizeWindow(score, windowName, groupName) {
  const label = trendLabel(score);
  if (windowName === "3天") {
    if (score >= 3) return `${groupName}短线偏强，但只看延续，不追高。`;
    if (score >= 1) return `${groupName}有修复机会，重点看14:50能否稳住。`;
    if (score > -1) return `${groupName}大概率震荡，先观察方向选择。`;
    if (score > -3) return `${groupName}短线偏弱，暂不加仓。`;
    return `${groupName}仍在释放风险，先看减仓/止损规则。`;
  }
  if (windowName === "7天") {
    if (score >= 3) return `${label}，适合持有观察，不适合一次性加满。`;
    if (score >= 1) return `${label}，可等回踩后小额参与。`;
    if (score > -1) return `${label}，等待资金重新选择方向。`;
    if (score > -3) return `${label}，先降低补仓频率。`;
    return `${label}，若继续走弱要优先控回撤。`;
  }
  if (score >= 3) return `15天看仍有趋势惯性，但要设置止盈保护。`;
  if (score >= 1) return `15天看偏修复，适合作为观察仓继续跟踪。`;
  if (score > -1) return `15天看胜率一般，等更明确的板块信号。`;
  if (score > -3) return `15天看仍需修复，反弹优先看质量。`;
  return `15天看风险未充分解除，不能用补仓替代风控。`;
}

function groupFutureAction(groupName, score, weightPct) {
  const risk = riskLevelFromWeight(weightPct);
  if (["半导体", "科创芯片", "半导体设备", "AI算力", "机器人"].includes(groupName) && risk !== "低") {
    if (score >= 1) return `持有为主，若要加仓只允许50-100元级别，避免科技仓继续过重。`;
    return `不补仓，等板块止跌或回到强势后再评估；若转弱，先保护利润和本金。`;
  }
  if (["宽基", "美股宽基"].includes(groupName)) {
    return score >= -1 ? "可作为组合底仓继续持有，回调时优先级高于继续堆主题基金。" : "先持有，等指数企稳再小额补。";
  }
  if (["债券", "红利低波", "黄金"].includes(groupName)) {
    return "继续作为防守仓，不因科技线短期波动而轻易砍掉。";
  }
  if (score < -2) return "保留观察仓，若亏损继续扩大到规则线再减仓。";
  return "持有观察，暂不作为第一补仓方向。";
}

function buildFutureTrends(rows, context) {
  const total = context.total || rows.reduce((sum, row) => sum + row.amount, 0);
  const groupMap = new Map();
  rows.forEach((row) => {
    const current = groupMap.get(row.group) || {
      group: row.group,
      amount: 0,
      profit: 0,
      estimated: 0,
      shortScore: 0,
      middleScore: 0,
      longScore: 0,
      weightedMonth: 0,
      rows: [],
    };
    const scores = rowTrendScore(row);
    const amount = Number.isFinite(row.amount) ? row.amount : 0;
    current.amount += amount;
    current.profit += Number.isFinite(row.profit) ? row.profit : 0;
    current.estimated += Number.isFinite(row.estimatedChange) ? row.estimatedChange : 0;
    current.shortScore += scores.short * amount;
    current.middleScore += scores.middle * amount;
    current.longScore += scores.long * amount;
    current.weightedMonth += (Number.isFinite(row.fund?.rates?.m1) ? row.fund.rates.m1 : 0) * amount;
    current.rows.push(row);
    groupMap.set(row.group, current);
  });

  const groups = [...groupMap.values()]
    .filter((group) => group.amount >= 40)
    .map((group) => {
      const weightPct = total > 0 ? group.amount / total * 100 : 0;
      const shortScore = group.shortScore / group.amount;
      const middleScore = group.middleScore / group.amount;
      const longScore = group.longScore / group.amount;
      return {
        group: group.group,
        amount: group.amount,
        weightPct,
        profit: group.profit,
        estimated: group.estimated,
        oneMonth: group.weightedMonth / group.amount,
        trend: trendLabel((shortScore + middleScore + longScore) / 3),
        tone: trendTone((shortScore + middleScore + longScore) / 3),
        risk: riskLevelFromWeight(weightPct),
        threeDay: summarizeWindow(shortScore, "3天", group.group),
        sevenDay: summarizeWindow(middleScore, "7天", group.group),
        fifteenDay: summarizeWindow(longScore, "15天", group.group),
        action: groupFutureAction(group.group, middleScore, weightPct),
        members: group.rows
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 3)
          .map((row) => ({ code: row.code, name: row.name })),
      };
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  const watchCandidates = rows
    .map((row) => {
      const scores = rowTrendScore(row);
      const combined = scores.short * 0.4 + scores.middle * 0.4 + scores.long * 0.2;
      const profit = Number.isFinite(row.profitPct) ? row.profitPct : 0;
      const isHighProfit = profit >= 15;
      const isWeakLoss = profit <= -6 || combined <= -2.5;
      const reason = isHighProfit
        ? `盈利较高，未来3-15天重点看止盈保护。`
        : isWeakLoss
          ? `趋势偏弱或亏损扩大，未来一周要观察是否触发减仓。`
          : `仓位有代表性，适合继续跟踪。`;
      const nextMove = isHighProfit
        ? "若反弹无量或转弱，分批止盈；不再追高加仓。"
        : isWeakLoss
          ? "若亏损扩大到-8%到-10%，先减仓30%左右；若企稳再观察。"
          : "持有观察，等3天方向确认后再决定是否补仓。";
      return {
        code: row.code,
        name: row.name,
        group: row.group,
        amount: row.amount,
        profitPct: profit,
        trend: trendLabel(combined),
        tone: trendTone(combined),
        reason,
        nextMove,
      };
    })
    .sort((a, b) => {
      const aPriority = (a.profitPct >= 15 ? 3 : 0) + (a.profitPct <= -6 ? 2 : 0) + Math.min(a.amount / 1000, 2);
      const bPriority = (b.profitPct >= 15 ? 3 : 0) + (b.profitPct <= -6 ? 2 : 0) + Math.min(b.amount / 1000, 2);
      return bPriority - aPriority;
    })
    .slice(0, 6);

  const techRatio = total > 0 ? context.hardTechAmount / total * 100 : 0;
  const defensiveRatio = total > 0 ? context.defensiveAmount / total * 100 : 0;
  const topGroup = groups[0];
  const weakGroups = groups.filter((group) => ["weak", "danger"].includes(group.tone)).slice(0, 2);
  const summary = techRatio >= 32
    ? `未来3-15天核心变量是科技成长仓过重，尤其是半导体、芯片设计、设备和AI链的联动波动。`
    : topGroup
      ? `未来3-15天重点看${topGroup.group}能否延续，组合整体以持有观察为主。`
      : "未来3-15天以观察为主，等待持仓方向重新确认。";

  return {
    updatedAt: context.reminder?.updatedAt,
    summary,
    bias: techRatio >= 32 ? "高波动观察" : "均衡观察",
    windows: [
      { label: "3天", text: weakGroups.length ? `先确认${weakGroups.map((item) => item.group).join("、")}是否止跌，暂不急补。` : "看盘中强弱和14:50收盘前确认，不做追高动作。" },
      { label: "7天", text: "看资金是否继续从防守仓切回成长仓；若没有连续性，主题基金只持有不加仓。" },
      { label: "15天", text: `若科技仓仍超过${pct(techRatio)}附近且波动放大，要逐步把新增资金转向宽基或防守仓。` },
    ],
    metrics: [
      { label: "硬科技占比", value: pct(techRatio), detail: techRatio >= 32 ? "偏高" : "可控" },
      { label: "防守仓占比", value: pct(defensiveRatio), detail: defensiveRatio >= 20 ? "有缓冲" : "偏低" },
      { label: "观察板块数", value: String(groups.length), detail: "按持仓方向聚合" },
    ],
    groups,
    watchlist: watchCandidates,
  };
}

function buildAnalysis(rows, invested, estimatedDayChange, cashAmount, reminder) {
  const total = invested + cashAmount;
  const techAmount = sumByGroup(rows, ["半导体", "科创芯片", "半导体设备", "AI算力", "机器人"]);
  const hardTechAmount = sumByGroup(rows, ["半导体", "科创芯片", "半导体设备", "AI算力"]);
  const defensiveAmount = sumByGroup(rows, ["债券", "红利低波", "黄金"]) + cashAmount;
  const semiEquipmentPct = quoteFor(rows, "020640");
  const chipDesignPct = quoteFor(rows, "027574");
  const chipPct = quoteFor(rows, "008887");
  const aiPct = quoteFor(rows, "021580");
  const hs300Pct = quoteFor(rows, "110020");
  const redLowPct = quoteFor(rows, "007466");

  const weakSemi = [semiEquipmentPct, chipDesignPct, chipPct].some((value) => Number.isFinite(value) && value <= -3);
  const severeSemi = [semiEquipmentPct, chipDesignPct, chipPct].some((value) => Number.isFinite(value) && value <= -5);
  const marketWeak = Number.isFinite(hs300Pct) && hs300Pct <= -0.8;
  const redHolding = Number.isFinite(redLowPct) && redLowPct > 0;
  const allocationPlan = allocationPlanForCash(cashAmount, { severeSemi, weakSemi, marketWeak, redHolding });
  const sellAlerts = buildSellAlerts(rows).map((alert) => ({
    ...alert,
    updatedAt: reminder.updatedAt,
    nextReviewAt: reminder.nextReviewAt,
    nextEmailAt: reminder.nextEmailAt,
    reminderText: reminder.reminderText,
  }));
  const hasHardSellAlert = sellAlerts.some((alert) => ["清仓候选", "减仓预警"].includes(alert.level));
  const buyOpportunities = buildBuyOpportunities(rows, cashAmount, {
    total,
    techAmount,
    hardTechAmount,
    defensiveAmount,
    hasHardSellAlert,
  }).map((item) => ({
    ...item,
    updatedAt: reminder.updatedAt,
    nextReviewAt: reminder.nextReviewAt,
    nextEmailAt: reminder.nextEmailAt,
  }));
  const futureTrends = buildFutureTrends(rows, {
    total,
    techAmount,
    hardTechAmount,
    defensiveAmount,
    cashAmount,
    reminder,
  });

  let stance = "观察为主";
  let headline = `${money(cashAmount)}机会资金暂不动用`;
  let opportunity = "等待半导体设备、芯片或AI算力链出现企稳信号。";
  let action = "不追补，不割肉；下一次只动用100元级别。";

  if (hasHardSellAlert) {
    stance = "先控风险";
    headline = "已有减仓预警，暂停继续补科技线";
    opportunity = "优先看卖出/减仓预警模块；只有预警解除后，再考虑动用剩余机会资金。";
    action = "今天的核心动作不是加仓，而是防止半导体和芯片仓位继续拖累组合。";
  }

  if (!hasHardSellAlert && severeSemi) {
    stance = "防守观察";
    headline = "半导体和科创芯片仍承压，剩余现金先保留";
    opportunity = "020640和科创芯片设计已补过，当前重点是观察是否缩量企稳；若继续放量下跌，剩余机会资金不动。";
    action = `剩余${money(cashAmount)}保留，不再连续追同一方向。`;
  } else if (!hasHardSellAlert && weakSemi) {
    stance = "小额试探";
    headline = "半导体进入观察买点区，但只适合小额";
    opportunity = "020640仍是优先观察对象，但你已做小额配置，下一笔要等企稳确认，不建议同时补008887。";
    action = `剩余${money(cashAmount)}以保留为主，只在明显企稳时再动用100元以内。`;
  } else if (!hasHardSellAlert && marketWeak) {
    stance = "偏防守";
    headline = "宽基偏弱，先保留机会资金";
    opportunity = "若沪深300继续回调但不恐慌，可考虑110020小额100元。";
  } else if (!hasHardSellAlert && redHolding) {
    stance = "结构分化";
    headline = "红利低波仍抗跌，科技仓等待确认";
    opportunity = "红利上涨不追，科技线企稳后再看020640或021580。";
  }

  return {
    skills: [
      { name: "fund-analysis", use: "基金表现、净值和持仓建议" },
      { name: "sector-rotation", use: "行业强弱与风格轮动" },
      { name: "risk-analysis", use: "集中度、回撤和机会资金" },
      { name: "macro-analysis", use: "风险偏好和防守资产判断" },
    ],
    stance,
    headline,
    action,
    opportunity,
    reminder,
    sellAlerts,
    buyOpportunities,
    futureTrends,
    metrics: [
      { label: "科技成长仓", value: money(techAmount), detail: pct(techAmount / total * 100) },
      { label: "半导体/AI硬科技", value: money(hardTechAmount), detail: pct(hardTechAmount / total * 100) },
      { label: "防守+现金", value: money(defensiveAmount), detail: pct(defensiveAmount / total * 100) },
      { label: "盘中代理估算", value: money(estimatedDayChange), detail: estimatedDayChange > 0 ? "正贡献" : "承压" },
    ],
    allocationPlan,
    risks: [
      "半导体、科创芯片、芯片、半导体设备、AI合计仓位偏高，继续加仓要控制在100元级别。",
      "开放式基金净值非实时，盘中盈亏是代理ETF估算，不能替代最终净值。",
      "红利低波、债基和黄金是当前组合的缓冲，不建议为了追科技全部削掉。",
    ],
    priorities: [
      `今天不再一次性动用剩余${money(cashAmount)}。`,
      "若半导体设备继续企稳，优先观察020640已有仓位表现，不急着追第二笔。",
      "若芯片/半导体继续放量下跌，继续观望。",
      "若沪深300继续回调但稳定，可考虑110020小额100元。",
    ],
    rows: rows.map((row) => ({
      code: row.code,
      name: row.name,
      recommendation: recommendationFor(row),
    })),
  };
}

async function portfolioPayload() {
  const now = new Date();
  const reminder = buildReminderMeta(now);
  const state = readState();
  const cash = state.cash;
  const pendingBuy = state.pendingBuy;
  const pendingSell = state.pendingSell;
  const opinionsPromise = buildOpinionTracker().catch((error) => ({
    updatedAt: now.toISOString(),
    nextRefreshAt: new Date(Date.now() + OPINION_TTL_MS).toISOString(),
    refreshMinutes: OPINION_TTL_MS / 60_000,
    sourceNote: `观点追踪本轮失败：${error.message}`,
    consensus: {
      dominant: "待确认",
      counts: {},
      topTags: [],
      summary: "观点源暂时不可用，下一轮自动重试。",
      commonPoints: [],
    },
    items: [],
  }));
  const uniqueProxies = [...new Set(holdings.map((item) => item.proxy).filter(Boolean))];
  const [funds, quoteByProxy] = await Promise.all([
    Promise.all(holdings.map((item) => fetchFund(item.code))),
    fetchQuotesBatch(uniqueProxies).catch(() => new Map()),
  ]);

  const fundByCode = new Map(funds.map((fund) => [fund.code, fund]));

  const rows = holdings.map((item) => {
    const fund = fundByCode.get(item.code) || {};
    const quote = quoteByProxy.get(item.proxy) || null;
    const realtimePct = quote?.changePct ?? null;
    const fundDailyPct = Number.isFinite(fund.dailyPct) ? fund.dailyPct : null;
    const intradayPct = Number.isFinite(realtimePct) ? realtimePct : fundDailyPct;
    const estimatedChange = Number.isFinite(intradayPct) ? item.amount * intradayPct / 100 : null;
    return {
      ...item,
      fund,
      quote,
      intradayPct,
      realtimePct,
      fundDailyPct,
      estimateSource: Number.isFinite(realtimePct) ? "realtime-proxy" : Number.isFinite(fundDailyPct) ? "fund-nav" : "missing",
      estimatedChange,
    };
  });

  const invested = holdings.reduce((sum, item) => sum + item.amount, 0);
  const actualDayChange = holdings.reduce((sum, item) => sum + (Number.isFinite(item.dayProfit) ? item.dayProfit : 0), 0);
  const estimatedKnown = rows.filter((row) => Number.isFinite(row.estimatedChange));
  const estimatedDayChange = estimatedKnown.reduce((sum, row) => sum + row.estimatedChange, 0);
  const knownAmount = estimatedKnown.reduce((sum, row) => sum + row.amount, 0);
  const proxyAmount = rows.filter((row) => row.proxy).reduce((sum, row) => sum + row.amount, 0);
  const realtimeKnownAmount = rows
    .filter((row) => row.proxy && row.estimateSource === "realtime-proxy")
    .reduce((sum, row) => sum + row.amount, 0);
  const missingRows = rows.filter((row) => row.estimateSource === "missing").map((row) => ({
    code: row.code,
    name: row.name,
    amount: row.amount,
  }));
  const analysis = buildAnalysis(rows, invested, estimatedDayChange, cash, reminder);
  const opinions = await opinionsPromise;

  return {
    updatedAt: now.toISOString(),
    note: "开放式基金净值不是交易所实时数据。本页优先使用场内ETF/指数实时代理估算；无实时代理时使用基金最新披露净值日涨跌兜底，实际收益以基金公司晚间净值为准。",
    cash,
    pendingBuy,
    pendingSell,
    invested,
    total: invested + cash,
    actualDayChange,
    estimatedDayChange,
    coverage: knownAmount / invested,
    estimate: {
      realtimeCoverage: proxyAmount > 0 ? realtimeKnownAmount / proxyAmount : 0,
      realtimeKnownAmount,
      proxyAmount,
      knownAmount,
      missingAmount: invested - knownAmount,
      missingRows,
    },
    groups: [...groupTotals(holdings), { name: "机会资金", value: cash }],
    analysis,
    opinions,
    rows,
  };
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = path.normalize(path.join(PUBLIC, requested));
  if (!filePath.startsWith(PUBLIC)) {
    send(res, 403, "Forbidden", "text/plain; charset=utf-8");
    return;
  }
  fs.readFile(filePath, (error, data) => {
    if (error) {
      send(res, 404, "Not found", "text/plain; charset=utf-8");
      return;
    }
    send(res, 200, data, mime[path.extname(filePath)] || "application/octet-stream");
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname === "/healthz") {
      send(res, 200, JSON.stringify({ ok: true, updatedAt: new Date().toISOString() }));
      return;
    }
    if (!isAuthorized(req)) {
      requireAuth(res);
      return;
    }
    if (url.pathname === "/api/state" && req.method === "GET") {
      send(res, 200, JSON.stringify(readState()));
      return;
    }
    if (url.pathname === "/api/cash" && req.method === "POST") {
      const body = await readJsonBody(req);
      const cash = Number(body.cash);
      if (!Number.isFinite(cash) || cash < 0) {
        send(res, 400, JSON.stringify({ error: "cash must be a non-negative number" }));
        return;
      }
      const state = { ...readState(), cash: Math.round(cash * 100) / 100 };
      writeState(state);
      send(res, 200, JSON.stringify(state));
      return;
    }
    if (url.pathname === "/api/portfolio") {
      send(res, 200, JSON.stringify(await portfolioPayload()));
      return;
    }
    serveStatic(req, res);
  } catch (error) {
    send(res, 500, JSON.stringify({ error: error.message }));
  }
});

function canListen(port) {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once("error", () => resolve(false))
      .once("listening", () => tester.close(() => resolve(true)))
      .listen(port, "127.0.0.1");
  });
}

async function findAvailablePort(startPort) {
  for (let offset = 0; offset < MAX_PORT_ATTEMPTS; offset += 1) {
    const port = startPort + offset;
    if (await canListen(port)) return port;
  }
  throw new Error(`No available port from ${startPort} to ${startPort + MAX_PORT_ATTEMPTS - 1}`);
}

if (STRICT_PORT) {
  server.listen(PORT, HOST, () => {
    console.log(`Fund dashboard running at http://${HOST}:${PORT}`);
  });
} else {
  findAvailablePort(PORT)
    .then((port) => {
      if (port !== PORT) console.warn(`Port ${PORT} is in use, using ${port} instead.`);
      server.listen(port, HOST, () => {
        console.log(`Fund dashboard running at http://${HOST}:${port}`);
      });
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
