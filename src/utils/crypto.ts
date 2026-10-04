import type { Env, UserConfig } from "../types";

/**
 * 将 ArrayBuffer 转为十六进制字符串
 */
export function bufToHex(buffer: ArrayBuffer): string {
  const byteArray = new Uint8Array(buffer);
  return Array.from(byteArray, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * 恒定时间比对两个字符串，防止时序攻击
 */
export async function secureCompare(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const hashA = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(a)));
  const hashB = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(b)));

  let mismatch = 0;
  for (let i = 0; i < 32; i++) {
    mismatch |= hashA[i] ^ hashB[i];
  }
  return mismatch === 0;
}

/**
 * 校验密码，支持加盐哈希或明文比对
 */
export async function verifyPassword(input: string, stored: string): Promise<boolean> {
  if (!input || !stored) return false;

  if (stored.startsWith("sha256:")) {
    const parts = stored.split(":");
    if (parts.length === 3) {
      const [, salt, expectedHash] = parts;
      const enc = new TextEncoder();
      const actualHashBuffer = await crypto.subtle.digest("SHA-256", enc.encode(salt + input));
      return secureCompare(bufToHex(actualHashBuffer), expectedHash);
    }
  }

  return secureCompare(input, stored);
}

/**
 * 生成加盐哈希密码（格式: sha256:<salt>:<hash>）
 */
export async function hashPassword(password: string): Promise<string> {
  const saltBytes = new Uint8Array(16);
  crypto.getRandomValues(saltBytes);
  const salt = bufToHex(saltBytes.buffer);

  const enc = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", enc.encode(salt + password));
  return `sha256:${salt}:${bufToHex(hashBuffer)}`;
}

/**
 * 校验小本本空间暗号
 * 优先匹配 AUTH_SECRET，没有时兼顾历史 USERS 变量
 */
export async function verifyPasscode(password: string, env: Env): Promise<boolean> {
  if (!password) return false;

  if (env.AUTH_SECRET) {
    return verifyPassword(password, env.AUTH_SECRET.trim());
  }

  if (env.USERS) {
    try {
      const users: UserConfig[] = JSON.parse(env.USERS);
      for (const u of users) {
        if (u.password && (await verifyPassword(password, u.password))) {
          return true;
        }
      }
    } catch {
      // 忽略配置解析错误
    }
  }

  // 本地开发兜底
  if (!env.AUTH_SECRET && !env.USERS) {
    return password === "123456" || password === "admin";
  }

  return false;
}
