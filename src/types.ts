// Worker 环境变量类型定义

export interface Env {
  // D1 Database 绑定（条目存储与索引）
  DB: D1Database;
  // R2 Bucket 绑定（图片存储）
  R2: R2Bucket;
  // 应用配置
  APP_TITLE: string;
  BOOK_TITLE: string;
  PAGE_TITLE: string;
  PAGE_SUBTITLE: string;
  PAGE_NONE: string;
  LOADING_TEXT: string;
  ALLOWED_ORIGIN: string;
  // 图片大小上限（字节字符串），默认 "5242880"（5MB）
  IMAGE_MAX_SIZE: string;
  // 小本本空间专属通行暗号（通过 wrangler secret put AUTH_SECRET 设置）
  // 支持纯文本密码或 sha256 加盐哈希
  AUTH_SECRET?: string;
  // 用户公开配置（可选，JSON 格式: [{"name":"佩琪","color":"#e84393"}]）
  USERS?: string;
  // JWT 签名密钥（通过 wrangler secret put JWT_SECRET 设置）
  JWT_SECRET?: string;
}

// 条目列表项
export interface EntryIndex {
  id: string;
  author: string;
  title: string;
  resolved_at?: string | null;
  created_at: string;
}

// 条目完整数据（存在 D1）
export interface Entry extends EntryIndex {
  body: string;
}

// 用户配置
export interface UserConfig {
  name: string;
  color: string;
  password?: string;
}

// 创建条目请求体
export interface CreateEntryBody {
  author?: string;
  title: string;
  body: string;
  password?: string;
}

// API 响应格式
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// 认证登录响应数据
export interface AuthResult {
  token: string;
  unlocked: boolean;
}

// 上传成功响应
export interface UploadResult {
  url: string;   // 图片访问 URL（/api/image/{key}）
  key: string;   // R2 object key
}
