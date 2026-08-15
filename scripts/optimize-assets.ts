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

async function writeAvifWithFallback(source: string, destination: string): Promise<void> {
  try {
    await Bun.file(source).image().avif({ quality: 80 }).write(destination);
    return;
  } catch (error) {
    if (!isUnsupportedAvif(error)) {
      throw error;
    }
  }

  // Bun's native AVIF encoder is platform-dependent. Keep AVIF output
  // portable by falling back to Sharp only where Bun cannot encode it.
  const { default: sharp } = await import("sharp");
  await sharp(source).avif({ quality: 80, effort: 6 }).toFile(destination);
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
          await Bun.file(file)
            .image()
            .webp({ quality: 80 })
            .write(webpFile);
          console.log(`✅ Optimized (WebP): ${path.relative(DIR_PUBLIC, webpFile)}`);
        } else {
          console.log(`⏭️  Skipped generation (already WebP): ${path.relative(DIR_PUBLIC, file)}`);
        }
      } catch (err) {
        console.error(`❌ Failed to optimize: ${file}`, err);
      }
    }
  };

  const workers = Array.from({ length: maxConcurrency }).map(() => processNext());
  await Promise.all(workers);
  
  console.log("Image optimization complete.");
}

optimizeImages().catch(console.error);
