import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

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

async function optimizeImages() {
  console.log("Starting image optimization...");
  const files = await walkDir(DIR_PUBLIC);
  
  const imageFiles = files.filter(file => 
    /\.(png|jpe?g)$/i.test(file)
  );

  for (const file of imageFiles) {
    const ext = path.extname(file);
    const avifFile = file.replace(new RegExp(`${ext}$`, 'i'), '.avif');
    const webpFile = file.replace(new RegExp(`${ext}$`, 'i'), '.webp');
    
    // Create AVIF
    try {
      await sharp(file)
        .avif({ quality: 80, effort: 6 })
        .toFile(avifFile);
      console.log(`✅ Optimized (AVIF): ${path.relative(DIR_PUBLIC, avifFile)}`);
      
      // Create WebP as fallback
      await sharp(file)
        .webp({ quality: 80, effort: 6 })
        .toFile(webpFile);
      console.log(`✅ Optimized (WebP): ${path.relative(DIR_PUBLIC, webpFile)}`);
    } catch (err) {
      console.error(`❌ Failed to optimize: ${file}`, err);
    }
  }
}

optimizeImages().catch(console.error);
