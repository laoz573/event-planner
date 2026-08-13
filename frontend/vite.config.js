import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [react()],
    server: {
        host: true,
        // elec-toolのフロントエンド開発サーバー(5173)と同時に動かせるよう、別ポートにしている
        port: 5174,
        // ngrokなど外部トンネル経由でアクセスする際に、動的に発行されるホスト名を許可する
        allowedHosts: ['.ngrok-free.app', '.ngrok-free.dev'],
        proxy: {
            '/api': {
                target: 'http://localhost:8000',
                changeOrigin: true
            }
        }
    }
});
