import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tamaños para PWA icons
const sizes = [72, 96, 128, 144, 152, 167, 180, 192, 512];
// Tamaños para favicons del navegador (incluyendo más grandes)
const faviconSizes = [16, 32, 48, 64, 96];

const inputFile = path.join(__dirname, '../public/icons/favicon.png');
const outputDir = path.join(__dirname, '../public/icons');
const publicDir = path.join(__dirname, '../public');

// Crear directorio si no existe
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('🎨 Generando íconos para PWA...\n');

// Generar íconos PWA
for (const size of sizes) {
  await sharp(inputFile)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .toFile(path.join(outputDir, `icon-${size}.png`));
  console.log(`✓ icons/icon-${size}.png`);
}

console.log('\n🌐 Generando favicons para navegador...\n');

// Generar favicons
for (const size of faviconSizes) {
  await sharp(inputFile)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .toFile(path.join(publicDir, `favicon-${size}.png`));
  console.log(`✓ favicon-${size}.png`);
}

// Generar favicon.ico (usando el de 32px como base)
await sharp(inputFile)
  .resize(32, 32, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 }
  })
  .toFile(path.join(publicDir, 'favicon.ico'));
console.log(`✓ favicon.ico`);

console.log('\n✨ ¡Todos los íconos generados correctamente!');
