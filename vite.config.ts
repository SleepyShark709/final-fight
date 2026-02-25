import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron/simple';
import { cpSync } from 'fs';

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
        {
            name: 'copy-game-assets',
            apply: 'build' as const,
            closeBundle() {
                cpSync('assets', 'dist/assets', { recursive: true });
                console.log('[copy-game-assets] Copied assets/ → dist/assets/');
            },
        },
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
