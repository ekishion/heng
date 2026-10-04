import type { Env, Entry, EntryIndex } from "../types";

/**
 * 分页获取条目列表（原生利用 idx_entries_created_at 索引，毫秒级响应）
 */
export async function getEntriesList(
  db: Env["DB"],
  page = 1,
  perPage = 10
): Promise<{ data: EntryIndex[]; total: number; hasMore: boolean }> {
  const offset = (page - 1) * perPage;

  // 并行获取总数与分页列表
  const [countResult, listResult] = await Promise.all([
    db.prepare("SELECT count(*) as total FROM entries").first<{ total: number }>(),
    db
      .prepare(
        "SELECT id, author, title, resolved_at, created_at FROM entries ORDER BY created_at DESC LIMIT ? OFFSET ?"
      )
      .bind(perPage, offset)
      .all<EntryIndex>(),
  ]);

  const total = countResult?.total ?? 0;
  const data = listResult.results || [];

  return {
    data,
    total,
    hasMore: offset + data.length < total,
  };
}

/**
 * 从 D1 获取单条条目详情
 */
export async function getEntryById(
  db: Env["DB"],
  id: string
): Promise<Entry | null> {
  const result = await db
    .prepare("SELECT id, author, title, body, resolved_at, created_at FROM entries WHERE id = ?")
    .bind(id)
    .first<Entry>();
  return result ?? null;
}

/**
 * 向 D1 插入新条目
 */
export async function insertEntry(
  db: Env["DB"],
  entry: Omit<Entry, "created_at"> & { created_at: string }
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO entries (id, author, title, body, resolved_at, created_at) VALUES (?, ?, ?, ?, NULL, ?)"
    )
    .bind(entry.id, entry.author, entry.title, entry.body, entry.created_at)
    .run();
}

/**
 * 切换条目和解消仇状态（盖章）
 */
export async function resolveEntry(
  db: Env["DB"],
  id: string,
  resolve = true
): Promise<boolean> {
  const val = resolve ? new Date().toISOString() : null;
  const result = await db
    .prepare("UPDATE entries SET resolved_at = ? WHERE id = ?")
    .bind(val, id)
    .run();
  return (result.meta?.changes ?? 0) > 0;
}

/**
 * 从 D1 物理删除条目
 */
export async function deleteEntry(
  db: Env["DB"],
  id: string
): Promise<boolean> {
  const result = await db.prepare("DELETE FROM entries WHERE id = ?").bind(id).run();
  return (result.meta?.changes ?? 0) > 0;
}
