import { useState, useCallback } from "react";
import type { EntryIndex } from "../types";
import { fetchEntries } from "../api/client";

export function useEntries() {
  const [entries, setEntries] = useState<EntryIndex[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadPage = useCallback(async (p: number, replace = false) => {
    setLoadingMore(true);
    try {
      const res = await fetchEntries(p);
      if (res.success) {
        setEntries((prev) => replace ? res.data : [...prev, ...res.data]);
        setHasMore(res.hasMore);
        setPage(p);
      }
    } finally {
      setLoadingMore(false);
    }
  }, []);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      loadPage(page + 1);
    }
  }, [loadingMore, hasMore, page, loadPage]);

  const reload = useCallback(() => {
    loadPage(1, true);
  }, [loadPage]);

  return { entries, hasMore, loadingMore, loadMore, reload, loadPage };
}
