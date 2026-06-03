const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory() && !file.includes('node_modules') && !file.includes('.git')) { 
      /* Recurse into a subdirectory */
      results = results.concat(walk(file));
    } else { 
      /* Is a file */
      if (file.endsWith('.mp4') || file.endsWith('.webm') || file.endsWith('.mov')) {
        results.push(file);
      }
    }
  });
  return results;
}

console.log(walk('.'));
