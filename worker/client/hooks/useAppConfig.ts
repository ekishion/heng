import { useState, useEffect } from "react";
import type { AppConfig } from "../types";
import { fetchConfig } from "../api/client";

const DEFAULT_CONFIG: AppConfig = {
  appTitle: "记仇小本本",
  bookTitle: "我们的记仇本本",
  pageTitle: "目录",
  pageSubtitle: "点击就可以查看啦",
  pageNone: "这么清静？还不去记仇？",
  loadingText: "正在打开小本本",
  users: [],
};

export function useAppConfig() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfig()
      .then((res) => {
        if (res.success) setConfig(res.data);
        else setConfig(DEFAULT_CONFIG);
      })
      .catch(() => setConfig(DEFAULT_CONFIG))
      .finally(() => setLoading(false));
  }, []);

  return { config, loading };
}
