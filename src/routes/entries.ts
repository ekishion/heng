import { Hono } from "hono";
import type { Env, ApiResponse } from "../types";
import { authMiddleware, isAuthorized } from "../middleware/auth";
import {
  getEntriesList,
  getEntryById,
  insertEntry,
  resolveEntry,
  deleteEntry,
} from "../storage/d1";

const entries = new Hono<{ Bindings: Env }>();

/**
 * 分页获取记仇列表
 */
entries.get("/", async (c) => {
  const page = Math.max(1, Number(c.req.query("page") ?? 1));
  const perPage = Math.min(50, Math.max(1, Number(c.req.query("per_page") ?? 10)));
  const result = await getEntriesList(c.env.DB, page, perPage);
  return c.json({ success: true, ...result });
});

/**
 * 获取单条记仇详情
 */
entries.get("/:id", async (c) => {
  const id = c.req.param("id");
  const entry = await getEntryById(c.env.DB, id);
  if (!entry) {
    return c.json<ApiResponse>({ success: false, error: "条目不存在" }, 404);
  }
  return c.json({ success: true, data: entry });
});

/**
 * 新增记仇
 */
entries.post("/", authMiddleware, async (c) => {
  const body = c.get("body" as never) as { author: string; title: string; body: string };
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const created_at = new Date().toISOString();

  await insertEntry(c.env.DB, {
    id,
    author: body.author,
    title: body.title,
    body: body.body,
    created_at,
  });

  return c.json(
    {
      success: true,
      data: { id, author: body.author, title: body.title, created_at },
    },
    201
  );
});

/**
 * 抹除记仇（物理删除）
 */
entries.delete("/:id", async (c) => {
  const body = await c.req.json<{ password?: string }>().catch(() => null);
  if (!(await isAuthorized(c, body?.password))) {
    return c.json<ApiResponse>({ success: false, error: "小本本未解锁，请输入暗号" }, 401);
  }

  const id = c.req.param("id");
  const entry = await getEntryById(c.env.DB, id);
  if (!entry) {
    return c.json<ApiResponse>({ success: false, error: "该条记录不存在或已删除" }, 404);
  }

  const deleted = await deleteEntry(c.env.DB, id);
  if (!deleted) {
    return c.json<ApiResponse>({ success: false, error: "删除失败，请重试" }, 500);
  }

  return c.json({ success: true, message: "已抹除" });
});

/**
 * 和解盖章（标记已和解或撤销和解）
 */
entries.patch("/:id/resolve", async (c) => {
  const body = await c.req
    .json<{ resolve?: boolean; password?: string }>()
    .catch(() => ({ resolve: true, password: undefined }));

  if (!(await isAuthorized(c, body?.password))) {
    return c.json<ApiResponse>({ success: false, error: "小本本未解锁，请输入暗号" }, 401);
  }

  const id = c.req.param("id");
  const entry = await getEntryById(c.env.DB, id);
  if (!entry) {
    return c.json<ApiResponse>({ success: false, error: "该条记录不存在" }, 404);
  }

  const shouldResolve = body.resolve !== false;
  const success = await resolveEntry(c.env.DB, id, shouldResolve);
  if (!success) {
    return c.json<ApiResponse>({ success: false, error: "盖章失败，请重试" }, 500);
  }

  return c.json({
    success: true,
    message: shouldResolve ? "已盖章和解" : "已撤销和解",
  });
});

export default entries;
