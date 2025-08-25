const fs = require('fs');
const path = require('path');

// Files to update
const files = [
  'app/accounts/page.tsx',
  'app/transfers/page.tsx', 
  'app/categories/page.tsx',
  'app/currencies/page.tsx',
  'app/transactions/page.tsx'
];

// Standard spring animation configuration
const springConfig = `
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 40,
        duration: 0.15,
      }}`;

// Function to wrap buttons with motion.div
function wrapButtonsWithMotion(content, filePath) {
  let updated = content;
  
  // Add framer-motion import if not present
  if (!updated.includes('"framer-motion"')) {
    // Find the import section and add framer-motion
    const importMatch = updated.match(/(import.*from.*['"]\@\/.*['"])/);
    if (importMatch) {
      const lastImport = importMatch[0];
      const importIndex = updated.indexOf(lastImport) + lastImport.length;
      updated = updated.slice(0, importIndex) + '\nimport { motion } from "framer-motion"' + updated.slice(importIndex);
    }
  }
  
  // Pattern to find Button components that are not already wrapped
  // Look for Button elements that have onClick handlers
  const buttonPattern = /(<Button[\s\S]*?onClick=[\s\S]*?>[\s\S]*?<\/Button>)/g;
  
  updated = updated.replace(buttonPattern, (match) => {
    // Skip if already wrapped with motion.div
    if (match.includes('motion.div')) {
      return match;
    }
    
    // Wrap with motion.div
    return `<motion.div${springConfig}
    >
      ${match}
    </motion.div>`;
  });
  
  return updated;
}

// Process each file
files.forEach(filePath => {
  const fullPath = path.resolve(filePath);
  
  if (fs.existsSync(fullPath)) {
    console.log(`Processing ${filePath}...`);
    
    const content = fs.readFileSync(fullPath, 'utf8');
    const updatedContent = wrapButtonsWithMotion(content, filePath);
    
    if (content !== updatedContent) {
      fs.writeFileSync(fullPath, updatedContent);
      console.log(`✅ Updated ${filePath}`);
    } else {
      console.log(`⏭️  No changes needed for ${filePath}`);
    }
  } else {
    console.log(`❌ File not found: ${filePath}`);
  }
});

console.log('\n🎯 Page button animation update complete!');
