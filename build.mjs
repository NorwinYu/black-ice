import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ORDER = [
  '01-core.js', '02-geom.js', '03-props.js', '04-shaders.js', '05-render.js',
  '05b-viewmodel.js', '06-world.js', '07-fx.js', '08-enemies.js', '09-game.js', '10-ui.js'
];
const js = ORDER.map(f => `\n/* ===== ${f} ===== */\n` + readFileSync(join(HERE, 'src', f), 'utf8')).join('\n');
const shell = readFileSync(join(HERE, 'src', 'shell.html'), 'utf8');
const out = shell.split('/*__APP__*/').join(js);
writeFileSync(join(HERE, 'game.html'), out);
console.log('built game.html', (out.length / 1024).toFixed(0) + ' KB');
