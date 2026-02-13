import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron/simple';

export default defineConfig({
    base: './',
    plugins: [
        electron({
            main: {
                entry: 'electron/main.ts',
            },
            preload: {
                input: 'electron/preload.ts',
            },
        }),
    ],
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
    },
    server: {
        port: 5173,
        open: false, // Don't open browser in electron dev mode
    },
    resolve: {
        alias: {
            '@': '/src',
        },
    },
});
