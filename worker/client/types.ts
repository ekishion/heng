// 类型定义

export interface EntryIndex {
  id: string;
  author: string;
  title: string;
  resolved_at?: string | null;
  created_at: string;
}

export interface Entry extends EntryIndex {
  body: string;
}

export interface UserConfig {
  name: string;
  color: string;
}

export interface AppConfig {
  appTitle: string;
  bookTitle: string;
  pageTitle: string;
  pageSubtitle: string;
  pageNone: string;
  loadingText: string;
  users: UserConfig[];
}

export interface ApiListResponse {
  success: boolean;
  data: EntryIndex[];
  hasMore: boolean;
  total: number;
}

export interface ApiDetailResponse {
  success: boolean;
  data: Entry;
}

export interface ApiConfigResponse {
  success: boolean;
  data: AppConfig;
}

export interface ApiCreateResponse {
  success: boolean;
  data: EntryIndex;
  error?: string;
}

export interface ApiUploadResponse {
  success: boolean;
  data?: {
    url: string;
    key: string;
  };
  error?: string;
}

export interface ApiLoginResponse {
  success: boolean;
  data?: {
    token: string;
    unlocked: boolean;
  };
  error?: string;
}

export interface ApiMeResponse {
  success: boolean;
  data?: {
    unlocked: boolean;
  };
  error?: string;
}
