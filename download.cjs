const https = require('https');
const fs = require('fs');
const path = require('path');

const fsPromises = fs.promises;

const logos = [
  { name: 'dominos.svg', url: 'https://upload.wikimedia.org/wikipedia/commons/7/74/Dominos_pizza_logo.svg' },
  { name: 'pizzahut.svg', url: 'https://upload.wikimedia.org/wikipedia/sco/f/f6/Pizza_Hut_logo.svg' },
  { name: 'haldirams.svg', url: 'https://upload.wikimedia.org/wikipedia/commons/e/ec/Haldiram_Logo.svg' },
  { name: 'subway.svg', url: 'https://upload.wikimedia.org/wikipedia/commons/5/5c/Subway_2016_logo.svg' },
  { name: 'mcdonalds.svg', url: 'https://upload.wikimedia.org/wikipedia/commons/3/36/McDonald%27s_Golden_Arches.svg' }
];

async function download() {
  await fsPromises.mkdir(path.join(__dirname, 'public'), { recursive: true });

  for (const logo of logos) {
    const dest = path.join(__dirname, 'public', logo.name);
    console.log(`Downloading ${logo.url}...`);
    
    await new Promise((resolve, reject) => {
      https.get(logo.url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
            https.get(res.headers.location, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res2) => {
                const file = fs.createWriteStream(dest);
                res2.pipe(file);
                file.on('finish', () => { file.close(); resolve(); });
            });
            return;
        }
        
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }).on('error', (err) => {
        fs.unlink(dest);
        reject(err);
      });
    });
  }
  console.log('All downloads completed.');
}

download();
