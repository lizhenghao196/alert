import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 预览器会分配端口并通过 PORT 传进来；不读它的话 vite 会固定占 5173，
// 而 5173 上常常已经有别的 dev server。
const assignedPort = process.env.PORT ? Number(process.env.PORT) : undefined

export default defineConfig({
  base: '/alert-screen/',
  plugins: [react()],
  server: {
    port: assignedPort,
    // 接口是相对路径，生产由 nginx 反代。本地不代理的话查询会直接 404，
    // 没法在真机数据下验证 UI。
    proxy: {
      '/ongoing-alerts-api': {
        target: 'http://49.51.194.37',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
  },
})