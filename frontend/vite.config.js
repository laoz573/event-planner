import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// ★ 本番ビルドだけ base を '/planner/' にしている。
//   家計簿(household)と同じドメイン household.mkssj-app.jp の /planner/ 配下に
//   同居させるため、ビルド成果物が読み込むJS/CSSのパスも /planner/ 始まりに
//   しておく必要がある(前段のリバースプロキシ shared-nginx が /planner/ を
//   取り除いてから event-planner-frontend に渡す)。
//   開発サーバー(npm run dev)はこれまでどおり / のままにしたいので、
//   command が 'build' のときだけ切り替える。
export default defineConfig(function (_a) {
    var command = _a.command;
    return ({
        base: command === 'build' ? '/planner/' : '/',
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
});
