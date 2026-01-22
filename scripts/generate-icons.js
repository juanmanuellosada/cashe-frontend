import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [72, 96, 128, 144, 152, 167, 180, 192, 512];
const inputFile = path.join(__dirname, '../public/favicon.png');
const outputDir = path.join(__dirname, '../public/icons');

// Crear directorio si no existe
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('Generando íconos...');

for (const size of sizes) {
  await sharp(inputFile)
    .resize(size, size)
    .toFile(path.join(outputDir, `icon-${size}.png`));
  console.log(`✓ icon-${size}.png`);
}

console.log('\n¡Íconos generados correctamente!');
