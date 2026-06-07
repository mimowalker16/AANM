import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = resolve(repoRoot, 'frontend', 'public', 'api-config.js');

const productionApiBase =
    process.env.AANM_API_BASE ||
    process.env.VITE_API_BASE_URL ||
    process.env.API_BASE_URL ||
    'https://api.yourdomain.com';

const content = `(function () {
    var localHosts = ['localhost', '127.0.0.1', '::1'];
    var isLocal = localHosts.indexOf(window.location.hostname) !== -1;

    window.AANM_API_BASE = isLocal
        ? 'http://localhost:3001'
        : ${JSON.stringify(productionApiBase)};
})();
`;

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, content);

console.log(`Frontend API base configured for production: ${productionApiBase}`);
