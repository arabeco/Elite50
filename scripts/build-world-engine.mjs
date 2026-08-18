#!/usr/bin/env node
/**
 * Gera supabase/functions/world-clock-runner/engine.mjs a partir do motor em TypeScript.
 *
 * POR QUE ISSO EXISTE
 *
 * A Edge Function `world-clock-runner` roda em Deno, no servidor do Supabase, e precisa
 * do MESMO motor de jogo que o app usa no navegador. Deno nao le os .ts espalhados em
 * src/engine com imports relativos do projeto Vite, entao o motor e "empacotado": todos
 * os arquivos viram um unico engine.mjs autocontido.
 *
 * Esse arquivo foi gerado uma vez e, dai em diante, editado a mao. Resultado: duas copias
 * do motor que podem divergir em silencio — uma corrige um bug, a outra nao, e o mundo
 * passa a andar diferente no servidor e no cliente. Este script existe para que a copia
 * do servidor SEMPRE seja derivada da fonte, nunca escrita a mao.
 *
 * COMO USAR
 *
 *   npm run build:engine
 *
 * Rode isso depois de qualquer mudanca em src/engine, e comite o engine.mjs junto.
 * Para so conferir se esta desatualizado (util em CI, nao escreve nada):
 *
 *   npm run build:engine -- --check
 */
import { build } from 'esbuild';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const entry = resolve(root, 'scripts/world-engine.entry.ts');
const outFile = resolve(root, 'supabase/functions/world-clock-runner/engine.mjs');
const checkOnly = process.argv.includes('--check');

const banner = `// GERADO POR scripts/build-world-engine.mjs — NAO EDITE A MAO.
// Fonte: src/engine/*. Depois de mexer no motor, rode: npm run build:engine
`;

const result = await build({
  entryPoints: [entry],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  write: false,
  banner: { js: banner },
  // O motor e puro: nao deve arrastar React, Supabase nem nada de browser.
  // Se algum import desses aparecer, o build falha aqui em vez de quebrar em producao.
  external: [],
});

const generated = result.outputFiles[0].text;

if (checkOnly) {
  if (!existsSync(outFile)) {
    console.error('engine.mjs nao existe. Rode: npm run build:engine');
    process.exit(1);
  }
  const atual = readFileSync(outFile, 'utf8');
  if (atual !== generated) {
    console.error('engine.mjs esta DESATUALIZADO em relacao a src/engine.');
    console.error('Rode: npm run build:engine');
    process.exit(1);
  }
  console.log('engine.mjs esta em dia com src/engine.');
  process.exit(0);
}

writeFileSync(outFile, generated);
const kb = (Buffer.byteLength(generated, 'utf8') / 1024).toFixed(1);
console.log(`engine.mjs gerado a partir de src/engine (${kb} KB).`);
