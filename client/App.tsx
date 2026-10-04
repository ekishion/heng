import { useState, useEffect, useRef } from "react";
import type { AppConfig } from "./types";
import LoadingScreen from "./components/LoadingScreen";
import Book from "./components/Book";
import EntryEditor from "./components/EntryEditor";
import { useAppConfig } from "./hooks/useAppConfig";
import { useEntries } from "./hooks/useEntries";
import { useTheme } from "./hooks/useTheme";
import "./styles/global.css";

export default function App() {
  const { config, loading: configLoading } = useAppConfig();
  const { entries, hasMore, loadingMore, loadMore, reload, loadPage } = useEntries();
  const { theme, toggleTheme } = useTheme();

  const [appReady, setAppReady] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // 初始加载
  useEffect(() => {
    if (!configLoading) {
      void loadPage(1, true).then(() => {
        setTimeout(() => setAppReady(true), 300);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configLoading]);

  // 切换面板（书本 ↔ 记仇编辑器）
  const togglePanel = () => {
    setShowEditor((v) => !v);
    if (panelRef.current) {
      panelRef.current.style.transform = showEditor
        ? "translateX(0%)"
        : "translateX(-50%)";
    }
  };

  const currentConfig: AppConfig = {
    appTitle: config?.appTitle || "记仇小本本",
    bookTitle: config?.bookTitle || "我们的记仇本本",
    pageTitle: config?.pageTitle || "目录",
    pageSubtitle: config?.pageSubtitle || "点击就可以查看啦",
    pageNone: config?.pageNone || "这么清静？还不去记仇？",
    loadingText: config?.loadingText || "正在打开小本本",
    users: config?.users && config.users.length > 0 ? config.users : [
      { name: "佩琪", color: "#e84393" },
      { name: "乔治", color: "#0984e3" },
    ],
  };

  return (
    <>
      {/* 加载屏 */}
      <LoadingScreen text={currentConfig.loadingText} visible={!appReady} />

      <div id="app">
        {/* 顶部标题栏 */}
        <header className="app-header">
          <p className="app-title">{currentConfig.appTitle}</p>
          <button className="theme-btn" onClick={toggleTheme} title="切换主题">
            {theme === "light" ? "🌙" : "☀️"}
          </button>
        </header>

        {/* 主体：两个面板左右滑动 */}
        <main className="app-body">
          <div className="panel-track" ref={panelRef}>
            {/* 面板一：书本（查看记仇） */}
            <div className="panel">
              <Book
                config={currentConfig}
                entries={entries}
                hasMore={hasMore}
                loadingMore={loadingMore}
                onLoadMore={loadMore}
                onRefresh={reload}
              />
              <button className="switch-btn" onClick={togglePanel}>
                记个仇
              </button>
            </div>

            {/* 面板二：编辑器（记仇） */}
            <div className="panel">
              <EntryEditor
                users={currentConfig.users}
                onSuccess={() => {
                  reload();
                  togglePanel();
                }}
              />
              <button className="switch-btn" onClick={togglePanel}>
                查看小本本
              </button>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
