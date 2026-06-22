import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const root = 'C:\\Users\\Afonso\\Downloads\\elite-2050';
const outDir = process.env.PLAYSTORE_SCREENSHOT_OUTDIR
  ? path.resolve(process.env.PLAYSTORE_SCREENSHOT_OUTDIR)
  : path.join(root, 'playstore-screenshots');
const port = Number(process.env.PLAYSTORE_SCREENSHOT_PORT || 9447);
const userDataDir = path.join(root, `.tmp-playstore-chrome-${port}`);
const baseUrl = process.env.PLAYSTORE_SCREENSHOT_URL || 'http://127.0.0.1:3000';
const width = Number(process.env.PLAYSTORE_SCREENSHOT_WIDTH || 720);
const height = Number(process.env.PLAYSTORE_SCREENSHOT_HEIGHT || 1280);

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

async function waitForLoad() {
  await cdp('Page.enable');
  await cdp('Runtime.enable');
  await cdp('Log.enable');
  const start = Date.now();
  while (Date.now() - start < 15000) {
    const ready = await evaluate(`document.readyState === 'complete' || document.readyState === 'interactive'`).catch(() => false);
    const hasBody = await evaluate(`!!document.body`).catch(() => false);
    if (ready && hasBody) break;
    await sleep(250);
  }
  await sleep(1800);
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

async function waitForText(text, timeout = 12000) {
  const needle = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const found = await evaluate(`document.body && document.body.innerText.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().includes(${JSON.stringify(needle)})`);
    if (found) return true;
    await sleep(300);
  }
  const bodyText = await evaluate(`document.body ? document.body.innerText.slice(0, 1200) : ''`).catch(() => '');
  throw new Error(`Timed out waiting for text: ${text}\nCurrent body:\n${bodyText}`);
}

async function clickText(text) {
  const ok = await evaluate(`(() => {
    const target = [...document.querySelectorAll('button, [role="button"], a')]
      .find(el => (el.innerText || el.textContent || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().includes(${JSON.stringify(text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase())}));
    if (!target) return false;
    target.scrollIntoView({ block: 'center', inline: 'center' });
    target.click();
    return true;
  })()`);
  if (!ok) throw new Error(`Button/text not found: ${text}`);
  await sleep(700);
}

async function clickSelector(selector) {
  const ok = await evaluate(`(() => {
    const target = document.querySelector(${JSON.stringify(selector)});
    if (!target) return false;
    target.scrollIntoView({ block: 'center', inline: 'center' });
    target.click();
    return true;
  })()`);
  if (!ok) throw new Error(`Selector not found: ${selector}`);
  await sleep(700);
}

async function fillPlaceholder(placeholder, value) {
  const ok = await evaluate(`(() => {
    const visible = (el) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 20 && rect.height > 16 && style.display !== 'none' && style.visibility !== 'hidden';
    };
    const input = [...document.querySelectorAll('input, textarea')]
      .find(el => (el.placeholder || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().includes(${JSON.stringify(placeholder.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase())}))
      || [...document.querySelectorAll('input, textarea')].find(visible);
    if (!input) return false;
    input.focus();
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
      || Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
    setter.call(input, ${JSON.stringify(value)});
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
  if (!ok) {
    const debug = await evaluate(`JSON.stringify({
      href: location.href,
      body: document.body ? document.body.innerText.slice(0, 1600) : '',
      inputs: [...document.querySelectorAll('input, textarea')].map(el => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return {
          placeholder: el.placeholder || '',
          value: el.value || '',
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          top: Math.round(rect.top),
          display: style.display,
          visibility: style.visibility
        };
      }),
      actions: [...document.querySelectorAll('button, [role="button"], a')]
        .slice(0, 60)
        .map(el => (el.innerText || el.textContent || '').trim())
        .filter(Boolean)
    }, null, 2)`);
    throw new Error(`Input not found: ${placeholder}\n${debug}`);
  }
  await sleep(300);
}

async function clickAt(x, y) {
  await cdp('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y, radiusX: 2, radiusY: 2, force: 1 }],
  }).catch(() => undefined);
  await cdp('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  }).catch(() => undefined);
  await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  await sleep(700);
}

async function clickFirstPlayerCard() {
  const opened = await evaluate(`(() => {
    const visible = (el) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 40 && rect.height > 40 && rect.bottom > 0 && rect.top < window.innerHeight && style.display !== 'none' && style.visibility !== 'hidden';
    };
    const cards = [...document.querySelectorAll('[class*="cursor-pointer"], button')]
      .map(el => {
        const text = (el.innerText || el.textContent || '').trim();
        const ratingMatch = text.match(/\\b[4-9][0-9]{2}\\b/);
        const rating = ratingMatch ? Number(ratingMatch[0]) : 0;
        const hasRating = rating > 0;
        const hasRole = /\\b(GOL|ZAG|MEI|ATA|DEFENSOR)\\b/i.test(text);
        const nameNode = el.querySelector('h3') || el.querySelector('span');
        return { el, text, name: nameNode?.innerText || nameNode?.textContent || text.slice(0, 32), rating, hasRating, hasRole };
      })
      .filter(item => visible(item.el) && item.hasRating && item.hasRole)
      .sort((a, b) => {
        if (a.rating !== b.rating) return b.rating - a.rating;
        const ar = a.el.getBoundingClientRect();
        const br = b.el.getBoundingClientRect();
        return ar.top - br.top || ar.left - br.left;
      });
    const cardItem = cards[0];
    const textNode = cardItem?.el;
    if (!textNode) return null;
    const card = textNode.closest('[class*="aspect-"]') || textNode.closest('[class*="cursor-pointer"]') || textNode;
    card.scrollIntoView({ block: 'center', inline: 'center' });
    const propsKey = Object.keys(card).find(key => key.startsWith('__reactProps'));
    if (propsKey && typeof card[propsKey]?.onClick === 'function') {
      card[propsKey].onClick({ stopPropagation() {}, preventDefault() {} });
      return { opened: true, text: cardItem.name };
    }
    const rect = card.getBoundingClientRect();
    return { opened: false, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, text: cardItem.name };
  })()`);
  if (!opened) throw new Error('No player card found to open modal');
  console.log(`Opening player card (${opened.text})`);
  if (!opened.opened) {
    await clickAt(opened.x, opened.y);
  }
  await sleep(1000);
}

async function scrollTextIntoView(text) {
  const ok = await evaluate(`(() => {
    const needle = ${JSON.stringify(text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase())};
    const target = [...document.querySelectorAll('p, h1, h2, h3, span')]
      .find(el => (el.innerText || el.textContent || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().trim() === needle)
      || [...document.querySelectorAll('p, h1, h2, h3, span')]
        .find(el => (el.innerText || el.textContent || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().includes(needle));
    if (!target) return false;
    target.scrollIntoView({ block: 'start', inline: 'center' });
    return true;
  })()`);
  if (!ok) throw new Error(`Could not scroll text into view: ${text}`);
  await sleep(700);
}

async function scrollLargestPanel(amount) {
  await evaluate(`(() => {
    const explicitPanel = document.querySelector('.slim-scrollbar, [class*="overflow-y-auto"]');
    if (explicitPanel && explicitPanel.scrollHeight > explicitPanel.clientHeight) {
      explicitPanel.scrollTop = ${Number(amount)};
      return true;
    }
    const scrollers = [...document.querySelectorAll('div, section, main')]
      .filter(el => el.scrollHeight > el.clientHeight + 80)
      .sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight));
    const panel = scrollers[0];
    if (panel) panel.scrollTop = ${Number(amount)};
    return !!panel;
  })()`);
  await sleep(700);
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
      document.querySelectorAll('nav, div').forEach(el => {
        const text = (el.innerText || el.textContent || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toUpperCase();
        const rect = el.getBoundingClientRect();
        if (text.includes('HOME') && text.includes('ELENCO') && text.includes('MUNDO') && rect.top > window.innerHeight * 0.65) {
          el.style.display = 'none';
        }
      });
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
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36',
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
  if (needsDevLogin) {
    await clickText('Dev smoke');
  }
  await waitForText('Multiverso Elite');
  await clickText('Criar Novo Universo');
  await fillPlaceholder('NOME DO MUNDO', 'Elite 2050');
  await clickText('Teste');
  await clickText('Confirmar');
  await waitForText('ELITE 2050');
  await screenshot('01-origem-carreira.png');

  await clickText('Entrar').catch(async () => clickAt(Math.max(80, width - 130), Math.round(height * 0.29)));
  await waitForText('PRE-SEASON');
  await screenshot('02-central-do-dia.png');

  await clickText('Elenco');
  await waitForText('Elenco');
  await screenshot('03-elenco-clube.png');

  await clickFirstPlayerCard();
  await waitForText('Stats');
  await clickText('Stats');
  await waitForText('Matriz de fusao');
  await screenshot('04-player-matriz-fusao.png');
  await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }).catch(() => undefined);
  await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }).catch(() => undefined);
  await clickAt(Math.min(width - 40, 680), 44).catch(() => undefined);
  await sleep(800);

  await clickSelector('[data-testid="main-tab-world"]').catch(async () => clickText('Mundo')).catch(async () => clickAt(Math.round(width * 0.68), Math.round(height * 0.94)));
  await waitForText('Mundo');
  try {
    await clickText('Ranking');
    await sleep(1000);
    await screenshot('05-ranking-elite50.png');
  } catch {
    await screenshot('05-ranking-elite50.png');
  }

  await clickSelector('[data-testid="main-tab-career"]').catch(async () => clickText('Carreira')).catch(async () => clickAt(Math.round(width * 0.85), Math.round(height * 0.94)));
  await sleep(1000);
  try {
    await clickText('Circuito');
    await waitForText('Passe do Circuito');
  } catch {}
  await sleep(1000);
  await screenshot('06-passe-circuito.png');
} finally {
  ws.close();
  chrome.kill();
}
