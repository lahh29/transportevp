import fs from 'fs';

function fixColors(file) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace hsl(var(--color-foo)) with var(--color-foo)
  content = content.replace(/hsl\(\s*var\((--color-[a-z-]+)\)\s*\)/g, 'var($1)');
  
  // Replace hsl(var(--color-foo) / 0.1) with rgb(var(--color-foo-raw) / 0.1)
  content = content.replace(/hsl\(\s*var\((--color-[a-z-]+)\)\s*\/\s*([^)]+)\s*\)/g, 'rgb(var($1-raw) / $2)');
  
  // Specific fix for canvas-elevated
  content = content.replace(/hsl\(var\(--color-canvas-elevated,\s*white\)\)/g, 'var(--color-surface-card)');
  content = content.replace(/var\(--color-canvas-elevated,\s*white\)/g, 'var(--color-surface-card)');

  fs.writeFileSync(file, content);
}

fixColors('src/pages/EmpleadoLogin.jsx');
fixColors('src/pages/EmpleadoDashboard.jsx');
console.log('Colors fixed in both files.');
