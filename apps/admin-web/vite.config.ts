import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1];
const configuredBase = process.env.VITE_BASE_PATH;
const base = configuredBase
  ? configuredBase
  : process.env.GITHUB_ACTIONS === 'true' && repoName
    ? `/${repoName}/`
    : '/';

export default defineConfig({
  base,
  plugins: [react()],
  envDir: fileURLToPath(new URL('../../', import.meta.url)),
  server: {
    host: '0.0.0.0',
    port: Number(process.env.ADMIN_WEB_PORT ?? 5173),
  },
});
