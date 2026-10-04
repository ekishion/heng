// API 客户端封装

import type {
  ApiListResponse,
  ApiDetailResponse,
  ApiConfigResponse,
  ApiCreateResponse,
  ApiUploadResponse,
  ApiLoginResponse,
  ApiMeResponse,
} from "../types";

const BASE = "/api";
const TOKEN_KEY = "heng-auth-token";

/** 读取客户端当前保存的 JWT Token */
export function getToken(): string {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

/** 存储 JWT Token（可选择仅会话有效或在此设备保留） */
export function setToken(token: string, remember = false): void {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
    if (remember) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // 忽略存储异常
  }
}

/** 清理 Token（登出） */
export function clearToken(): void {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // 忽略异常
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init?.headers as Record<string, string>),
  };

  const res = await fetch(`${BASE}${url}`, {
    ...init,
    headers,
  });
  const data = (await res.json()) as T;
  return data;
}

/** 输入小本本空间通行暗号解锁 */
export async function login(password: string, remember = true): Promise<ApiLoginResponse> {
  const res = await request<ApiLoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
  if (res.success && res.data?.token) {
    setToken(res.data.token, remember);
  }
  return res;
}

/** 校验当前登录状态 */
export function fetchMe(): Promise<ApiMeResponse> {
  return request<ApiMeResponse>("/auth/me");
}

/** 获取公开配置（用户列表、标题等） */
export function fetchConfig(): Promise<ApiConfigResponse> {
  return request<ApiConfigResponse>("/config");
}

/** 获取条目列表（公开接口） */
export function fetchEntries(page: number, perPage = 10): Promise<ApiListResponse> {
  return request<ApiListResponse>(`/entries?page=${page}&per_page=${perPage}`);
}

/** 获取条目详情（公开接口） */
export function fetchEntryDetail(id: string): Promise<ApiDetailResponse> {
  return request<ApiDetailResponse>(`/entries/${id}`);
}

/** 创建新条目（已登录直接携带 JWT，或传递 password 兼容） */
export function createEntry(payload: {
  author?: string;
  title: string;
  body: string;
  password?: string;
}): Promise<ApiCreateResponse> {
  return request<ApiCreateResponse>("/entries", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** 上传图片到 R2（已登录自动通过 JWT 授权） */
export async function uploadImage(file: File, password?: string): Promise<ApiUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  if (password) {
    formData.append("password", password);
  }

  const token = getToken();
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${BASE}/upload`, {
    method: "POST",
    headers,
    body: formData,
  });
  return (await res.json()) as ApiUploadResponse;
}

/** 删除条目（彻底抹去） */
export function deleteEntry(id: string): Promise<{ success: boolean; message?: string; error?: string }> {
  return request<{ success: boolean; message?: string; error?: string }>(`/entries/${id}`, {
    method: "DELETE",
  });
}

/** 和解盖章（标记已消仇或撤销） */
export function resolveEntry(
  id: string,
  resolve = true
): Promise<{ success: boolean; message?: string; error?: string }> {
  return request<{ success: boolean; message?: string; error?: string }>(`/entries/${id}/resolve`, {
    method: "PATCH",
    body: JSON.stringify({ resolve }),
  });
}
