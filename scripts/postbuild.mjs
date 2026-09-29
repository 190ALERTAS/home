// Pós-build: cria uma cópia de index.html para cada rota (links diretos no GitHub Pages)
// e o 404.html (qualquer outro caminho abre o app, que decide o que mostrar).
import { copyFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROTAS_HTML } from './rotas.mjs';

const dist = join(import.meta.dirname, '..', 'dist');
const index = join(dist, 'index.html');
if (!existsSync(index)) throw new Error('dist/index.html não encontrado — rode "vite build" antes.');

for (const rota of ROTAS_HTML) {
  if (rota === 'index') continue; // index.html já existe
  copyFileSync(index, join(dist, `${rota}.html`));
}
copyFileSync(index, join(dist, '404.html'));
// O GitHub Pages não precisa processar nada com Jekyll.
writeFileSync(join(dist, '.nojekyll'), '');
console.log(`postbuild: ${ROTAS_HTML.length} rotas + 404.html geradas.`);
