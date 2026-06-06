const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const assets = [
  { svg: 'icon.svg',  png: 'icon.png',  width: 128,  height: 128  },
  { svg: 'cover.svg', png: 'cover.png', width: 1920, height: 1080 },
];

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });

  for (const { svg, png, width, height } of assets) {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 2 });

    const svgPath = path.resolve(__dirname, svg);
    const svgContent = fs.readFileSync(svgPath, 'utf8');

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${width}px; height: ${height}px; background: #0f0f10; overflow: hidden; }
  img { display: block; width: ${width}px; height: ${height}px; }
</style>
</head>
<body>
  <img src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}"/>
</body>
</html>`;

    await page.setContent(html, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 300)); // let filters paint

    const pngPath = path.resolve(__dirname, png);
    await page.screenshot({ path: pngPath, clip: { x: 0, y: 0, width, height } });
    await page.close();

    const kb = Math.round(fs.statSync(pngPath).size / 1024);
    console.log(`✓  ${png}  (${kb} KB)`);
  }

  await browser.close();
})();
