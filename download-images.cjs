const https = require('https');
const fs = require('fs');
const path = require('path');

const imgPath = 'src/assets/images';
if (!fs.existsSync(imgPath)) {
  fs.mkdirSync(imgPath, { recursive: true });
}

const urls = {
  img_1565299624946: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop&q=80',
  img_1509722747041: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=400&h=300&fit=crop&q=80',
  img_1513104890138: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop&q=80',
  img_1543339308: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=400&h=300&fit=crop&q=80',
  img_1512621776951: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop&q=80',
  img_1533089860892: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400&h=300&fit=crop&q=80',
  img_about_hero: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&h=600&fit=crop&q=80'
};

async function downloadImages() {
  for (const [name, url] of Object.entries(urls)) {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Failed to download ${name}: ${res.status}`);
      continue;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(path.join(imgPath, `${name}.jpg`), buffer);
    console.log(`Downloaded ${name}.jpg`);
  }
}

downloadImages().then(() => console.log('Done.'));
