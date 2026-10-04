import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { csrf } from "hono/csrf";
import type { Env, UserConfig } from "./types";
import entriesRoute from "./routes/entries";
import uploadRoute from "./routes/upload";
import authRoute from "./routes/auth";

const app = new Hono<{ Bindings: Env }>();

// 基础 HTTP 安全防护头（防点击劫持、防 MIME 探测混淆、规范 Referrer 策略）
app.use(
  "*",
  secureHeaders({
    xFrameOptions: "DENY",
    xContentTypeOptions: "nosniff",
    referrerPolicy: "strict-origin-when-cross-origin",
    crossOriginResourcePolicy: false,
  })
);

// CSRF 防御中间件（针对 POST 等写操作校验来源域）
app.use(
  "*",
  csrf({
    origin: (origin, c) => {
      const allowed = c.env.ALLOWED_ORIGIN || "*";
      if (allowed === "*") return true;
      if (!origin) return true;
      const reqOrigin = new URL(c.req.url).origin;
      return origin === allowed || origin === reqOrigin;
    },
  })
);

// CORS 处理
app.use("*", async (c, next) => {
  const origin = c.env.ALLOWED_ORIGIN || "*";
  return cors({
    origin,
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  })(c, next);
});

// 健康检查（避免拦截根路径前端静态资源托管）
app.get("/api/health", (c) => c.json({ status: "ok", service: "heng-api" }));

// 公开配置接口（供前端获取用户列表、标题等非敏感信息）
app.get("/api/config", (c) => {
  let users: Pick<UserConfig, "name" | "color">[] = [];
  try {
    const rawUsers: UserConfig[] = JSON.parse(c.env.USERS || "[]");
    // 只返回 name 和 color，不返回 password
    users = rawUsers.map(({ name, color }) => ({ name, color }));
  } catch {
    // 忽略解析错误
  }

  if (users.length === 0) {
    users = [
      { name: "佩琪", color: "#e84393" },
      { name: "乔治", color: "#0984e3" },
    ];
  }

  return c.json({
    success: true,
    data: {
      appTitle: c.env.APP_TITLE || "记仇小本本",
      bookTitle: c.env.BOOK_TITLE || "我们的记仇本本",
      pageTitle: c.env.PAGE_TITLE || "目录",
      pageSubtitle: c.env.PAGE_SUBTITLE || "点击就可以查看啦",
      pageNone: c.env.PAGE_NONE || "这么清静？还不去记仇？",
      loadingText: c.env.LOADING_TEXT || "正在打开小本本",
      users,
    },
  });
});

// 认证路由（登录与会话）
app.route("/api/auth", authRoute);

// 条目路由
app.route("/api/entries", entriesRoute);

// 上传及图片访问路由
app.route("/api/upload", uploadRoute);
app.route("/api/image", uploadRoute);

// 404 fallback
app.notFound((c) => c.json({ success: false, error: "接口不存在" }, 404));

// 全局错误处理
app.onError((err, c) => {
  console.error("Worker error:", err);
  return c.json({ success: false, error: "服务器内部错误" }, 500);
});

export default app;
