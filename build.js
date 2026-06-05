const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const isWatch = process.argv.includes('--watch');

async function buildOnce() {
  if (!fs.existsSync('dist')) fs.mkdirSync('dist');

  await esbuild.build({
    entryPoints: ['src/plugin/code.ts'],
    bundle: true,
    outfile: 'dist/code.js',
    platform: 'browser',
    target: 'es6',
  });

  await esbuild.build({
    entryPoints: ['src/ui/index.ts'],
    bundle: true,
    outfile: 'dist/_ui-bundle.js',
    platform: 'browser',
    target: 'es6',
  });

  const html = fs.readFileSync('src/ui/index.html', 'utf8');
  const css = fs.readFileSync('src/ui/styles.css', 'utf8');
  const js = fs.readFileSync('dist/_ui-bundle.js', 'utf8');
  fs.unlinkSync('dist/_ui-bundle.js');

  const final = html
    .replace('<!-- inject:css -->', `<style>\n${css}\n</style>`)
    .replace('<!-- inject:js -->', `<script>\n${js}\n</script>`);

  fs.writeFileSync('dist/ui.html', final);
  console.log('[build] done');
}

if (isWatch) {
  console.log('[watch] watching for changes...');
  const chokidar = require('chokidar');
  buildOnce().catch(console.error);
  chokidar.watch('src').on('change', () => {
    buildOnce().catch(console.error);
  });
} else {
  buildOnce().catch((e) => { console.error(e); process.exit(1); });
}
