import { config } from '../config/index.js';

function requireStorageConfig() {
    if (!config.supabase.url || !config.supabase.serviceRoleKey) {
        throw new Error('Supabase Storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    }
}

function encodeStoragePath(path) {
    return String(path)
        .split('/')
        .map((part) => encodeURIComponent(part))
        .join('/');
}

function storageHeaders(contentType = null) {
    const headers = {
        apikey: config.supabase.serviceRoleKey,
        Authorization: `Bearer ${config.supabase.serviceRoleKey}`
    };

    if (contentType) {
        headers['Content-Type'] = contentType;
    }

    return headers;
}

async function readError(response) {
    const text = await response.text().catch(() => '');
    return text || `${response.status} ${response.statusText}`;
}

class SupabaseStorageService {
    get bucket() {
        return config.supabase.storageBucket;
    }

    async uploadBuffer(path, buffer, contentType) {
        requireStorageConfig();

        const url = `${config.supabase.url}/storage/v1/object/${encodeURIComponent(this.bucket)}/${encodeStoragePath(path)}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                ...storageHeaders(contentType || 'application/octet-stream'),
                'x-upsert': 'false'
            },
            body: buffer
        });

        if (!response.ok) {
            throw new Error(`Supabase upload failed: ${await readError(response)}`);
        }

        return {
            bucket: this.bucket,
            path
        };
    }

    async downloadBuffer(bucket, path) {
        requireStorageConfig();

        const url = `${config.supabase.url}/storage/v1/object/${encodeURIComponent(bucket)}/${encodeStoragePath(path)}`;
        const response = await fetch(url, {
            headers: storageHeaders()
        });

        if (!response.ok) {
            throw new Error(`Supabase download failed: ${await readError(response)}`);
        }

        return {
            buffer: Buffer.from(await response.arrayBuffer()),
            contentType: response.headers.get('content-type') || 'application/octet-stream'
        };
    }
}

export default new SupabaseStorageService();

