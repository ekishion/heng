import { useState, useEffect, useCallback, useRef } from "react";
import DOMPurify from "dompurify";
import type { EntryIndex, Entry, AppConfig } from "../types";
import { fetchEntryDetail, deleteEntry, resolveEntry, login, getToken } from "../api/client";
import "./Book.css";

interface Props {
  config: AppConfig;
  entries: EntryIndex[];
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onRefresh?: () => void;
}

export default function Book({
  config,
  entries,
  hasMore,
  loadingMore,
  onLoadMore,
  onRefresh,
}: Props) {
  const [coverOpen, setCoverOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [previewImg, setPreviewImg] = useState<string | null>(null);

  // 就地快速认证弹窗状态（消仇/和解无需翻页去编辑器面板）
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authPwd, setAuthPwd] = useState("");
  const [pendingAction, setPendingAction] = useState<"resolve" | "unresolve" | "delete" | null>(null);

  const listRef = useRef<HTMLDivElement>(null);

  // 无限滚动监听
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const handleScroll = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20 && !loadingMore && hasMore) {
        onLoadMore();
      }
    };
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [loadingMore, hasMore, onLoadMore]);

  const handleCoverClick = useCallback(() => {
    if (listOpen) {
      setListOpen(false);
    } else {
      setCoverOpen((v) => !v);
    }
  }, [listOpen]);

  const handleSelectEntry = useCallback(async (entry: EntryIndex) => {
    setListOpen(false);
    const res = await fetchEntryDetail(entry.id);
    if (res.success) setSelectedEntry(res.data);
  }, []);

  const handleListBgClick = useCallback(() => {
    setListOpen(false);
  }, []);

  const handleListTitleClick = useCallback(() => {
    setListOpen((v) => !v);
  }, []);

  // 捕获富文本内的图片点击，弹出原生全屏大图预览
  const handleBodyClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "IMG") {
      const src = target.getAttribute("src");
      if (src) setPreviewImg(src);
    }
  }, []);

  // 执行具体操作逻辑
  const executeAction = useCallback(async (action: "resolve" | "unresolve" | "delete") => {
    if (!selectedEntry) return;

    if (action === "delete") {
      if (!window.confirm(`确定要彻底抹去关于【${selectedEntry.title}】的这条记录吗？（物理抹除后不可恢复哦）`)) {
        return;
      }
      try {
        const res = await deleteEntry(selectedEntry.id);
        if (res.success) {
          setSelectedEntry(null);
          onRefresh?.();
        } else {
          alert(res.error || "抹除失败，请重试");
        }
      } catch {
        alert("网络异常，操作失败");
      }
      return;
    }

    // 和解盖章或撤销和解
    const shouldResolve = action === "resolve";
    try {
      const res = await resolveEntry(selectedEntry.id, shouldResolve);
      if (res.success) {
        setSelectedEntry((prev) =>
          prev ? { ...prev, resolved_at: shouldResolve ? new Date().toISOString() : null } : null
        );
        onRefresh?.();
      } else {
        alert(res.error || "盖章操作失败");
      }
    } catch {
      alert("网络异常，操作失败");
    }
  }, [selectedEntry, onRefresh]);

  // 触发操作入口（未解锁时唤起就地暗号弹窗，无需翻页）
  const handleAction = useCallback((action: "resolve" | "unresolve" | "delete") => {
    if (!getToken()) {
      setPendingAction(action);
      setAuthPwd("");
      setShowAuthModal(true);
      return;
    }
    void executeAction(action);
  }, [executeAction]);

  // 就地登录认证提交
  const handleAuthSubmit = async () => {
    if (!authPwd) {
      alert("请输入小本本暗号");
      return;
    }
    const res = await login(authPwd, true);
    if (res.success && res.data?.unlocked) {
      setShowAuthModal(false);
      setAuthPwd("");
      if (pendingAction) {
        void executeAction(pendingAction);
        setPendingAction(null);
      }
    } else {
      alert(res.error || "暗号不正确");
    }
  };

  return (
    <div className="book">
      {/* 白色底层装饰 */}
      <div className="book__white-bg" />

      {/* 封面 */}
      <div
        className={`book__layer book__cover ${coverOpen ? "book__layer--open" : ""}`}
        onClick={handleCoverClick}
      >
        <p>{config.bookTitle}</p>
      </div>

      {/* 目录页 */}
      <div
        ref={listRef}
        className={`book__layer book__list ${listOpen ? "book__layer--open" : ""}`}
      >
        <p className="book__title" onClick={handleListTitleClick}>{config.pageTitle}</p>
        <p className="book__subtitle">{config.pageSubtitle}</p>

        {entries.length === 0 ? (
          <p className="book__none">{config.pageNone}</p>
        ) : (
          entries.map((item) => (
            <div
              key={item.id}
              className="book__item"
              onClick={() => handleSelectEntry(item)}
            >
              <p>............................................</p>
              <span className="book__item-title">
                {item.title}
                {item.resolved_at && <span className="book__item-resolved-tag" title="已消仇和解">❤️</span>}
              </span>
              <span className="book__item-date">
                {new Date(item.created_at).toLocaleDateString("zh-CN")}
              </span>
            </div>
          ))
        )}

        {loadingMore && <div className="book__load-tip">加载中...</div>}
        {!hasMore && entries.length > 0 && (
          <div className="book__load-tip">没有仇啦已经！</div>
        )}
      </div>

      {/* 目录背部（点击关闭目录） */}
      <div
        className={`book__layer book__list-bg ${listOpen ? "book__layer--open book__list-bg--active" : ""}`}
        onClick={handleListBgClick}
      />

      {/* 内容页 */}
      <div className="book__layer book__content">
        {selectedEntry ? (
          <div className="book__content-inner">
            {/* 和解印章 */}
            {selectedEntry.resolved_at && (
              <div className="book__stamp">❤️ 已和解 · 翻篇啦</div>
            )}

            <p className="book__title">{selectedEntry.title}</p>
            <div className="book__meta">
              <span>👤 {selectedEntry.author}</span>
              <span>📅 {new Date(selectedEntry.created_at).toLocaleDateString("zh-CN")}</span>

              {/* 盖章与删除操作栏 */}
              <div className="book__actions">
                {selectedEntry.resolved_at ? (
                  <button
                    type="button"
                    className="book__btn-action book__btn-unresolve"
                    onClick={() => handleAction("unresolve")}
                    title="撤销和解印章"
                  >
                    ↩️ 撤销和解
                  </button>
                ) : (
                  <button
                    type="button"
                    className="book__btn-action book__btn-resolve"
                    onClick={() => handleAction("resolve")}
                    title="盖上和解印章"
                  >
                    🕊️ 和解盖章
                  </button>
                )}
                <button
                  type="button"
                  className="book__btn-action book__btn-delete"
                  onClick={() => handleAction("delete")}
                  title="彻底抹除此条记录"
                >
                  🗑️
                </button>
              </div>
            </div>

            <div
              className="book__body"
              onClick={handleBodyClick}
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(selectedEntry.body, {
                  ADD_ATTR: ["target"],
                }),
              }}
            />
          </div>
        ) : (
          <p className="book__none">点击目录选择一条记仇</p>
        )}
      </div>

      {/* 就地快速认证弹窗（无需翻页） */}
      {showAuthModal && (
        <div className="book__auth-overlay" onClick={() => setShowAuthModal(false)}>
          <div className="book__auth-dialog" onClick={(e) => e.stopPropagation()}>
            <p className="book__auth-title">输入小本本专属暗号</p>
            <input
              type="password"
              className="book__auth-input"
              placeholder="输入属于你们的暗号丫！"
              value={authPwd}
              onChange={(e) => setAuthPwd(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAuthSubmit()}
              autoFocus
            />
            <div className="book__auth-footer">
              <button type="button" onClick={() => setShowAuthModal(false)}>取消</button>
              <button type="button" className="book__auth-ok" onClick={handleAuthSubmit}>解锁</button>
            </div>
          </div>
        </div>
      )}

      {/* 原生图片全屏大图预览 Lightbox */}
      {previewImg && (
        <div className="book__lightbox" onClick={() => setPreviewImg(null)}>
          <img src={previewImg} alt="预览图片" className="book__lightbox-img" />
          <span className="book__lightbox-tip">点击任意处关闭</span>
        </div>
      )}
    </div>
  );
}
