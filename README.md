# 基金持仓实时看板

这是一个 Node.js 基金持仓看板，包含：

- 当前持仓汇总
- 支付宝截图同步后的持仓明细
- 盘中代理估算
- 卖出/减仓预警
- 补仓机会
- 未来 3-15 天趋势分析
- 全网观点追踪

## 本地运行

```bash
npm install
npm start
```

默认地址：

```text
http://localhost:9020
```

## 生产环境

推荐在 Render/Railway/Fly/VPS 这类支持 Node 服务的平台部署。

环境变量：

```text
NODE_ENV=production
DASHBOARD_USER=admin
DASHBOARD_PASSWORD=你设置的访问密码
```

健康检查地址：

```text
/healthz
```

## Render 配置

- Build Command: `npm install`
- Start Command: `npm start`
- Health Check Path: `/healthz`

## 隐私提醒

这个项目包含真实持仓数据。公网部署时务必设置 `DASHBOARD_PASSWORD`，否则知道链接的人都能看到持仓。
