const fs = require('fs');
const path = require('path');
const dir = 'c:/Users/Arunabh/Desktop/calyx/frontend/src/components';

const files = fs.readdirSync(dir).filter(f => f.endsWith('.css')).map(f => path.join(dir, f));
files.push('c:/Users/Arunabh/Desktop/calyx/frontend/src/index.css');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf-8');
  
  // Replace rgba(255, 255, 255, opacity) with rgba(var(--text-rgb), opacity) for theme compatibility
  content = content.replace(/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*([0-9.]+)\s*\)/g, 'rgba(var(--text-rgb), $1)');
  
  fs.writeFileSync(file, content);
  console.log('Processed', file);
});
