const fs = require('fs');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory() && !file.includes('node_modules') && !file.includes('.git')) { 
      results = results.concat(walk(file));
    } else if (stat && stat.isFile()) { 
      if (file.toLowerCase().endsWith('.mp4') || file.toLowerCase().endsWith('.webm') || file.toLowerCase().endsWith('.mov')) {
        results.push(file);
      }
    }
  });
  return results;
}
console.log(walk('.'));
