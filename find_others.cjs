const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory() && !file.includes('node_modules') && !file.includes('.git')) { 
      results = results.concat(walk(file));
    } else { 
      if (!file.endsWith('.ts') && !file.endsWith('.tsx') && !file.endsWith('.js') && !file.endsWith('.cjs') && !file.endsWith('.json') && !file.endsWith('.css') && !file.endsWith('.html') && !file.endsWith('.md') && !file.endsWith('.svg') && !file.endsWith('.jpg') && !file.endsWith('.png')) {
        results.push(file);
      }
    }
  });
  return results;
}
console.log(walk('.'));
