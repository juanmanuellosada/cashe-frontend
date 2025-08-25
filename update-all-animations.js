const fs = require('fs');
const path = require('path');

// Archivos que contienen animaciones de botones
const files = [
  'app/accounts/page.tsx',
  'app/transfers/page.tsx', 
  'app/categories/page.tsx',
  'app/currencies/page.tsx',
  'app/transactions/page.tsx',
  'app/settings/page.tsx',
  'app/dashboard/page.tsx',
  'components/transaction-modal.tsx',
  'components/account-modal.tsx',
  'components/category-modal.tsx',
  'components/quick-action-modal.tsx',
  'components/transfer-modal.tsx',
  'components/TimeRangeSelector.tsx'
];

// Nueva configuración de animación estándar
const newAnimationConfig = `
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 40,
                    duration: 0.15,
                  }}`;

// Función para actualizar las animaciones
function updateAnimations(content, filePath) {
  let updated = content;
  
  // Patrones de animaciones antiguas a reemplazar
  const oldPatterns = [
    // Patrón 1: initial, animate, exit con transition
    /initial=\{\{[^}]*\}\}\s*animate=\{\{[^}]*\}\}\s*exit=\{\{[^}]*\}\}\s*transition=\{\{[^}]*\}\}/gs,
    
    // Patrón 2: Solo initial, animate, exit
    /initial=\{\{[^}]*\}\}\s*animate=\{\{[^}]*\}\}\s*exit=\{\{[^}]*\}\}/gs,
    
    // Patrón 3: Solo transition
    /transition=\{\{[^}]*\}\}/gs
  ];
  
  // Reemplazar todos los patrones antiguos
  oldPatterns.forEach(pattern => {
    updated = updated.replace(pattern, newAnimationConfig.trim());
  });
  
  // Si no hay animaciones, buscar motion.div que contengan Button y agregar las nuevas
  if (!updated.includes('whileHover') && updated.includes('motion.div')) {
    // Buscar motion.div que envuelvan Button
    updated = updated.replace(
      /<motion\.div([^>]*)>/g,
      (match, attributes) => {
        // Si ya tiene whileHover, no modificar
        if (attributes.includes('whileHover')) {
          return match;
        }
        // Si no tiene animaciones, agregar las nuevas
        return `<motion.div${attributes}${newAnimationConfig}\n                >`;
      }
    );
  }
  
  return updated;
}

// Procesar cada archivo
files.forEach(filePath => {
  const fullPath = path.resolve(filePath);
  
  if (fs.existsSync(fullPath)) {
    console.log(`Procesando ${filePath}...`);
    
    const content = fs.readFileSync(fullPath, 'utf8');
    const updatedContent = updateAnimations(content, filePath);
    
    if (content !== updatedContent) {
      fs.writeFileSync(fullPath, updatedContent);
      console.log(`✅ Actualizado ${filePath}`);
    } else {
      console.log(`⏭️  Sin cambios en ${filePath}`);
    }
  } else {
    console.log(`❌ Archivo no encontrado: ${filePath}`);
  }
});

console.log('\n🎯 Actualización de animaciones completa!');
