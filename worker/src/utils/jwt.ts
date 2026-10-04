import { sign, verify } from "hono/jwt";
import type { Env } from "../types";

export interface JwtPayload {
  sub: string;
  unlocked: boolean;
  exp: number;
}

/**
 * 获取 JWT 密钥（优先从环境变量读取，开发环境备用默认值）
 */
export function getJwtSecret(env: Env): string {
  return env.JWT_SECRET || "heng-dev-default-secret-key-change-in-production-2026";
}

/**
 * 签发通行证 Token（默认 30 天有效期）
 */
export async function generateJwtToken(
  secret: string,
  expiresInSeconds = 30 * 86400
): Promise<string> {
  const payload = {
    sub: "heng-space",
    unlocked: true,
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  };
  return sign(payload, secret, "HS256");
}

/**
 * 校验并解析 JWT Token
 */
export async function verifyJwtToken(
  token: string,
  secret: string
): Promise<JwtPayload | null> {
  try {
    const payload = await verify(token, secret, "HS256");
    if (typeof payload === "object" && payload !== null) {
      return payload as unknown as JwtPayload;
    }
    return null;
  } catch {
    return null;
  }
}
