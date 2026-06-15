import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const targetDir = path.resolve(process.cwd(), process.argv[2] || 'dist/assets/images');
const supportedExtensions = new Set(['.jpg', '.jpeg', '.png']);
const minSavingBytes = 1024;

async function pathExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function collectImages(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
        const entryPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...await collectImages(entryPath));
        } else if (supportedExtensions.has(path.extname(entry.name).toLowerCase())) {
            files.push(entryPath);
        }
    }

    return files;
}

function formatBytes(bytes) {
    return `${(bytes / 1024).toFixed(1)} KB`;
}

async function optimizeImage(filePath) {
    const original = await fs.stat(filePath);
    const extension = path.extname(filePath).toLowerCase();
    const tmpPath = `${filePath}.opt-${process.pid}`;

    try {
        const image = sharp(filePath, { failOn: 'none' }).rotate();
        const metadata = await image.metadata();
        const maxWidth = extension === '.png' ? 1600 : 1920;

        let pipeline = image;
        if (metadata.width && metadata.width > maxWidth) {
            pipeline = pipeline.resize({ width: maxWidth, withoutEnlargement: true });
        }

        if (extension === '.jpg' || extension === '.jpeg') {
            pipeline = pipeline.jpeg({
                quality: 78,
                mozjpeg: true,
                progressive: true
            });
        } else {
            pipeline = pipeline.png({
                compressionLevel: 9,
                adaptiveFiltering: true,
                effort: 10
            });
        }

        await pipeline.toFile(tmpPath);
        const optimized = await fs.stat(tmpPath);
        const savedBytes = original.size - optimized.size;

        if (savedBytes > minSavingBytes) {
            await fs.rename(tmpPath, filePath);
            return { optimized: true, originalBytes: original.size, optimizedBytes: optimized.size, savedBytes };
        }

        await fs.unlink(tmpPath);
        return { optimized: false, originalBytes: original.size, optimizedBytes: original.size, savedBytes: 0 };
    } catch (error) {
        await fs.unlink(tmpPath).catch(() => {});
        throw new Error(`${path.relative(process.cwd(), filePath)}: ${error.message}`);
    }
}

async function main() {
    if (!await pathExists(targetDir)) {
        console.log(`Image optimization skipped: ${path.relative(process.cwd(), targetDir)} does not exist yet.`);
        return;
    }

    const images = await collectImages(targetDir);
    if (images.length === 0) {
        console.log('Image optimization skipped: no JPG or PNG files found.');
        return;
    }

    let optimizedCount = 0;
    let originalTotal = 0;
    let optimizedTotal = 0;
    const changed = [];

    for (const imagePath of images) {
        const result = await optimizeImage(imagePath);
        originalTotal += result.originalBytes;
        optimizedTotal += result.optimizedBytes;

        if (result.optimized) {
            optimizedCount += 1;
            changed.push({
                file: path.relative(process.cwd(), imagePath),
                before: result.originalBytes,
                after: result.optimizedBytes,
                saved: result.savedBytes
            });
        }
    }

    for (const item of changed) {
        console.log(`Optimized ${item.file}: ${formatBytes(item.before)} -> ${formatBytes(item.after)} (${formatBytes(item.saved)} saved)`);
    }

    console.log(`Image optimization complete: ${optimizedCount}/${images.length} files optimized, ${formatBytes(originalTotal - optimizedTotal)} saved.`);
}

main().catch(error => {
    console.error(`Image optimization failed: ${error.message}`);
    process.exit(1);
});
