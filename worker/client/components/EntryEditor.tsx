import { useState, useRef, useEffect } from "react";
import type { UserConfig } from "../types";
import { createEntry, uploadImage, login, fetchMe, clearToken, getToken } from "../api/client";
import "./EntryEditor.css";

interface Props {
  users: UserConfig[];
  onSuccess: () => void;
}

const EMOJI_LIST = ["😡", "😤", "🔪", "💔", "🙄", "🐷", "🥟", "🔨", "🥺", "🤡", "💣", "💢", "🤐", "🥊", "👀", "💔", "❤️"];

export default function EntryEditor({ users, onSuccess }: Props) {
  const availableUsers = users && users.length > 0 ? users : [
    { name: "佩琪", color: "#e84393" },
    { name: "乔治", color: "#0984e3" },
  ];

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [author, setAuthor] = useState(availableUsers[0]?.name || "佩琪");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [pendingAction, setPendingAction] = useState<"submit" | "upload" | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" | "warn" } | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const showMsg = (text: string, type: "success" | "error" | "warn") => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3000);
  };

  // 挂载时校验是否存在有效通行证
  useEffect(() => {
    try {
      localStorage.removeItem("heng-pwd");
    } catch {
      // 忽略
    }

    if (getToken()) {
      fetchMe().then((res) => {
        if (res.success && res.data?.unlocked) {
          setIsUnlocked(true);
        } else {
          clearToken();
          setIsUnlocked(false);
        }
      }).catch(() => {
        clearToken();
        setIsUnlocked(false);
      });
    }
  }, []);

  // 当用户配置更新时，确保 author 有默认值
  useEffect(() => {
    if (!author && availableUsers.length > 0) {
      setAuthor(availableUsers[0].name);
    }
  }, [availableUsers, author]);

  // 点击外部收起身份下拉菜单和表情选择器
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      const emojiContainer = document.querySelector(".heng-editor__emoji-popover");
      const emojiBtn = document.querySelector(".heng-editor__tool-btn--emoji");
      if (
        emojiContainer &&
        !emojiContainer.contains(e.target as Node) &&
        emojiBtn &&
        !emojiBtn.contains(e.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const executeCommand = (command: string, value: string | undefined = undefined) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, value);
    handleEditorInput();
  };

  const handleEditorInput = () => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    const text = editorRef.current.innerText.trim();
    const hasImg = editorRef.current.querySelector("img") !== null;

    if (!text && !hasImg) {
      if (editorRef.current.innerHTML !== "") {
        editorRef.current.innerHTML = "";
      }
      setBody("");
    } else {
      setBody(html);
    }
  };

  const insertHtmlAtCursor = (html: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (editorRef.current.contains(range.commonAncestorContainer)) {
        range.deleteContents();
        const el = document.createElement("div");
        el.innerHTML = html;
        const frag = document.createDocumentFragment();
        let node: ChildNode | null;
        let lastNode: ChildNode | null = null;
        while ((node = el.firstChild)) {
          lastNode = frag.appendChild(node);
        }
        range.insertNode(frag);
        if (lastNode) {
          range.setStartAfter(lastNode);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        }
        handleEditorInput();
        return;
      }
    }
    // 回退到末尾追加
    editorRef.current.innerHTML += html;
    handleEditorInput();
  };

  const insertEmoji = (emoji: string) => {
    insertHtmlAtCursor(emoji);
    setShowEmojiPicker(false);
  };

  // 处理图片上传并插入到编辑器中
  const handleImageUpload = async (file: File) => {
    if (!getToken() || !isUnlocked) {
      showMsg("上传图片前请输入小本本暗号", "warn");
      setPendingFile(file);
      setPendingAction("upload");
      setShowPwd(true);
      return;
    }

    setUploadingImg(true);
    showMsg("正在上传插图到 R2...", "warn");
    try {
      const res = await uploadImage(file);
      if (res.success && res.data) {
        insertHtmlAtCursor(`<p><img src="${res.data.url}" alt="插图" class="heng-entry-img" /></p>`);
        showMsg("插图上传成功", "success");
      } else {
        showMsg(res.error || "上传图片失败", "error");
        if (res.error?.includes("未解锁") || res.error?.includes("过期")) {
          clearToken();
          setIsUnlocked(false);
          setPendingFile(file);
          setPendingAction("upload");
          setShowPwd(true);
        }
      }
    } catch {
      showMsg("网络异常，上传图片失败", "error");
    } finally {
      setUploadingImg(false);
    }
  };

  // 剪贴板图片粘贴支持
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            handleImageUpload(file);
            return;
          }
        }
      }
    }
  };

  // 拖拽图片支持
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith("image/")) {
      e.preventDefault();
      handleImageUpload(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
    e.target.value = "";
  };

  const handleSubmit = async () => {
    const textContent = editorRef.current?.innerText.trim() || "";
    const hasImg = editorRef.current?.querySelector("img") !== null;

    if (!title.trim() || (!textContent && !hasImg) || !author) {
      return showMsg("记仇也需要认真填写哦！", "warn");
    }

    // 未持有有效通行证时唤起暗号弹窗
    if (!getToken() || !isUnlocked) {
      setPendingAction("submit");
      return setShowPwd(true);
    }

    setLoading(true);
    try {
      const res = await createEntry({ author, title: title.trim(), body });
      if (res.success) {
        showMsg("小本本又多了一条记仇~", "success");
        setTitle("");
        setBody("");
        if (editorRef.current) {
          editorRef.current.innerHTML = "";
        }
        onSuccess();
      } else {
        showMsg(res.error || "提交失败，请重试", "error");
        if (res.error?.includes("未解锁") || res.error?.includes("过期")) {
          clearToken();
          setIsUnlocked(false);
          setShowPwd(true);
        }
      }
    } catch {
      showMsg("网络错误，请重试", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUnlockConfirm = async () => {
    if (!password) {
      return showMsg("请输入小本本暗号！", "warn");
    }

    setLoading(true);
    try {
      const res = await login(password, rememberMe);
      if (res.success && res.data?.unlocked) {
        setIsUnlocked(true);
        setShowPwd(false);
        setPassword("");
        showMsg("小本本已解锁~", "success");

        if (pendingAction === "submit") {
          setTimeout(async () => {
            const createRes = await createEntry({ author, title: title.trim(), body });
            if (createRes.success) {
              showMsg("小本本又多了一条记仇~", "success");
              setTitle("");
              setBody("");
              if (editorRef.current) {
                editorRef.current.innerHTML = "";
              }
              onSuccess();
            } else {
              showMsg(createRes.error || "提交失败", "error");
            }
          }, 100);
        } else if (pendingAction === "upload" && pendingFile) {
          const fileToUpload = pendingFile;
          setPendingFile(null);
          setTimeout(() => {
            handleImageUpload(fileToUpload);
          }, 100);
        }
      } else {
        showMsg(res.error || "暗号不正确，请重新输入", "error");
      }
    } catch {
      showMsg("网络异常，验证失败", "error");
    } finally {
      setLoading(false);
      setPendingAction(null);
    }
  };

  const handleLock = () => {
    clearToken();
    setIsUnlocked(false);
    showMsg("已锁定小本本", "success");
  };

  return (
    <div className={`editWdnmd ${loading || uploadingImg ? "editor--loading" : ""}`}>
      {msg && <div className={`editor__msg editor__msg--${msg.type}`}>{msg.text}</div>}

      {/* 记仇标题 + 身份选择 */}
      <div className="editWdnmdTitle">
        <input
          className="editWdnmdTitleInput"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="记仇也要来个标题吧！"
        />
        <div className="identitySelectWrapper" ref={dropdownRef}>
          <div
            className="identitySelectTrigger"
            onClick={() => setDropdownOpen((v) => !v)}
            title="点击切换发言人"
          >
            <span>{author || "你是？"}</span>
            {author && (
              <span
                className="identityColor"
                style={{
                  backgroundColor: availableUsers.find((u) => u.name === author)?.color || "transparent",
                }}
              />
            )}
            <span className={`identityArrow ${dropdownOpen ? "identityArrow--open" : ""}`}>
              ⌄
            </span>
          </div>

          {isUnlocked && (
            <span className="identityLoginTag" onClick={handleLock} title="点击锁定小本本">
              🔓 已解锁 <span className="logoutBtn">锁定</span>
            </span>
          )}

          {dropdownOpen && (
            <div className="identityDropdown">
              {availableUsers.map((u) => (
                <div
                  key={u.name}
                  className={`identityDropdownItem ${author === u.name ? "active" : ""}`}
                  onClick={() => {
                    setAuthor(u.name);
                    setDropdownOpen(false);
                  }}
                >
                  <span>{u.name}</span>
                  <span className="identityColor" style={{ backgroundColor: u.color }} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 轻量原生富文本编辑器 */}
      <div className="heng-editor">
        {/* 工具栏 */}
        <div className="heng-editor__toolbar">
          <button
            type="button"
            className="heng-editor__tool-btn"
            title="加粗"
            onMouseDown={(e) => { e.preventDefault(); executeCommand("bold"); }}
          >
            <b>B</b>
          </button>
          <button
            type="button"
            className="heng-editor__tool-btn"
            title="斜体"
            onMouseDown={(e) => { e.preventDefault(); executeCommand("italic"); }}
          >
            <i>I</i>
          </button>
          <button
            type="button"
            className="heng-editor__tool-btn"
            title="删除线"
            onMouseDown={(e) => { e.preventDefault(); executeCommand("strikeThrough"); }}
          >
            <s>S</s>
          </button>
          <button
            type="button"
            className="heng-editor__tool-btn"
            title="大标题"
            onMouseDown={(e) => { e.preventDefault(); executeCommand("formatBlock", "<h3>"); }}
          >
            <b>H</b>
          </button>
          <button
            type="button"
            className="heng-editor__tool-btn"
            title="引用"
            onMouseDown={(e) => { e.preventDefault(); executeCommand("formatBlock", "<blockquote>"); }}
          >
            ❝
          </button>
          <button
            type="button"
            className="heng-editor__tool-btn"
            title="列表"
            onMouseDown={(e) => { e.preventDefault(); executeCommand("insertUnorderedList"); }}
          >
            •
          </button>
          <button
            type="button"
            className="heng-editor__tool-btn"
            title="分割线"
            onMouseDown={(e) => { e.preventDefault(); executeCommand("insertHorizontalRule"); }}
          >
            ―
          </button>

          <span className="heng-editor__divider" />

          {/* 表情按钮 */}
          <button
            type="button"
            className="heng-editor__tool-btn heng-editor__tool-btn--emoji"
            title="插入表情"
            onClick={() => setShowEmojiPicker((v) => !v)}
          >
            😊
          </button>

          {/* 图片上传按钮 */}
          <button
            type="button"
            className="heng-editor__tool-btn"
            title="插入图片 (支持点击选择、截图粘贴或直接拖入)"
            onClick={() => fileInputRef.current?.click()}
          >
            📷
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
        </div>

        {/* 表情弹窗 / 抽屉 */}
        {showEmojiPicker && (
          <div className="heng-editor__emoji-popover">
            {EMOJI_LIST.map((emoji, idx) => (
              <span
                key={idx}
                className="heng-editor__emoji-item"
                onClick={() => insertEmoji(emoji)}
              >
                {emoji}
              </span>
            ))}
          </div>
        )}

        {/* 可编辑正文区域 */}
        <div
          ref={editorRef}
          className="heng-editor__content"
          contentEditable
          data-placeholder="这个仇我先记上！(支持直接粘贴/拖拽插图)"
          onInput={handleEditorInput}
          onPaste={handlePaste}
          onDrop={handleDrop}
          spellCheck={false}
        />
      </div>

      {/* 记到小本本 提交按钮 */}
      <div className="wdnmdsubmit" onClick={handleSubmit}>
        {loading ? "记录中..." : uploadingImg ? "图片上传中..." : "记到小本本"}
      </div>

      {/* 空间暗号解锁弹窗 */}
      {showPwd && (
        <div className="editor__pwd-overlay" onClick={() => setShowPwd(false)}>
          <div className="editor__pwd-dialog" onClick={(e) => e.stopPropagation()}>
            <p className="editor__pwd-title">输入小本本专属暗号</p>
            <input
              type="password"
              className="editor__pwd-input"
              placeholder="输入属于你们的暗号丫！"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUnlockConfirm()}
              autoFocus
            />
            <label className="editor__pwd-remember">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>在此设备保持解锁 (30天)</span>
            </label>
            <div className="editor__pwd-footer">
              <button onClick={() => setShowPwd(false)}>取消</button>
              <button className="editor__pwd-ok" onClick={handleUnlockConfirm}>解锁小本本</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
