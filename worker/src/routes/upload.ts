import { Hono } from "hono";
import type { Env } from "../types";
import { makeImageKey, detectImageType } from "../storage/r2";
import { isAuthorized } from "../middleware/auth";

const upload = new Hono<{ Bindings: Env }>();

/**
 * 上传插图到 R2
 */
upload.post("/", async (c) => {
  let formData: FormData;
  try {
    formData = await c.req.formData();
  } catch {
    return c.json({ success: false, error: "请求格式错误" }, 400);
  }

  const password = formData.get("password");
  if (!(await isAuthorized(c, typeof password === "string" ? password : undefined))) {
    return c.json({ success: false, error: "小本本未解锁，请输入暗号" }, 401);
  }

  const rawFile = formData.get("file");
  if (!rawFile || typeof rawFile === "string") {
    return c.json({ success: false, error: "缺少文件字段" }, 400);
  }

  const file = rawFile as unknown as File;
  const maxSize = Number(c.env.IMAGE_MAX_SIZE ?? 5_242_880);
  if (file.size > maxSize) {
    const mb = (maxSize / 1024 / 1024).toFixed(0);
    return c.json({ success: false, error: `图片不能超过 ${mb}MB` }, 413);
  }

  const arrayBuffer = await file.arrayBuffer();
  const detectedType = detectImageType(arrayBuffer);
  if (!detectedType) {
    return c.json({ success: false, error: "仅支持 JPG / PNG / GIF / WebP 格式图片" }, 415);
  }

  const key = makeImageKey(detectedType);
  try {
    await c.env.R2.put(key, arrayBuffer, {
      httpMetadata: { contentType: detectedType },
    });
  } catch (e) {
    console.error("R2 upload error:", e);
    return c.json({ success: false, error: "图片上传失败，请重试" }, 500);
  }

  return c.json({ success: true, data: { url: `/api/image/${key}`, key } }, 201);
});

/**
 * 从 R2 代理读取图片
 */
upload.get("/*", async (c) => {
  const rawPath = c.req.path.replace(/^\/api\/image\/?/, "");
  const key = decodeURIComponent(rawPath);

  if (!key) {
    return c.json({ success: false, error: "缺少图片路径" }, 400);
  }

  const obj = await c.env.R2.get(key);
  if (!obj) {
    return c.json({ success: false, error: "图片不存在" }, 404);
  }

  return new Response(obj.body, {
    headers: {
      "Content-Type": obj.httpMetadata?.contentType ?? "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
      "ETag": obj.etag,
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
});

export default upload;
