import { Hono } from "hono";
import type { Env, ApiResponse, AuthResult } from "../types";
import { verifyPasscode } from "../utils/crypto";
import { getJwtSecret, generateJwtToken, verifyJwtToken } from "../utils/jwt";

const auth = new Hono<{ Bindings: Env }>();

/**
 * POST /api/auth/login
 * 验证小本本专属空间暗号，换取 30 天持久通行证
 */
auth.post("/login", async (c) => {
  const body = await c.req.json<{ password?: string }>().catch(() => null);
  if (!body || !body.password) {
    return c.json<ApiResponse>({ success: false, error: "请输入小本本暗号" }, 400);
  }

  const isValid = await verifyPasscode(body.password, c.env);
  if (!isValid) {
    return c.json<ApiResponse>({ success: false, error: "暗号不正确，请重新输入" }, 403);
  }

  // 签发 30 天有效的通行证 Token
  const secret = getJwtSecret(c.env);
  const token = await generateJwtToken(secret, 30 * 86400);

  return c.json<ApiResponse<AuthResult>>({
    success: true,
    data: {
      token,
      unlocked: true,
    },
  });
});

/**
 * GET /api/auth/me
 * 检查当前设备是否已解锁
 */
auth.get("/me", async (c) => {
  const authHeader = c.req.header("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (!token) {
    return c.json<ApiResponse>({ success: false, error: "未解锁" }, 401);
  }

  const secret = getJwtSecret(c.env);
  const payload = await verifyJwtToken(token, secret);

  if (!payload || !payload.unlocked) {
    return c.json<ApiResponse>({ success: false, error: "通行证已失效" }, 401);
  }

  return c.json<ApiResponse<{ unlocked: boolean }>>({
    success: true,
    data: {
      unlocked: true,
    },
  });
});

export default auth;
