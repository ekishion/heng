#!/usr/bin/env node
/**
 * 记仇小本本通行暗号哈希生成器 (可选)
 * 使用标准 Web Crypto 生成加盐 SHA-256 哈希
 * 用法:
 *   pnpm hash-pwd <密码>
 * 例如:
 *   pnpm hash-pwd 123456
 */

const password = process.argv[2];

if (!password) {
  console.log("\n💡 记仇小本本 · 通行暗号哈希生成器 (可选)");
  console.log("--------------------------------------------------------------------------------");
  console.log("提示：小本本已升级为单一专属暗号体系！");
  console.log("• 你可以直接执行: npx wrangler secret put AUTH_SECRET 输入你的暗号明文（最简单）；");
  console.log("• 如果希望在云端密文存储，可使用本工具生成加盐哈希：");
  console.log("  pnpm hash-pwd <你的暗号>\n");
  process.exit(0);
}

function bufToHex(buffer) {
  const byteArray = new Uint8Array(buffer);
  return Array.from(byteArray, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function generateSaltedHash(plainPassword) {
  const saltBytes = new Uint8Array(16);
  crypto.getRandomValues(saltBytes);
  const salt = bufToHex(saltBytes.buffer);

  const enc = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", enc.encode(salt + plainPassword));
  const hash = bufToHex(hashBuffer);

  return `sha256:${salt}:${hash}`;
}

generateSaltedHash(password).then((result) => {
  console.log("\n✅ 加盐哈希生成成功！");
  console.log("================================================================================");
  console.log(result);
  console.log("================================================================================");
  console.log("\n📋 设置方式（二选一）：");
  console.log("1. 推荐：执行 npx wrangler secret put AUTH_SECRET，粘贴上方整串 sha256 字符串；");
  console.log("2. 或者：执行 npx wrangler secret put AUTH_SECRET，直接输入你的原始密码（后端均支持识别）。\n");
});
