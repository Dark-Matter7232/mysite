import fs from "fs/promises";
import path from "path";
import os from "os";

const DIR_PUBLIC = path.join(process.cwd(), "public");

async function walkDir(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const res = path.resolve(dir, entry.name);
      return entry.isDirectory() ? walkDir(res) : res;
    })
  );
  return Array.prototype.concat(...files);
}

function isUnsupportedAvif(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ERR_IMAGE_FORMAT_UNSUPPORTED"
  );
}

type NativeImage = {
  avif: (options: { quality: number }) => { write: (destination: string) => Promise<unknown> }
  webp: (options: { quality: number }) => { write: (destination: string) => Promise<unknown> }
}

function getNativeImage(source: string): NativeImage | null {
  const file = Bun.file(source) as unknown as { image?: () => NativeImage }
  return typeof file.image === 'function' ? file.image() : null
}

async function writeAvifWithFallback(source: string, destination: string): Promise<void> {
  const nativeImage = getNativeImage(source);

  if (nativeImage) {
    try {
      await nativeImage.avif({ quality: 80 }).write(destination);
      return;
    } catch (error) {
      if (!isUnsupportedAvif(error)) {
        throw error;
      }
    }
  }

  // Bun's native AVIF encoder is platform-dependent. Keep AVIF output
  // portable by falling back to Sharp where Bun cannot encode it or does not
  // expose the image API.
  const { default: sharp } = await import("sharp");
  await sharp(source).avif({ quality: 80, effort: 6 }).toFile(destination);
}

async function writeWebpWithFallback(source: string, destination: string): Promise<void> {
  const nativeImage = getNativeImage(source);

  if (nativeImage) {
    await nativeImage.webp({ quality: 80 }).write(destination);
    return;
  }

  const { default: sharp } = await import("sharp");
  await sharp(source).webp({ quality: 80, effort: 6 }).toFile(destination);
}

async function optimizeImages() {
  console.log("Starting image optimization...");
  const files = await walkDir(DIR_PUBLIC);
  
  const imageFiles = files.filter((file: string) => 
    /\.(png|jpe?g|webp)$/i.test(file)
  );

  const maxConcurrency = Math.max(1, os.cpus().length - 1);
  console.log(`Optimizing ${imageFiles.length} images with ${maxConcurrency} workers...`);

  let currentIndex = 0;
  let failures = 0;

  const processNext = async (): Promise<void> => {
    while (currentIndex < imageFiles.length) {
      const file = imageFiles[currentIndex++];
      const ext = path.extname(file);
      const avifFile = file.replace(new RegExp(`${ext}$`, 'i'), '.avif');
      const webpFile = file.replace(new RegExp(`${ext}$`, 'i'), '.webp');
      const isWebpSource = ext.toLowerCase() === '.webp';
      
      try {
        await writeAvifWithFallback(file, avifFile);
        console.log(`✅ Optimized (AVIF): ${path.relative(DIR_PUBLIC, avifFile)}`);
        
        // Create WebP as fallback (only if source is not already WebP)
        if (!isWebpSource) {
          await writeWebpWithFallback(file, webpFile);
          console.log(`✅ Optimized (WebP): ${path.relative(DIR_PUBLIC, webpFile)}`);
        } else {
          console.log(`⏭️  Skipped generation (already WebP): ${path.relative(DIR_PUBLIC, file)}`);
        }
      } catch (err) {
        failures += 1;
        console.error(`❌ Failed to optimize: ${file}`, err);
      }
    }
  };

  const workers = Array.from({ length: maxConcurrency }).map(() => processNext());
  await Promise.all(workers);

  if (failures > 0) {
    throw new Error(`Image optimization failed for ${failures} file(s)`);
  }
  
  console.log("Image optimization complete.");
}

optimizeImages().catch(console.error);
