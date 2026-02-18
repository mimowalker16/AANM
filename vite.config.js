import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                about: resolve(__dirname, 'about.html'),
                activities: resolve(__dirname, 'activities.html'),
                news: resolve(__dirname, 'news.html'),
                contact: resolve(__dirname, 'contact.html'),
            },
        },
    },
});
