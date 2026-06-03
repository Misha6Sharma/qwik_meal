const https = require('https');
const fs = require('fs');

const logos = [
  { id: 'b3', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Haldiram_Logo.svg/320px-Haldiram_Logo.svg.png' },
  { id: 'b5', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/McDonald%27s_Golden_Arches.svg/320px-McDonald%27s_Golden_Arches.svg.png' }
];

async function run() {
  const base64map = {};
  for (const logo of logos) {
    console.log(`Downloading ${logo.url}...`);
    try {
      const p = new Promise((resolve, reject) => {
        function getUrl(targetUrl) {
            https.get(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36' } }, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 308) {
                getUrl(res.headers.location);
                return;
            }
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    console.log(`Failed ${logo.id} status ${res.statusCode} ${Buffer.concat(chunks).toString().substring(0, 50)}`);
                    return resolve(null);
                }
                const b64 = Buffer.concat(chunks).toString('base64');
                resolve(`data:image/png;base64,${b64}`);
            });
            }).on('error', reject);
        }
        getUrl(logo.url);
      });
      const dataUri = await p;
      if (dataUri && !dataUri.includes('data:image/png;base64,PCFET')) {
        base64map[logo.id] = dataUri;
        console.log(`Success ${logo.id}: size ${dataUri.length}`);
      } else {
        console.log(`Failed ${logo.id}`);
      }
    } catch (e) {
      console.log('Error', e);
    }
  }

  // Update data.mock.ts
  let data = fs.readFileSync('src/data.mock.ts', 'utf8');
  for (const id of Object.keys(base64map)) {
    const reg = new RegExp(`(id:\\s*'${id}',\\s*name:\\s*'.*?',\\s*logo:\\s*)'.*?'`);
    data = data.replace(reg, `$1'${base64map[id]}'`);
  }
  fs.writeFileSync('src/data.mock.ts', data);
  console.log('Done replacing logos with standard base64 URIs.');
}

run();
