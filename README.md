# lx-music-server

[lx-music-sync-server](https://github.com/lyswhut/lx-music-sync-server) 的 Cloudflare Workers 重构版本，使用 Durable Objects 实现有状态的 WebSocket 同步，无需自托管服务器即可运行。

[English](./README.en.md)

## 功能特性

- 基于 Cloudflare Workers + Durable Objects，零服务器运维
- 支持多用户隔离，每个用户拥有独立的 DO 实例和存储
- 实时 WebSocket 双向同步歌单与不喜欢规则
- 快照版本管理，支持多设备增量合并
- 设备管理 API（查看 / 删除已授权设备）
- GitHub Actions 一键部署

## 前置要求

- Cloudflare 账号（免费计划即可）
- GitHub 账号（用于 Fork 仓库和 Actions 自动部署）

## 部署方式

### 1. 创建 Cloudflare KV Namespace

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Workers & Pages → KV**
3. 点击 **Create a namespace**
4. 输入名称（如 `lx-music-kv`），点击 **Add**
5. 创建完成后，点击进入该 Namespace，在详情页可看到 **Namespace ID**，复制备用

### 2. 创建 Cloudflare API Token

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **My Profile → API Tokens**（或直接访问 https://dash.cloudflare.com/profile/api-tokens）
3. 点击 **Create Token**
4. 选择 **Edit Cloudflare Workers** 模板，点击 **Use template**
5. 确认权限包含：
   - Account / Workers Scripts / Edit
   - Account / Workers KV Storage / Edit
   - Account / Durable Objects / Edit
6. （可选）在 Account Resources 中限制为特定账户
7. 点击 **Continue to summary** → **Create Token**
8. 复制生成的 Token（仅显示一次，请妥善保存）

### 3. Fork 并配置

Fork 本仓库，在 GitHub 仓库的 **Settings → Secrets and variables → Actions** 中添加以下配置：

**Secrets（敏感信息）：**

| Secret 名称 | 说明 |
|---|---|
| `CLOUDFLARE_API_TOKEN` | 上一步创建的 API Token |
| `LX_USERS` | 用户配置列表（见下方用户配置说明） |

**Variables（非敏感配置）：**

| Variable 名称 | 说明 |
|---|---|
| `KV_NAMESPACE_ID` | 第 1 步中创建的 KV Namespace ID |

### 4. 配置用户

在 GitHub Secret `LX_USERS` 中配置所有用户，支持两种格式：

**简单格式**（用户名:密码，逗号分隔）：

```
admin:your_password,alice:her_password
```

**JSON 格式**（支持更多选项）：

```json
[{"name":"admin","password":"your_password"},{"name":"alice","password":"her_password","maxSnapshotNum":30}]
```

**支持的用户选项：**

| 选项 | 类型 | 说明 |
|---|---|---|
| `name` | string | 用户名（必填） |
| `password` | string | 登录密码（必填） |
| `maxSnapshotNum` | number | 最大快照保留数量，默认 20 |
| `list.addMusicLocationType` | `"top"` \| `"bottom"` | 歌曲添加位置，默认 `"bottom"` |

> 添加或修改用户只需更新 `LX_USERS` 这一个 Secret，无需修改代码或部署文件。

### 5. 触发部署

在 GitHub 仓库的 **Actions → Deploy to Cloudflare Workers → Run workflow** 手动触发部署（修改 Secret 后需要手动触发部署）。

## 访问地址

部署成功后，默认使用 Workers 域名访问，也可绑定自定义域名。

### 使用 Workers 默认域名

Worker 的默认访问地址为：

```
https://lx-music-server.<your-subdomain>.workers.dev
```

也可在 Cloudflare Dashboard 的 **Workers & Pages → lx-music-server** 页面查看。

### 使用自定义域名（可选）

1. 将你的域名添加到 Cloudflare（**Websites → Add a site**），并按提示修改域名的 NS 记录指向 Cloudflare
2. 在 Cloudflare Dashboard 进入 **Workers & Pages → lx-music-server**
3. 点击 **Settings → Domains & Routes → Add → Custom Domain**
4. 输入你想使用的子域名（如 `sync.example.com`），点击 **Add domain**
5. Cloudflare 会自动创建 DNS 记录并签发 SSL 证书，等待生效即可

绑定成功后，即可通过 `https://sync.example.com` 访问。

> **注意：** 更换同步服务器前，请务必做好本地数据备份，以防数据丢失。

## 客户端配置

在 LX Music 客户端的同步设置中填写：

- **服务器地址**：`https://<your-worker-name>.<your-subdomain>.workers.dev`（或自定义域名）
- **连接码**：对应的密码

## 本地开发

```bash
pnpm install
pnpm dev
```

> 本地开发使用 `wrangler dev`，Durable Objects 和 KV 均在本地模拟运行。

### 手动部署（可选）

如需在本地部署到 Cloudflare Workers：

```bash
pnpm install
pnpm deploy
```

## 设备管理 API

通过 Basic Auth 访问设备管理接口，用户名和密码与同步账号相同。

**查看已授权设备：**

```bash
curl -u <用户名>:<密码> https://<worker-url>/devices
```

**删除指定设备：**

```bash
curl -u <用户名>:<密码> -X DELETE https://<worker-url>/devices/<clientId>
```

## 技术架构

```
客户端
  │
  ├─ GET  /ah          认证（新设备 / 重新认证）
  ├─ GET  /socket      WebSocket 升级 → UserSyncDO
  ├─ GET  /devices     设备列表（Basic Auth）
  ├─ DELETE /devices/:id  删除设备（Basic Auth）
  ├─ GET  /hello       连通性检测
  └─ GET  /id          服务器唯一 ID

Cloudflare Workers（无状态路由层）
  │  使用 KV 存储 clientId → userName 映射
  │
  └─ UserSyncDO（每用户一个实例）
       ├─ DO Storage：设备信息、歌单快照、不喜欢规则快照
       └─ WebSocket：多设备实时同步
```

**主要依赖：**

| 依赖 | 用途 |
|---|---|
| [Hono](https://hono.dev) | HTTP 路由框架 |
| [message2call](https://github.com/lyswhut/message2call) | WebSocket RPC |
| [aes-js](https://github.com/ricmoo/aes-js) | AES-128-ECB 加解密 |
| [@noble/hashes](https://github.com/paulmillr/noble-hashes) | MD5 实现 |

## License

[MIT](LICENSE)