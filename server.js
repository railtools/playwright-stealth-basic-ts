/* eslint-disable */
// @ts-nocheck
// Este arquivo é para deploy no Railway (Node.js), não faz parte do frontend React.
const express = require('express');
const { execSync, spawn } = require('child_process');
const cors = require('cors');
const crypto = require('crypto');
const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

chromium.use(StealthPlugin());

const app = express();
app.use(express.json());
app.use(cors());

const SECRET = process.env.SERVICE_SECRET;
const BASE_PORT_VNC = 5900;
const BASE_PORT_NOVNC = 6080;

const sessions = {};

function auth(req, res, next) {
  const key = req.headers['x-service-secret'];
  if (!SECRET || key !== SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

function getPorts(profileId) {
  const hash = parseInt(crypto.createHash('md5').update(profileId).digest('hex').slice(0, 4), 16);
  const display = 10 + (hash % 50);
  const vncPort = BASE_PORT_VNC + (hash % 50);
  const noVncPort = BASE_PORT_NOVNC + (hash % 50);
  return { display, vncPort, noVncPort };
}

function parseProxy(proxyRaw) {
  if (!proxyRaw) return null;
  const parts = proxyRaw.split(':');
  if (parts.length === 2) return { host: parts[0], port: parts[1], user: null, pass: null };
  if (parts.length === 4) return { host: parts[0], port: parts[1], user: parts[2], pass: parts[3] };
  return null;
}

// Start a browser session
app.post('/session/start', auth, async (req, res) => {
  const { profileId, proxyRaw, userAgent, timezone, language, canvasSeed, webglSeed, cookies } = req.body;
  if (!profileId) return res.status(400).json({ error: 'profileId required' });

  // Kill existing session
  if (sessions[profileId]) {
    try { killSession(profileId); } catch (e) {}
    await new Promise(r => setTimeout(r, 500));
  }

  const { display, vncPort, noVncPort } = getPorts(profileId);
  const proxy = parseProxy(proxyRaw);

  // Start Xvfb
  const xvfbProcess = spawn('Xvfb', [`:${display}`, '-screen', '0', '1280x720x24'], {
    detached: false, stdio: 'ignore'
  });

  await new Promise(r => setTimeout(r, 800));

  try {
    const env = { ...process.env, DISPLAY: `:${display}`, TZ: timezone || 'America/Sao_Paulo' };

    // Launch browser with playwright-extra + stealth
    const launchOptions = {
      headless: false,
      executablePath: '/usr/bin/chromium-browser',
      env,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        `--lang=${language || 'pt-BR'}`,
        '--window-size=1280,720',
        '--start-maximized',
      ],
    };

    if (proxy) {
      launchOptions.args.push(`--proxy-server=http://${proxy.host}:${proxy.port}`);
    }

    const browser = await chromium.launch(launchOptions);

    const contextOptions = {
      viewport: { width: 1280, height: 720 },
      userAgent: userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: language || 'pt-BR',
      timezoneId: timezone || 'America/Sao_Paulo',
    };

    if (proxy && proxy.user && proxy.pass) {
      contextOptions.httpCredentials = { username: proxy.user, password: proxy.pass };
    }

    const context = await browser.newContext(contextOptions);

    // Inject cookies if provided
    if (cookies) {
      try {
        const decoded = Buffer.from(cookies, 'base64').toString('utf-8');
        const cookieList = JSON.parse(decoded);
        await context.addCookies(cookieList);
      } catch (e) {
        console.error('Cookie injection failed:', e.message);
      }
    }

    const page = await context.newPage();
    await page.goto('about:blank');

    // Start x11vnc
    const vncProcess = spawn('x11vnc', [
      '-display', `:${display}`,
      '-forever', '-shared',
      '-rfbport', String(vncPort),
      '-nopw', '-quiet'
    ], { detached: false, stdio: 'ignore' });

    await new Promise(r => setTimeout(r, 1000));

    // Start noVNC websockify
    const noVncProcess = spawn('websockify', [
      '--web', '/usr/share/novnc/',
      String(noVncPort),
      `localhost:${vncPort}`
    ], { detached: false, stdio: 'ignore' });

    sessions[profileId] = {
      display, vncPort, noVncPort,
      browser, context, page,
      xvfbProcess, vncProcess, noVncProcess,
      startedAt: new Date().toISOString()
    };

    const proto = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host || 'localhost';
    const noVncUrl = `${proto}://${host}/novnc/${profileId}/vnc.html?autoconnect=true&resize=scale`;

    res.json({ success: true, profileId, noVncUrl });

  } catch (error) {
    try { xvfbProcess.kill(); } catch (e) {}
    res.status(500).json({ success: false, error: error.message });
  }
});

// Stop a browser session
app.post('/session/stop', auth, async (req, res) => {
  const { profileId } = req.body;
  if (!profileId) return res.status(400).json({ error: 'profileId required' });
  killSession(profileId);
  res.json({ success: true });
});

// Status
app.get('/session/:profileId', auth, (req, res) => {
  const session = sessions[req.params.profileId];
  if (!session) return res.json({ active: false });
  res.json({ active: true, profileId: req.params.profileId, startedAt: session.startedAt });
});

// noVNC reverse proxy
app.use('/novnc/:profileId', (req, res) => {
  const session = sessions[req.params.profileId];
  if (!session) return res.status(404).send('Session not found');
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const hostname = (req.headers.host || 'localhost').split(':')[0];
  res.redirect(`${proto}://${hostname}:${session.noVncPort}/vnc.html?autoconnect=true&resize=scale`);
});

function killSession(profileId) {
  const s = sessions[profileId];
  if (!s) return;
  try { s.browser?.close(); } catch (e) {}
  try { s.noVncProcess?.kill('SIGKILL'); } catch (e) {}
  try { s.vncProcess?.kill('SIGKILL'); } catch (e) {}
  try { s.xvfbProcess?.kill('SIGKILL'); } catch (e) {}
  try { execSync(`pkill -f "Xvfb :${s.display}"`, { stdio: 'ignore' }); } catch (e) {}
  delete sessions[profileId];
}

app.get('/health', (req, res) => res.json({ ok: true, sessions: Object.keys(sessions).length }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`ProfileVault Browser Server on port ${PORT}`));
