const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputDir = path.join(__dirname, '../public/cars');
const outputDir = path.join(__dirname, '../public/cars');

async function compressImages() {
  const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.png'));
  
  for (const file of files) {
    const inputPath = path.join(inputDir, file);
    const outputPath = path.join(outputDir, file.replace('.png', '.webp'));
    
    const stats = fs.statSync(inputPath);
    console.log(`Processing ${file} (${(stats.size / 1024 / 1024).toFixed(2)} MB)...`);
    
    await sharp(inputPath)
      .resize(800, 600, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 85 })
      .toFile(outputPath);
    
    const newStats = fs.statSync(outputPath);
    console.log(`  -> ${file.replace('.png', '.webp')} (${(newStats.size / 1024).toFixed(0)} KB)`);
  }
  
  console.log('\nDone! Now delete the old .png files manually if needed.');
}

compressImages().catch(console.error);



