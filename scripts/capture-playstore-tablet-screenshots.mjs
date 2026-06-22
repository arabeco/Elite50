import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const root = 'C:\\Users\\Afonso\\Downloads\\elite-2050';
const outDir = path.join(root, 'playstore-screenshots', 'tablet');
const port = Number(process.env.PLAYSTORE_TABLET_SCREENSHOT_PORT || 9457);
const userDataDir = path.join(root, `.tmp-playstore-tablet-chrome-${port}`);
const baseUrl = process.env.PLAYSTORE_SCREENSHOT_URL || 'http://127.0.0.1:3000';
const width = Number(process.env.PLAYSTORE_TABLET_WIDTH || 1600);
const height = Number(process.env.PLAYSTORE_TABLET_HEIGHT || 2560);

await mkdir(outDir, { recursive: true });
await rm(userDataDir, { recursive: true, force: true });
await mkdir(userDataDir, { recursive: true });

const chrome = spawn(chromePath, [
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${userDataDir}`,
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--no-first-run',
  '--no-default-browser-check',
  `--window-size=${width},${height}`,
  'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
}

for (let i = 0; i < 40; i += 1) {
  try {
    await fetchJson(`http://127.0.0.1:${port}/json/version`);
    break;
  } catch {
    await sleep(250);
  }
}

const page = await fetchJson(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' }).catch(async () => {
  const pages = await fetchJson(`http://127.0.0.1:${port}/json/list`);
  return pages.find(item => item.type === 'page' && item.webSocketDebuggerUrl);
});
if (!page) throw new Error('No Chrome page target available');

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true });
  ws.addEventListener('error', reject, { once: true });
});

let seq = 0;
const pending = new Map();
ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  if (msg.method === 'Runtime.consoleAPICalled') {
    const args = msg.params?.args?.map(arg => arg.value || arg.description).join(' ');
    console.log(`console.${msg.params?.type}: ${args}`);
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    console.log(`exception: ${msg.params?.exceptionDetails?.text || ''} ${msg.params?.exceptionDetails?.exception?.description || ''}`);
  }
  if (!msg.id) return;
  const task = pending.get(msg.id);
  if (!task) return;
  pending.delete(msg.id);
  if (msg.error) task.reject(new Error(JSON.stringify(msg.error)));
  else task.resolve(msg.result);
});

function cdp(method, params = {}) {
  const id = ++seq;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(expression) {
  const result = await cdp('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Runtime exception');
  return result.result?.value;
}

async function waitForLoad() {
  const start = Date.now();
  while (Date.now() - start < 15000) {
    const ready = await evaluate(`document.readyState === 'complete' || document.readyState === 'interactive'`).catch(() => false);
    if (ready) break;
    await sleep(250);
  }
  await sleep(1600);
}

const normalize = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

async function waitForText(text, timeout = 15000) {
  const needle = normalize(text);
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const found = await evaluate(`document.body && document.body.innerText.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().includes(${JSON.stringify(needle)})`);
    if (found) return true;
    await sleep(300);
  }
  const bodyText = await evaluate(`document.body ? document.body.innerText.slice(0, 1200) : ''`).catch(() => '');
  const pageState = await evaluate(`JSON.stringify({ href: location.href, html: document.body ? document.body.innerHTML.slice(0, 800) : '' })`).catch(() => '{}');
  throw new Error(`Timed out waiting for text: ${text}\nCurrent body:\n${bodyText}\nState:\n${pageState}`);
}

async function waitForAnyText(texts, timeout = 15000) {
  const needles = texts.map(normalize);
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const found = await evaluate(`(() => {
      const body = document.body && document.body.innerText.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase();
      if (!body) return false;
      return ${JSON.stringify(needles)}.some(needle => body.includes(needle));
    })()`);
    if (found) return true;
    await sleep(300);
  }
  const bodyText = await evaluate(`document.body ? document.body.innerText.slice(0, 1200) : ''`).catch(() => '');
  const pageState = await evaluate(`JSON.stringify({ href: location.href, html: document.body ? document.body.innerHTML.slice(0, 800) : '' })`).catch(() => '{}');
  throw new Error(`Timed out waiting for texts: ${texts.join(', ')}\nCurrent body:\n${bodyText}\nState:\n${pageState}`);
}

async function clickText(text) {
  const needle = normalize(text);
  const ok = await evaluate(`(() => {
    const target = [...document.querySelectorAll('button, [role="button"], a')]
      .find(el => (el.innerText || el.textContent || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().includes(${JSON.stringify(needle)}));
    if (!target) return false;
    target.scrollIntoView({ block: 'center', inline: 'center' });
    target.click();
    return true;
  })()`);
  if (!ok) throw new Error(`Button/text not found: ${text}`);
  await sleep(700);
}

async function fillPlaceholder(placeholder, value) {
  const needle = normalize(placeholder);
  const ok = await evaluate(`(() => {
    const input = [...document.querySelectorAll('input, textarea')]
      .find(el => (el.placeholder || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().includes(${JSON.stringify(needle)}));
    if (!input) return false;
    input.focus();
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
      || Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
    setter.call(input, ${JSON.stringify(value)});
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
  if (!ok) throw new Error(`Input not found: ${placeholder}`);
  await sleep(300);
}

async function clickFirstPlayerCard() {
  const opened = await evaluate(`(() => {
    const visible = (el) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 60 && rect.height > 60 && rect.bottom > 0 && rect.top < window.innerHeight && style.display !== 'none' && style.visibility !== 'hidden';
    };
    const cards = [...document.querySelectorAll('[class*="cursor-pointer"], button')]
      .map(el => {
        const text = (el.innerText || el.textContent || '').trim();
        const ratingMatch = text.match(/\\b[4-9][0-9]{2}\\b/);
        const rating = ratingMatch ? Number(ratingMatch[0]) : 0;
        const hasRole = /\\b(GOL|DEF|MEI|ATA|ZAG)\\b/i.test(text);
        return { el, rating, hasRole };
      })
      .filter(item => visible(item.el) && item.rating > 0 && item.hasRole)
      .sort((a, b) => b.rating - a.rating);
    const card = cards[0]?.el;
    if (!card) return false;
    card.scrollIntoView({ block: 'center', inline: 'center' });
    card.click();
    return true;
  })()`);
  if (!opened) throw new Error('No player card found');
  await sleep(1200);
}

async function screenshot(name) {
  await evaluate(`(() => {
    document.documentElement.style.scrollbarWidth = 'none';
    document.body.style.scrollbarWidth = 'none';
    document.querySelectorAll('*').forEach(el => {
      el.style.msOverflowStyle = 'none';
    });
    const noisyText = [
      'MUNDO CRIADO',
      'CARREIRA INICIADA',
      'ASSUMIDO',
      'NAO FOI POSSIVEL CARREGAR PREMIUM',
      'NÃO FOI POSSÍVEL CARREGAR PREMIUM'
    ];
    document.querySelectorAll('div, section, button').forEach(el => {
      const text = (el.innerText || el.textContent || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toUpperCase();
      if (noisyText.some(noise => text.includes(noise.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toUpperCase()))) {
        const rect = el.getBoundingClientRect();
        if (rect.top > window.innerHeight * 0.55 || getComputedStyle(el).position === 'fixed') {
          el.style.display = 'none';
        }
      }
    });
    if ((document.body.innerText || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().includes('matriz de fusao')) {
      const modal = [...document.querySelectorAll('div')]
        .filter(el => {
          const text = (el.innerText || el.textContent || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase();
          const rect = el.getBoundingClientRect();
          return text.includes('matriz de fusao') && text.includes('rating atual') && rect.width > 300 && rect.height > 600;
        })
        .sort((a, b) => a.getBoundingClientRect().width - b.getBoundingClientRect().width)[0];
      if (modal && window.innerWidth >= 1400) {
        modal.style.transform = 'scale(1.35)';
        modal.style.transformOrigin = 'top center';
      }
    }
    window.scrollTo(0, 0);
  })()`);
  await sleep(500);
  const shot = await cdp('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: false,
  });
  const file = path.join(outDir, name);
  await writeFile(file, Buffer.from(shot.data, 'base64'));
  console.log(file);
}

try {
  await cdp('Page.enable');
  await cdp('Runtime.enable');
  await cdp('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: true,
    screenWidth: width,
    screenHeight: height,
  });
  await cdp('Emulation.setUserAgentOverride', {
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel Tablet) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36',
  });

  await cdp('Page.navigate', { url: `${baseUrl}/worlds?devAuth=1` });
  await waitForLoad();
  await evaluate(`localStorage.setItem('elite.sound', 'off');
    localStorage.setItem('elite.haptics', 'off');
    localStorage.setItem('elite.initialHelp', 'off');
    localStorage.setItem('elite.homeGuideHidden', 'true');
    localStorage.setItem('elite2050:onboarding:v1', 'true');
    true`);

  const needsDevLogin = await evaluate(`document.body && document.body.innerText.includes('Dev smoke')`);
  if (needsDevLogin) await clickText('Dev smoke');

  await waitForAnyText(['Multiverso Elite', 'Criar Novo Universo']);
  await clickText('Criar Novo Universo');
  await fillPlaceholder('NOME DO MUNDO', 'Elite 2050 Tablet');
  await clickText('Teste');
  await clickText('Confirmar');
  await waitForText('ELITE 2050');

  await clickText('Entrar');
  await waitForText('PRE-SEASON');
  await screenshot('tablet-01-central-do-dia.png');

  await clickText('Elenco');
  await waitForText('Elenco');
  await screenshot('tablet-02-elenco-clube.png');
  await clickFirstPlayerCard();
  await waitForText('Stats');
  await clickText('Stats');
  await waitForText('Matriz de fusao');
  await screenshot('tablet-03-player-matriz-fusao.png');
} finally {
  ws.close();
  chrome.kill();
}
