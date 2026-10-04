# 记仇小本本

> 两个人记录生活琐事与日常小摩擦的记仇本本。基于 Cloudflare Workers + D1 + R2 + React 构建。

原版基于 Gitee Issues API 做数据中转，偶尔会遇到跨域和接口变动的问题。这个版本改用 Cloudflare 免费的 Serverless 基础设施（D1 数据库存文字，R2 存插图），前后端合在同一个 Worker 里同源部署，一条命令发布，免去了单独配置反代和跨域的麻烦。

---

## 主要特点

- **专属暗号与随心切角色**：两个人共享一个空间暗号（比如纪念日），验证一次记住 30 天。写记仇时可以在右上角随时切换发言身份，不需要重新输入密码。
- **和解印章与彻底抹除**：和好之后可以给条目盖上「已和解 · 翻篇啦」复古红印章，留下相处点滴；也可以选择彻底抹除记录。
- **原生轻量编辑器**：自研极简 ContentEditable 富文本编辑器，支持基本排版、记仇表情抽屉、截图一键粘贴上传以及文件拖拽直传。
- **图片全屏预览**：点击条目内的图片直接全屏高清放大查看，原生轻量实现。
- **同源全栈部署**：利用 Cloudflare Workers Static Assets 原生托管前端，前后端同一个域名，单命令完成构建与发布。

---

## 目录结构

```
heng/
├── LICENSE                   # MIT 开源协议
├── package.json              # 根便捷脚本
├── README.md
│
└── worker/                   # 核心工程
    ├── package.json          # 依赖与脚本
    ├── wrangler.toml         # D1 / R2 / 静态资源配置
    ├── vite.config.ts        # 前端构建配置
    ├── tsconfig.json         # Worker TypeScript 配置
    ├── tsconfig.client.json  # 前端 TypeScript 配置
    │
    ├── scripts/
    │   └── hash-pwd.mjs      # 密码加盐哈希辅助脚本（可选）
    │
    ├── src/                  # 后端源码 (Hono)
    │   ├── index.ts          # 路由聚合与静态资源服务
    │   ├── routes/           # 认证、条目与图片代理路由
    │   ├── storage/          # D1 与 R2 数据访问层
    │   ├── middleware/       # 权限与参数校验中间件
    │   └── db/schema.sql     # D1 数据库表结构
    │
    └── client/               # 前端源码 (React 18 + TS)
        ├── api/client.ts     # API 客户端请求封装
        ├── components/       # 3D 翻页书本、原生编辑器、开屏动画
        └── hooks/            # 配置、主题与分页钩子
```

---

## 接口一览 (API)

| 请求方式 | 路径 | 说明 | 权限 |
|---|---|---|---|
| `GET` | `/api/health` | 服务健康检查 | 公开 |
| `GET` | `/api/config` | 获取前端标题、用户列表等配置 | 公开 |
| `GET` | `/api/entries?page=1&per_page=10` | 分页查询记仇列表 | 公开 |
| `GET` | `/api/entries/:id` | 获取单条记仇正文详情 | 公开 |
| `GET` | `/api/image/*` | 从 R2 代理读取图片流 | 公开 |
| `POST` | `/api/auth/login` | 校验空间暗号，签发 30 天通行凭证 | 需暗号 |
| `GET` | `/api/auth/me` | 检查当前设备是否已解锁 | 需通行证 |
| `POST` | `/api/entries` | 新增记仇条目 | 需解锁 |
| `PATCH` | `/api/entries/:id/resolve` | 和解盖章或撤销盖章 | 需解锁 |
| `DELETE` | `/api/entries/:id` | 彻底抹除记仇记录 | 需解锁 |
| `POST` | `/api/upload` | 上传插图到 R2 存储桶 | 需解锁 |

---

## 部署上线

### 1. 安装依赖

```bash
pnpm install
```

### 2. 创建 Cloudflare 资源

在终端使用 Wrangler 创建（也可以直接在 Cloudflare 网页控制台创建）：

```bash
# 登录 Cloudflare（浏览器确认授权）
pnpm cf:login

# 创建 D1 数据库
npx wrangler d1 create heng

# 创建 R2 存储桶
npx wrangler r2 bucket create heng-images
npx wrangler r2 bucket create heng-images-preview
```

将命令输出的 `database_id` 填入 `worker/wrangler.toml` 中的 `database_id`。

### 3. 初始化数据库表结构

```bash
pnpm db:migrate
```

### 4. 环境变量与空间暗号

#### 变量清单一览

| 变量名称 | 类型 | 必填 | 说明 | 示例值 |
|---|---|---|---|---|
| `AUTH_SECRET` | 敏感密钥 (Secret) | **推荐** | 小本本专属通行暗号（直接输入明文或哈希） | `20240520` 或 `mysecret123` |
| `JWT_SECRET` | 敏感密钥 (Secret) | 可选 | 认证 Token 签名密钥（留空则使用内置默认值） | `heng-jwt-token-key-2026` |
| `APP_TITLE` | 普通变量 (Var) | 可选 | 小本本网页标题（`wrangler.toml` 已有默认值） | `记仇小本本` |
| `USERS` | 普通变量 (Var) | 可选 | 两人昵称与颜色 JSON（直接在 `wrangler.toml` 修改） | `[{"name":"佩琪","color":"#e84393"},{"name":"乔治","color":"#0984e3"}]` |

#### 配置方式（二选一）：

* **方式 A：Cloudflare 网页控制台导入（Web Dashboard / Git 部署）**
  * 在「变量名称」输入：`AUTH_SECRET`
  * 在「变量值」输入：你们两人的私密暗号（如纪念日、密码）
  * 点击下方 **「加密」** 按钮（作为加密 Secret 保存），然后直接点击 **「部署」** 即可。
  * （`JWT_SECRET` 与其他变量非必填，未填时会自动使用内置默认值和 `wrangler.toml` 配置）。

* **方式 B：本地终端命令行配置（Wrangler CLI）**
  ```bash
  # 设置通行暗号（直接输入明文或加盐哈希）
  npx wrangler secret put AUTH_SECRET

  # 设置 JWT 签名密钥（可选，输入任意随机字符串）
  npx wrangler secret put JWT_SECRET
  ```

> **自定义昵称**：如果想修改两人的名字或颜色，直接编辑 `worker/wrangler.toml` 的 `[vars]` 里的 `USERS` 即可。

### 5. 一键发布

```bash
pnpm cf:deploy
```

部署完成后，终端会输出分配好的在线域名（形如 `https://heng-api.xxx.workers.dev`），直接打开即可使用。

---

## 本地开发

```bash
# 启动后端 API（本地模拟 D1 与 R2）
pnpm dev:worker

# 启动前端开发服务器（支持热重载）
pnpm dev:client
```

---

## 鸣谢与致敬

- 本项目的设计灵感与原始创意源于 [n0ts/heng](https://gitee.com/n0ts/heng) ，感谢原作者对情侣趣味记仇小本本的最初探索与构想。
- 2.0 版本基于现代 Serverless 全栈技术架构（Cloudflare Workers + D1 + R2 + React 18 + TypeScript）对存储机制、鉴权体系、富文本引擎与交互体验进行了彻底重构。

---

## 开源协议

本项目基于 [MIT 许可证](LICENSE) 开源。
