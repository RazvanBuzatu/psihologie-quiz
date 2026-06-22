import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// App version (bump on meaningful releases) + automatic build timestamp.
// The build time changes on every deploy, so it's a reliable "did it update?" signal.
const APP_VERSION = '1.2.0'
const now = new Date()
const pad = n => String(n).padStart(2, '0')
const BUILD_TIME =
  `${pad(now.getUTCDate())}.${pad(now.getUTCMonth() + 1)}.${now.getUTCFullYear()} ` +
  `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}`

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
    __BUILD_TIME__: JSON.stringify(BUILD_TIME),
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
})
