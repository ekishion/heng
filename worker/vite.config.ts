import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 前端源码根目录
  root: "client",
  // 静态资源目录（相对于 root）
  publicDir: "../public",
  build: {
    // 构建产物输出到 worker/dist/，CF Pages 配置 output dir 为 dist
    outDir: "../dist",
    emptyOutDir: true,
  },
  server: {
    // 开发时将后端接口代理到 wrangler dev
    proxy: {
      "^/api/(config|entries|upload|image)": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
});
