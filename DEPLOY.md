# 基金看板部署说明

这个项目需要 Node.js 服务端，因为 `/api/portfolio` 会实时抓取基金净值、ETF 代理行情和观点数据。不要只部署 `public/` 静态目录，否则实时更新、机会资金保存和分析建议都会失效。

## 推荐方式：Render

1. 把 `fund-dashboard` 目录推到 GitHub 仓库。
2. 在 Render 新建 `Web Service`，选择该仓库。
3. 如果仓库根目录不是 `fund-dashboard`，Root Directory 填 `fund-dashboard`。
4. Build Command 填 `npm install`。
5. Start Command 填 `npm start`。
6. Environment 填：
   - `NODE_ENV=production`
   - `DASHBOARD_USER=admin`
   - `DASHBOARD_PASSWORD=你自己设置的访问密码`
7. Health Check Path 填 `/healthz`。

部署成功后，Render 会给出一个公网地址，例如：

```text
https://fund-dashboard-xxxx.onrender.com
```

## 运行要求

- Node.js 20 或更高版本
- 运行命令：`npm start`
- 云平台必须支持长驻 Node HTTP 服务

## 注意

- 当前 `state.json` 会保存机会资金和待确认金额。在免费云平台上，如果实例重建或重新部署，这个文件可能回到仓库里的初始值。
- 这个网站展示的是你的真实持仓数据；公网部署时建议必须设置 `DASHBOARD_PASSWORD`，否则知道链接的人都可以看到。

## Docker 部署

如果你使用 VPS、Fly.io、Railway Docker 或其它容器平台：

```bash
docker build -t fund-dashboard .
docker run -p 9020:9020 \
  -e PORT=9020 \
  -e NODE_ENV=production \
  -e DASHBOARD_USER=admin \
  -e DASHBOARD_PASSWORD=your-password \
  fund-dashboard
```
