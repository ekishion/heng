import type { Context, Next } from "hono";
import type { Env, CreateEntryBody } from "../types";
import { verifyPasscode } from "../utils/crypto";
import { getJwtSecret, verifyJwtToken } from "../utils/jwt";

/**
 * 检查请求是否持有通行证（JWT）或提供了正确暗号
 */
export async function isAuthorized(
  c: Context<{ Bindings: Env }>,
  password?: string
): Promise<boolean> {
  const authHeader = c.req.header("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (token) {
    const secret = getJwtSecret(c.env);
    const payload = await verifyJwtToken(token, secret);
    if (payload?.unlocked) return true;
  }
  return password ? verifyPasscode(password, c.env) : false;
}

/**
 * 条目提交校验中间件
 */
export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const rawBody = await c.req.json<CreateEntryBody>().catch(() => null);
  if (!rawBody || typeof rawBody !== "object") {
    return c.json({ success: false, error: "请求格式错误" }, 400);
  }

  const { title, body: content, author, password } = rawBody;

  if (!title?.trim()) {
    return c.json({ success: false, error: "标题不能为空" }, 400);
  }
  if (!content?.trim()) {
    return c.json({ success: false, error: "内容不能为空" }, 400);
  }

  if (!(await isAuthorized(c, password))) {
    return c.json({ success: false, error: "小本本未解锁，请输入暗号" }, 401);
  }

  c.set("body" as never, {
    author: author?.trim() || "佩琪",
    title: title.trim(),
    body: content,
  });

  return next();
}
