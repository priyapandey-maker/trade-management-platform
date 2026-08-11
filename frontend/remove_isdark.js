const fs = require('fs');
const path = require('path');

function replaceIsDarkInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace `const isDark = theme === 'dark';` with `const isDark = false;`
  content = content.replace(/const isDark = theme === 'dark';/g, '');
  content = content.replace(/const { theme, toggleTheme } = useTheme\(\);/g, '');
  content = content.replace(/const { theme } = useTheme\(\);/g, '');
  content = content.replace(/import { useTheme } from '@\/context\/ThemeContext';/g, '');
  content = content.replace(/import { ThemeProvider, useTheme } from '@\/context\/ThemeContext';/g, "import { ThemeProvider } from '@/context/ThemeContext';");

  // Regex to replace simple `isDark ? 'val1' : 'val2'` with `'val2'`
  // We match `isDark \? ([^:]+) : ([^,}]+)`
  // This is a naive regex, but covers 90% of our inline cases like `isDark ? '#FFF' : '#000'`
  
  // Actually, since there are many ternary variations, a safer approach is to replace `isDark \? [^:]+ : ([^,}]+)`
  // Let's use a simpler approach: just leave `const isDark = false;` at the top of components that need it, 
  // OR manually fix the files since there are only 5-6 page files.

  // Let's manually replace specific known patterns
  content = content.replace(/isDark \? '[^']+' : ('[^']+')/g, '$1');
  content = content.replace(/isDark \? `[^`]+` : (`[^`]+`)/g, '$1');
  content = content.replace(/isDark \? [^:]+ : ('[^']+')/g, '$1');
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Updated ' + filePath);
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      replaceIsDarkInFile(fullPath);
    }
  }
}

walkDir('c:/Users/priya/.gemini/antigravity-ide/scratch/trade-management-platform/frontend/src/app');
walkDir('c:/Users/priya/.gemini/antigravity-ide/scratch/trade-management-platform/frontend/src/components');
