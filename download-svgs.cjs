const fs = require('fs');
const path = require('path');

const logosPath = 'src/assets/logos';
if (!fs.existsSync(logosPath)) {
  fs.mkdirSync(logosPath, { recursive: true });
}

const urls = {
  dominos: 'https://upload.wikimedia.org/wikipedia/commons/9/91/Domino%27s_2025_%28symbol%29.svg',
  pizzahut: 'https://upload.wikimedia.org/wikipedia/commons/d/d2/Pizza_Hut_logo.svg',
  haldirams: 'https://upload.wikimedia.org/wikipedia/commons/2/25/Haldiram%27s_Logo_SVG.svg',
  subway: 'https://upload.wikimedia.org/wikipedia/commons/5/5c/Subway_2016_logo.svg',
  mcdonalds: 'https://upload.wikimedia.org/wikipedia/commons/3/36/McDonald%27s_Golden_Arches.svg'
};

async function downloadSVGs() {
  for (const [name, url] of Object.entries(urls)) {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,*/*'
      }
    });

    if (!res.ok) {
      console.error(`Failed to download ${name}: ${res.status}`);
      continue;
    }
    const text = await res.text();
    if (text.includes('<!DOCTYPE html>')) {
      console.error(`Received HTML instead of SVG for ${name}`);
      continue;
    }
    fs.writeFileSync(path.join(logosPath, `${name}.svg`), text);
    console.log(`Downloaded ${name}.svg`);
  }
}

downloadSVGs().then(() => console.log('Done.'));
