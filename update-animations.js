const fs = require('fs');
const path = require('path');

// Files to update
const filesToUpdate = [
  'components/account-modal.tsx',
  'components/category-modal.tsx',
  'components/quick-action-modal.tsx'
];

// Animation replacements
const replacements = [
  // Remove animation imports
  {
    search: /import { modalVariants, formVariants, formItemVariants } from "@\/lib\/animations"/g,
    replace: ''
  },
  // Replace modal variants
  {
    search: /variants={modalVariants}\s*initial="initial"\s*animate="animate"\s*exit="exit"/g,
    replace: `initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ 
                type: "spring", 
                stiffness: 400, 
                damping: 40,
                duration: 0.15 
              }}`
  },
  // Replace form variants
  {
    search: /variants={formVariants}\s*initial="initial"\s*animate="animate"/g,
    replace: `initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}`
  },
  // Replace form item variants - simple version
  {
    search: /variants={formItemVariants}/g,
    replace: `initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.15 }}`
  }
];

filesToUpdate.forEach(filePath => {
  const fullPath = path.join(__dirname, filePath);
  
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Apply all replacements
    replacements.forEach(({ search, replace }) => {
      content = content.replace(search, replace);
    });
    
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  } else {
    console.log(`File not found: ${filePath}`);
  }
});

console.log('Animation updates completed!');
