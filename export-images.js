const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const os = require('os');

const assets = [
  { svg: 'icon.svg',  png: 'icon.png',  width: 128,  height: 128  },
  { svg: 'cover.svg', png: 'cover.png', width: 1920, height: 1080 },
];

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });

  for (const { svg, png, width, height } of assets) {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 2 });

    const svgContent = fs.readFileSync(path.resolve(__dirname, svg), 'utf8');

    // Write a temp HTML file so the browser loads it via file:// — avoids
    // data-URL size limits and SVG rendering quirks inside <img> tags.
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; }
  html, body {
    width: ${width}px;
    height: ${height}px;
    overflow: hidden;
    background: #0a0a0c;
  }
  svg {
    display: block;
    width: ${width}px;
    height: ${height}px;
  }
</style>
</head>
<body>
${svgContent}
</body>
</html>`;

    const tmpFile = path.join(os.tmpdir(), `ve-export-${Date.now()}.html`);
    fs.writeFileSync(tmpFile, html);

    await page.goto(`file://${tmpFile}`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 500));

    const pngPath = path.resolve(__dirname, png);
    await page.screenshot({
      path: pngPath,
      clip: { x: 0, y: 0, width, height },
    });

    fs.unlinkSync(tmpFile);
    await page.close();

    const kb = Math.round(fs.statSync(pngPath).size / 1024);
    console.log(`✓  ${png}  (${width}x${height}, ${kb} KB)`);
  }

  await browser.close();
})();
