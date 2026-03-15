import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        target: 'es2015',
        cssTarget: 'chrome61',
        minify: 'terser',
        sourcemap: false,
        cssMinify: true,
        reportCompressedSize: true,
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                about: resolve(__dirname, 'about.html'),
                activities: resolve(__dirname, 'activities.html'),
                news: resolve(__dirname, 'news.html'),
                contact: resolve(__dirname, 'contact.html'),
                labSubmission: resolve(__dirname, 'lab-submission.html'),
                labDirectory: resolve(__dirname, 'lab-directory.html'),
                labMap: resolve(__dirname, 'lab-map.html'),
                labProfile: resolve(__dirname, 'lab-profile.html'),
                advancedSearch: resolve(__dirname, 'advanced-search.html'),
                adminDashboard: resolve(__dirname, 'admin-dashboard.html'),
                seminarRegister: resolve(__dirname, 'seminar-register.html'),
                mobileTest: resolve(__dirname, 'mobile-test.html')
            },
            output: {
                chunkFileNames: 'assets/js/[name]-[hash].js',
                entryFileNames: 'assets/js/[name]-[hash].js',
                assetFileNames: (assetInfo) => {
                    const extType = assetInfo.name.split('.').at(1);
                    if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
                        return `assets/images/[name]-[hash][extname]`;
                    }
                    if (/css/i.test(extType)) {
                        return `assets/css/[name]-[hash][extname]`;
                    }
                    return `assets/[name]-[hash][extname]`;
                },
                manualChunks: {
                    utils: ['./main.js']
                }
            }
        },
        terserOptions: {
            compress: {
                drop_console: true,
                drop_debugger: true,
                pure_funcs: ['console.log', 'console.info', 'console.debug'],
                passes: 2
            },
            mangle: {
                safari10: true
            },
            format: {
                comments: false
            }
        }
    },
    server: {
        port: 5173,
        host: true,
        strictPort: true
    },
    preview: {
        port: 4173,
        host: true,
        strictPort: true
    },
    esbuild: {
        legalComments: 'none'
    }
});
