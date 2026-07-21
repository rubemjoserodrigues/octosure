const { app, BrowserWindow, BrowserView, ipcMain, screen, clipboard, shell } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const appPackage = require('./package.json');

let autoUpdater = null;
try {
  ({ autoUpdater } = require('electron-updater'));
} catch (_) {
  autoUpdater = null;
}

const OCTOSURE_APP_ID = String(
  process.env.OCTOSURE_APP_ID
  || (appPackage && appPackage.build && appPackage.build.appId)
  || 'net.octosure.desktop'
).trim();
const OCTOSURE_UPDATE_FEED_URL = String(process.env.OCTOSURE_UPDATE_URL || '').trim().replace(/\/+$/, '');
const OCTOSURE_UPDATE_INTERVAL_MS = Math.max(
  120000,
  Number.parseInt(process.env.OCTOSURE_UPDATE_INTERVAL_MS || '900000', 10) || 900000
);
const OCTOSURE_ALLOW_DEV_UPDATES = ['1', 'true', 'yes', 'on']
  .includes(String(process.env.OCTOSURE_UPDATE_DEV || '0').trim().toLowerCase());

const APP_ICON_ICO = path.join(__dirname, 'src', 'assets', 'iconeapp.ico');
const APP_ICON_PNG = path.join(__dirname, 'src', 'assets', 'iconeapp.png');
const APP_WINDOW_ICON = (() => {
  if (process.platform === 'win32' && fs.existsSync(APP_ICON_ICO)) return APP_ICON_ICO;
  if (fs.existsSync(APP_ICON_PNG)) return APP_ICON_PNG;
  return undefined;
})();

let mainWindow;
let socketToken = null;
let socketUrl = null;
let updateCheckTimer = null;
let updatesEnabled = false;
let updateCheckInFlight = false;
const updateState = {
  status: 'idle',
  enabled: false,
  updateAvailable: false,
  updateDownloaded: false,
  version: '',
  releaseDate: '',
  releaseName: '',
  notes: '',
  provider: OCTOSURE_UPDATE_FEED_URL || '',
  checkedAt: 0,
  error: '',
};

function getDefaultSocketUrl() {
  return app.isPackaged ? 'https://octosure.net' : 'http://127.0.0.1:3005';
}

const detachedBetWindows = {
  bet1: null,
  bet2: null,
};

const detachedBetViews = {
  bet1: null,
  bet2: null,
};

const detachedToolbarHeights = {
  bet1: 94,
  bet2: 94,
};

const detachedWindowPayload = {
  bet1: null,
  bet2: null,
};

const DETACHED_SESSION_PARTITION = String(process.env.DETACHED_SESSION_PARTITION || 'persist:octosure-detached')
  .trim();
const DETACHED_ACCEPT_LANGUAGE = String(
  process.env.DETACHED_ACCEPT_LANGUAGE || 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
).trim();
const DETACHED_EXTERNAL_FALLBACK_ENABLED = !['0', 'false', 'no', 'off']
  .includes(String(process.env.DETACHED_EXTERNAL_FALLBACK || '1').trim().toLowerCase());
const DETACHED_EXTERNAL_FALLBACK_DELAY_MS = Math.max(
  4000,
  Number.parseInt(process.env.DETACHED_EXTERNAL_FALLBACK_DELAY_MS || '15000', 10) || 15000
);
const DETACHED_EXTERNAL_ALWAYS = ['1', 'true', 'yes', 'on']
  .includes(String(process.env.DETACHED_EXTERNAL_ALWAYS || '0').trim().toLowerCase());
const DETACHED_EXTERNAL_FORCE_DOMAINS = String(process.env.DETACHED_EXTERNAL_FORCE_DOMAINS || '')
  .split(',')
  .map((v) => v.trim().toLowerCase())
  .filter(Boolean);
const DETACHED_EXTERNAL_BROWSER = String(
  process.env.DETACHED_EXTERNAL_BROWSER || 'chrome-managed'
).trim().toLowerCase();
const KEEP_DASHBOARD_ON_TOP = ['1', 'true', 'yes', 'on']
  .includes(
    String(
      process.env.DETACHED_KEEP_DASHBOARD_ON_TOP
      || '0'
    ).trim().toLowerCase()
  );
const DETACHED_SIDEBAR_MODE = !['0', 'false', 'no', 'off']
  .includes(String(process.env.DETACHED_SIDEBAR_MODE || '1').trim().toLowerCase());
const DETACHED_SIDEBAR_WIDTH = Math.max(
  300,
  Math.min(
    520,
    Number.parseInt(process.env.DETACHED_SIDEBAR_WIDTH || '360', 10) || 360
  )
);
const DETACHED_MIN_BROWSER_WIDTH = Math.max(
  920,
  Number.parseInt(process.env.DETACHED_MIN_BROWSER_WIDTH || '920', 10) || 920
);
const DETACHED_FORCE_ISOLATED_BROWSER = !['0', 'false', 'no', 'off']
  .includes(String(process.env.DETACHED_FORCE_ISOLATED_BROWSER || '1').trim().toLowerCase());
const DETACHED_PERSIST_BROWSER_PROFILE = !['0', 'false', 'no', 'off']
  .includes(String(process.env.DETACHED_PERSIST_BROWSER_PROFILE || '1').trim().toLowerCase());
const DETACHED_SHARED_BROWSER_PROFILE = !['0', 'false', 'no', 'off']
  .includes(String(process.env.DETACHED_SHARED_BROWSER_PROFILE || '1').trim().toLowerCase());
const DETACHED_MANAGED_CHROME_ZOOM = (() => {
  const raw = String(
    process.env.DETACHED_MANAGED_CHROME_ZOOM
    || process.env.DETACHED_BROWSER_ZOOM
    || '0.8'
  ).trim().replace(',', '.');
  let value = Number.parseFloat(raw);
  if (!Number.isFinite(value) || value <= 0) value = 1;
  if (value > 10) value /= 100;
  return Math.max(0.3, Math.min(2, value));
})();
const DETACHED_MANAGED_CHROME_ZOOM_ENABLED = Math.abs(DETACHED_MANAGED_CHROME_ZOOM - 1) > 0.001;

let detachedSessionHardened = false;
const pendingDetachedFallbackTimers = {
  bet1: null,
  bet2: null,
};
const managedBrowserExecutableCache = {
  chrome: '',
  edge: '',
  firefox: '',
};
const managedBrowserExecutableResolved = {
  chrome: false,
  edge: false,
  firefox: false,
};
const managedProfileRunTag = `${Date.now()}-${process.pid}`;

const dynamicDebugPortBase = 30000 + Math.floor(Math.random() * 20000);

function pickDynamicDebugPort(defaultValue, offset = 0) {
  const explicit = Number.parseInt(String(defaultValue || ''), 10);
  if (Number.isFinite(explicit) && explicit > 1024 && explicit < 65535) return explicit;
  const value = dynamicDebugPortBase + offset;
  return Math.max(1025, Math.min(65000, value));
}

const managedChromePorts = {
  bet1: pickDynamicDebugPort(process.env.DETACHED_CHROME_PORT_BET1, 1),
  bet2: pickDynamicDebugPort(process.env.DETACHED_CHROME_PORT_BET2, 2),
};
const managedEdgePorts = {
  bet1: pickDynamicDebugPort(process.env.DETACHED_EDGE_PORT_BET1, 11),
  bet2: pickDynamicDebugPort(process.env.DETACHED_EDGE_PORT_BET2, 12),
};
const managedChromeState = {
  bet1: { process: null, profileDir: '', lastUrl: '', targetId: '', cdpBusy: false, browserKind: '' },
  bet2: { process: null, profileDir: '', lastUrl: '', targetId: '', cdpBusy: false, browserKind: '' },
};
const BETANO_ODDS_SYNC_INTERVAL_MS = Math.max(
  450,
  Number.parseInt(process.env.BETANO_ODDS_SYNC_INTERVAL_MS || '850', 10) || 850
);
let betanoOddsSyncTimer = null;
let betanoOddsSyncRunning = false;
const betanoOddsSyncState = {
  bet1: { odd: '', href: '', ts: 0 },
  bet2: { odd: '', href: '', ts: 0 },
};
const betanoEventMismatchState = {
  bet1: { count: 0, lastTs: 0, expectedEventId: '', observedEventId: '', lastNavigateTs: 0 },
  bet2: { count: 0, lastTs: 0, expectedEventId: '', observedEventId: '', lastNavigateTs: 0 },
};
const betanoSyncDiagState = {
  bet1: {},
  bet2: {},
};

function logBetanoSyncDiag(sideKey, reason, data = {}, minIntervalMs = 4000) {
  const side = sideKey === 'bet2' ? 'bet2' : 'bet1';
  const bySide = betanoSyncDiagState[side] || {};
  const now = Date.now();
  const prev = Number(bySide[reason] || 0);
  if ((now - prev) < Math.max(500, Number(minIntervalMs) || 4000)) return;
  bySide[reason] = now;
  betanoSyncDiagState[side] = bySide;
  logger.write('info', 'BETANO_SYNC', reason, {
    side,
    ...(data && typeof data === 'object' ? data : {}),
  });
}
let sidebarMainWindowApplied = false;
let sidebarMainWindowBackup = null;

function keepDashboardAboveBrowsers() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try {
    if (KEEP_DASHBOARD_ON_TOP) {
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
      mainWindow.moveTop();
    } else {
      mainWindow.setAlwaysOnTop(false);
    }
  } catch (_) {}
}

function buildChromeLikeUserAgent() {
  const override = String(process.env.DETACHED_USER_AGENT || '').trim();
  if (override) return override;

  let platform = 'Windows NT 10.0; Win64; x64';
  if (process.platform === 'darwin') platform = 'Macintosh; Intel Mac OS X 10_15_7';
  if (process.platform === 'linux') platform = 'X11; Linux x86_64';

  return `Mozilla/5.0 (${platform}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36`;
}

const DETACHED_USER_AGENT = buildChromeLikeUserAgent();
const DETACHED_STEALTH_SCRIPT = `
(() => {
  try {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined, configurable: true });
  } catch (_) {}
  try {
    if (!window.chrome) window.chrome = { runtime: {} };
  } catch (_) {}
  try {
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3], configurable: true });
  } catch (_) {}
})();
`;

const BETANO_ODDS_WATCH_SCRIPT = `
(() => {
  const root = window;
  const state = root.__octosureBetanoOddSync || (root.__octosureBetanoOddSync = {
    installed: false,
    lastOdd: '',
    lastTs: 0,
    lastSource: '',
    lockedByUser: false,
    lockedAt: 0,
    lockLineToken: '',
    lockContextToken: '',
    selectionNode: null,
    oddNode: null,
    nodeObserver: null,
    scanTimer: null,
  });

  const INTERACTIVE_SELECTOR = [
    'button',
    '[role="button"]',
    'a',
    '[data-odd]',
    '[data-odds]',
    '[data-price]',
    '[data-selection-price]',
    '[data-testid*="odd"]',
    '[data-testid*="selection"]',
    '[data-qa*="odd"]',
    '[data-qa*="selection"]',
    '[class*="odd"]',
    '[class*="price"]',
    '[class*="selection"]',
    '[class*="outcome"]',
    '[class*="option"]',
    '[class*="pick"]',
  ].join(',');

  const ODD_HINT_SELECTOR = [
    '[data-odd]',
    '[data-odds]',
    '[data-price]',
    '[data-selection-price]',
    '[data-value]',
    '[data-testid*="odd"]',
    '[data-qa*="odd"]',
    '[class*="odd"]',
    '[class*="price"]',
    '[class*="coef"]',
    '[class*="quota"]',
    '[class*="cotacao"]',
  ].join(',');

  const SELECTED_SELECTOR = [
    '[aria-pressed="true"]',
    '[aria-selected="true"]',
    '[class*="selected"]',
    '[class*="is-selected"]',
    '[class*="active"]',
    '[class*="picked"]',
  ].join(',');

  const BETSLIP_ROOT_SELECTOR = [
    '[class*="betslip"]',
    '[class*="bet-slip"]',
    '[class*="coupon"]',
    '[class*="cupom"]',
    '[class*="ticket"]',
    '[id*="betslip"]',
    '[id*="bet-slip"]',
    '[id*="coupon"]',
    '#betslip',
    '#bet-slip',
    '#bt-betslip',
    '#betslip-container',
    '.betfair-betslip',
    '[data-testid*="betslip"]',
    '[data-testid*="coupon"]',
    '[data-qa*="betslip"]',
    '[data-qa*="coupon"]',
  ].join(',');

  const isBetfairExchangePage = () => {
    try {
      const host = String(location && location.hostname ? location.hostname : '').toLowerCase();
      if (!host.includes('betfair.bet.br')) return false;
      const pathHash = (String(location && location.pathname ? location.pathname : '') + String(location && location.hash ? location.hash : '')).toLowerCase();
      if (!pathHash.includes('/exchange/plus/')) return false;
      return /\/market\/[0-9]+(?:\.[0-9]+)?/i.test(pathHash);
    } catch (_) {
      return false;
    }
  };

  const isBtPathFamilyPage = () => {
    try {
      const host = String(location && location.hostname ? location.hostname : '').toLowerCase();
      const isTargetHost = host.includes('apostaganha.bet.br') || host.includes('blaze.bet.br');
      if (!isTargetHost) return false;
      const search = String(location && location.search ? location.search : '');
      return /[?&]bt-path=/.test(search) || /[?&]bt_path=/.test(search);
    } catch (_) {
      return false;
    }
  };

  const isBet7kCms1Page = () => {
    try {
      const host = String(location && location.hostname ? location.hostname : '').toLowerCase();
      return (
        host.includes('7k.bet.br')
        || host.includes('betvip.bet.br')
        || host.includes('brx.bet.br')
        || host.includes('brxbet.bet.br')
        || host.includes('cassino.bet.br')
        || host.includes('donald.bet.br')
        || host.includes('rico.bet.br')
        || host.includes('ricobet.bet.br')
        || host.includes('bra.bet.br')
        || host.includes('mmabet.bet.br')
        || host.includes('play.bet.br')
        || host.includes('betfalcons.bet.br')
        || host.includes('betgorillas.bet.br')
        || host.includes('b1bet.bet.br')
        || host.includes('betpontobet.bet.br')
        || host.includes('geralbet.bet.br')
        || host.includes('lider.bet.br')
      );
    } catch (_) {
      return false;
    }
  };

  const normalize = (n) => Number(n).toFixed(3).replace(/\\.?0+$/, '');

  const parseCandidates = (raw) => {
    const txt = String(raw || '').replace(/\\s+/g, ' ').trim();
    if (!txt) return [];
    const rx = /[+-]?\\d{1,4}(?:[.,]\\d{1,3})?/g;
    const out = [];
    let m;
    while ((m = rx.exec(txt)) !== null) {
      const token = String(m[0] || '');
      const cleanToken = token.replace(/^[+-]/, '');
      const value = Number.parseFloat(token.replace(',', '.'));
      if (!Number.isFinite(value)) continue;
      if (value < 1.01 || value > 1000) continue;
      const dot = cleanToken.includes('.') ? cleanToken.split('.')[1] : (cleanToken.includes(',') ? cleanToken.split(',')[1] : '');
      const isSigned = /^[+-]/.test(token);
      let j = (m.index || 0) - 1;
      while (j >= 0 && txt[j] === ' ') j -= 1;
      const prev = j >= 0 ? txt[j] : '';
      const signNearby = prev === '+' || prev === '-';
      out.push({
        token,
        cleanToken,
        value,
        hasDecimal: cleanToken.includes('.') || cleanToken.includes(','),
        decimals: dot ? dot.length : 0,
        index: m.index || 0,
        signed: isSigned || signNearby,
      });
    }
    return out;
  };

  const classBlob = (el) => {
    if (!el || el.nodeType !== 1) return '';
    return [
      el.className || '',
      el.id || '',
      el.getAttribute ? (el.getAttribute('data-testid') || '') : '',
      el.getAttribute ? (el.getAttribute('data-qa') || '') : '',
      el.getAttribute ? (el.getAttribute('role') || '') : '',
      el.tagName || '',
    ].join(' ').toLowerCase();
  };

  const isOddLikeElement = (el) => /odd|odds|price|coef|quota|cotacao|selection|outcome|option|pick/.test(classBlob(el));
  const isInteractiveElement = (el) => !!(el && el.nodeType === 1 && el.matches && el.matches(INTERACTIVE_SELECTOR));

  const readDirectText = (el) => {
    if (!el || el.nodeType !== 1) return '';
    let txt = '';
    for (const node of Array.from(el.childNodes || [])) {
      if (!node || node.nodeType !== Node.TEXT_NODE) continue;
      txt += ' ' + String(node.textContent || '').trim();
    }
    return txt.replace(/\\s+/g, ' ').trim();
  };

  const readVisibleText = (el) => {
    if (!el || el.nodeType !== 1) return '';
    const txt = String(el.innerText || el.textContent || '');
    return txt.replace(/\\s+/g, ' ').trim();
  };

  const compact = (txt) => String(txt || '').toLowerCase().replace(/\\s+/g, '');

  const looksLikeLineContext = (txt) => {
    const c = compact(txt);
    if (!c) return false;
    return /(maisde|menosde|over|under|handicap|asian|total|totais|resultado|set|game|gol|gols|pontos|ponto|points|linha|line|spread)/.test(c);
  };

  const isInsideBetSlip = (el) => {
    if (!el || el.nodeType !== 1 || !el.closest) return false;
    try {
      const sel = [
        '[class*="betslip"]',
        '[class*="bet-slip"]',
        '[class*="coupon"]',
        '[class*="cupom"]',
        '[class*="ticket"]',
        '[data-testid*="betslip"]',
        '[data-testid*="coupon"]',
        '[data-qa*="betslip"]',
        '[data-qa*="coupon"]',
      ].join(',');
      const hit = el.closest(sel);
      if (hit) return true;
    } catch (_) {}
    try {
      let p = el;
      for (let i = 0; p && i < 8; i += 1) {
        const t = compact(readVisibleText(p));
        if (/(cupomdeapostas|cupom|aposteja|salvar|compartilhar|betslip|meusbilhetes|minhasapostas)/.test(t)) {
          return true;
        }
        p = p.parentElement;
      }
    } catch (_) {}
    return false;
  };

  const isBetSlipRootLikely = (el) => {
    if (!el || el.nodeType !== 1) return false;
    const blob = classBlob(el);
    const classHint = /(betslip|bet-slip|coupon|cupom|ticket)/.test(blob);
    const txt = compact(readVisibleText(el)).slice(0, 1800);
    const textHint = /(cupomdeapostas|cupom|apostas|aposta|betslip|betslip|coupon|ticket|salvar|compartilhar|apostar|aposteja|minhasapostas|fazeraposta|fazerapostas|pag\.?m.?x|apostasabertas|totalstake|potentialwin|placebet|clearall|openbets|single|multiple|system)/.test(txt);
    if (classHint && textHint) return true;
    if (!textHint) return false;
    try {
      if (el.querySelector && el.querySelector('[class*="selection"],[class*="outcome"],[class*="pick"],[aria-pressed="true"],[aria-selected="true"]')) {
        return true;
      }
    } catch (_) {}
    return classHint;
  };

  const isStakeLikeText = (raw) => {
    const t = compact(raw);
    if (!t) return false;
    return /(brl|r\\$|apostatotal|totalapostado|ganhopotencial|ganho|pag\.?m.?x|apostar|fazeraposta|valordaaposta|depositar|simples|multiplo|sistema|compartilhar|limpartudo|apostasabertas|totalstake|potentialwin|placebet|openbets|single|multiple|system|clearall|share)/.test(t);
  };

  const isStakeControlNode = (node) => {
    if (!node || node.nodeType !== 1) return false;
    const tag = String(node.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'select' || tag === 'textarea') return true;

    const blob = classBlob(node);
    if (/(stake|amount|valor|betamount|quick|chip|slider|deposit|balance|currency|money)/.test(blob)) return true;

    const txt = readVisibleText(node);
    if (isStakeLikeText(txt)) return true;

    const direct = readDirectText(node);
    if (isStakeLikeText(direct)) return true;

    const controlValue = String(readFormControlValue(node) || '').trim();
    if (controlValue) {
      if (isStakeLikeText(controlValue)) return true;
      if (/^(10|20|25|50|100|200|500|1000)(?:[.,]0+)?$/.test(controlValue)) return true;
    }
    return false;
  };

  const hasBetSlipSelection = () => {
    let roots = [];
    try {
      roots = Array.from(document.querySelectorAll(BETSLIP_ROOT_SELECTOR)).slice(0, 6);
    } catch (_) {
      roots = [];
    }
    if (!roots.length) return false;
    for (const root of roots) {
      if (!root || root.nodeType !== 1 || !isElementVisible(root)) continue;
      const txt = compact(readVisibleText(root));
      if (!txt) continue;
      if (/(fazeraposta|fazerapostas|pag\.?m.?x|apostasabertas|apostas?|cancelartodas|placebet|openbets|bets?|totalstake|potentialwin|clearall)/.test(txt)) return true;
    }
    if (isBtPathFamilyPage() || isBet7kCms1Page()) {
      try {
        const nodes = Array.from(document.querySelectorAll('div,section,aside,header'))
          .filter((n) => n && n.nodeType === 1 && isElementVisible(n))
          .slice(0, 160);
        for (const node of nodes) {
          const t = compact(readVisibleText(node));
          if (!t) continue;
          if (/(cupom|aposta|apostar|apostas?|fazeraposta|pag\.?m.?x|ganhopotencial|apostatotal|compartilhar|coupon|betslip|betslip|placebet|totalstake|potentialwin|clearall|share)/.test(t)) return true;
        }
      } catch (_) {}
    }
    return false;
  };

  const resolveBtPathCupomLoose = () => {
    const extractOddFromSlipTotals = () => {
      const toMoneyNum = (raw) => {
        const s = String(raw || '').replace(/\s+/g, '').replace(/[^0-9,.-]/g, '');
        if (!s) return NaN;
        let norm = s;
        const hasComma = norm.includes(',');
        const hasDot = norm.includes('.');
        if (hasComma && hasDot) {
          if (norm.lastIndexOf(',') > norm.lastIndexOf('.')) {
            norm = norm.replace(/\./g, '').replace(',', '.');
          } else {
            norm = norm.replace(/,/g, '');
          }
        } else if (hasComma) {
          norm = norm.replace(',', '.');
        }
        const n = Number.parseFloat(norm);
        return Number.isFinite(n) ? n : NaN;
      };

      let roots = [];
      try {
        roots = Array.from(document.querySelectorAll(
          '[class*="cupom"],[id*="cupom"],[data-testid*="cupom"],[data-qa*="cupom"],[class*="bet-slip"],[class*="betslip"],[class*="ticket"],[class*="coupon"],aside,section,div'
        ))
          .filter((n) => n && n.nodeType === 1 && isElementVisible(n))
          .slice(0, 220);
      } catch (_) {
        roots = [];
      }
      if (!roots.length) return null;

      const used = new Set();
      for (const root of roots) {
        if (!root || root.nodeType !== 1 || used.has(root)) continue;
        used.add(root);

        const txt = compact(readVisibleText(root));
        if (!txt) continue;
        if (!/(totalapostado|apostatotal|totalstake|stake|(^|[^a-z])aposta|ganhopotencial|potentialwin|pag\.?m.?x|retornopotencial|retorno|potentialreturn|towin|ganho)/.test(txt)) continue;

        const stakeForward = txt.match(/(?:totalapostado|apostatotal|totalstake|stake|apostado|valoraposta)[^0-9]{0,16}([0-9][0-9.,]{0,12})/)
          || txt.match(/(?:^|[^a-z])aposta(?:r\\$)?([0-9][0-9.,]{0,12})/);
        const stakeReverse = txt.match(/([0-9][0-9.,]{0,12})[^a-z0-9]{0,12}(?:totalapostado|apostatotal|totalstake|stake|apostado|valoraposta)/);
        const potForward = txt.match(/(?:ganhopotencial|potentialwin|pag\.?m.?x|pagamentom.?ximo|retornopotencial|retorno|potentialreturn|towin|ganho)[^0-9]{0,16}([0-9][0-9.,]{0,12})/);
        const potReverse = txt.match(/([0-9][0-9.,]{0,12})[^a-z0-9]{0,12}(?:ganhopotencial|potentialwin|pag\.?m.?x|pagamentom.?ximo|retornopotencial|retorno|potentialreturn|towin|ganho)/);

        const stake = toMoneyNum((stakeForward && stakeForward[1]) || (stakeReverse && stakeReverse[1]) || '');
        const potential = toMoneyNum((potForward && potForward[1]) || (potReverse && potReverse[1]) || '');
        if (!Number.isFinite(stake) || !Number.isFinite(potential) || stake <= 0 || potential <= 0) continue;

        const oddNum = potential / stake;
        if (!Number.isFinite(oddNum) || oddNum < 1.01 || oddNum > 30) continue;
        return {
          odd: normalize(oddNum),
          score: 300,
          oddNode: root,
          selectionNode: root,
          fromBetSlip: true,
          slipStrong: true,
        };
      }
      return null;
    };

    let panels = [];
    try {
      panels = Array.from(document.querySelectorAll('aside,section,div,header'))
        .filter((n) => n && n.nodeType === 1 && isElementVisible(n))
        .slice(0, 320);
    } catch (_) {
      panels = [];
    }
    if (!panels.length) return extractOddFromSlipTotals();

    let best = null;
    for (const panel of panels) {
      const t = compact(readVisibleText(panel));
      if (!t) continue;
      if (!/(cupom|aposta|apostar|apostas?|fazeraposta|pag\.?m.?x|ganhopotencial|apostatotal|compartilhar|coupon|betslip|betslip|placebet|totalstake|potentialwin|clearall|share)/.test(t)) continue;

      let odds = [];
      try {
        odds = Array.from(panel.querySelectorAll('input,select,textarea,button,[role="button"],span,div'))
          .filter((n) => n && n.nodeType === 1 && isElementVisible(n))
          .slice(0, 160);
      } catch (_) {
        odds = [];
      }
      if (!odds.length) odds = [panel];

      for (const node of odds) {
        if (isStakeControlNode(node)) continue;
        const parsed = extractOddFromNodeLoose(node);
        if (!parsed || !parsed.odd) continue;
        const oddNum = toNum(parsed.odd);
        if (!Number.isFinite(oddNum)) continue;
        if (oddNum > 30) continue;
        if (oddNum >= 20 && !isOddLikeElement(node)) continue;
        let score = Number(parsed.score || 0) + 120;
        const tag = String(node.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'select' || tag === 'textarea') score -= 260;
        if (/(cupom|aposta|ganhopotencial|pag\.?m.?x|apostatotal)/.test(t)) score += 30;
        if (isStakeLikeText(readVisibleText(node))) score -= 260;
        if (!best || score > best.score) {
          best = {
            odd: parsed.odd,
            score,
            oddNode: node,
            selectionNode: panel,
            fromBetSlip: true,
            slipStrong: true,
          };
        }
      }
    }
    if (best && best.odd) return best;
    return extractOddFromSlipTotals();
  };

  const resolveOddFromGlobalSlipText = () => {
    const toMoneyNum = (raw) => {
      const s = String(raw || '').replace(/\s+/g, '').replace(/[^0-9,.-]/g, '');
      if (!s) return NaN;
      let norm = s;
      const hasComma = norm.includes(',');
      const hasDot = norm.includes('.');
      if (hasComma && hasDot) {
        if (norm.lastIndexOf(',') > norm.lastIndexOf('.')) {
          norm = norm.replace(/\./g, '').replace(',', '.');
        } else {
          norm = norm.replace(/,/g, '');
        }
      } else if (hasComma) {
        norm = norm.replace(',', '.');
      }
      const n = Number.parseFloat(norm);
      return Number.isFinite(n) ? n : NaN;
    };

    const readFromText = (txt) => {
      const lower = String(txt || '').toLowerCase();
      if (!lower) return '';

      const matchAny = (patterns) => {
        for (const rx of patterns) {
          const m = lower.match(rx);
          if (!m || !m[1]) continue;
          const n = toMoneyNum(m[1]);
          if (Number.isFinite(n) && n > 0) return n;
        }
        return NaN;
      };

      const stake = matchAny([
        /(?:total\s*apostado|aposta\s*total|valor\s*da\s*aposta|stake|total\s*stake)\D{0,16}([0-9][0-9.,]{0,14})/,
        /([0-9][0-9.,]{0,14})\D{0,12}(?:total\s*apostado|aposta\s*total|valor\s*da\s*aposta|stake|total\s*stake)/,
        /(?:^|[^a-z0-9])aposta\s*(?:r\$)?\s*([0-9][0-9.,]{0,14})/,
      ]);
      const potential = matchAny([
        /(?:ganho\s*potencial|retorno\s*potencial|retorno|potential\s*win|potential\s*return|to\s*win|ganho)\D{0,16}([0-9][0-9.,]{0,14})/,
        /([0-9][0-9.,]{0,14})\D{0,12}(?:ganho\s*potencial|retorno\s*potencial|retorno|potential\s*win|potential\s*return|to\s*win|ganho)/,
        /(?:pag\.?\s*m.?x|pagamento\s*m.?ximo|paga\s*m.?x)\D{0,18}([0-9][0-9.,]{0,14})/,
        /([0-9][0-9.,]{0,14})\D{0,14}(?:pag\.?\s*m.?x|pagamento\s*m.?ximo|paga\s*m.?x)/,
      ]);

      if (!Number.isFinite(stake) || !Number.isFinite(potential) || stake <= 0 || potential <= 0) return '';
      const oddNum = potential / stake;
      if (!Number.isFinite(oddNum) || oddNum < 1.01 || oddNum > 30) return '';
      return normalize(oddNum);
    };

    try {
      const bodyTxt = String((document && document.body && document.body.innerText) || '');
      const fromBody = readFromText(bodyTxt);
      if (fromBody) return fromBody;
    } catch (_) {}

    let roots = [];
    try {
      roots = Array.from(document.querySelectorAll(
        '[class*="cupom"],[id*="cupom"],[data-testid*="cupom"],[data-qa*="cupom"],[class*="bet-slip"],[class*="betslip"],[class*="ticket"],[class*="coupon"],aside,section,div'
      ))
        .filter((n) => n && n.nodeType === 1 && isElementVisible(n))
        .slice(0, 260);
    } catch (_) {
      roots = [];
    }
    for (const root of roots) {
      const txt = String((root && root.innerText) || '');
      if (!txt) continue;
      const c = compact(txt);
      if (!/(cupom|coupon|betslip|ticket|aposta|apostado|fazeraposta|pag\.?m.?x|ganho|stake|potential)/.test(c)) continue;
      const got = readFromText(txt);
      if (got) return got;
    }
    return '';
  };

  const readFormControlValue = (el) => {
    if (!el || el.nodeType !== 1) return '';
    const tag = String(el.tagName || '').toLowerCase();
    try {
      if (tag === 'input' || tag === 'textarea') {
        const typ = String(el.getAttribute ? (el.getAttribute('type') || '') : '').toLowerCase();
        if (typ === 'hidden' || typ === 'password' || typ === 'email') return '';
        const val = String(el.value == null ? '' : el.value).trim();
        return val;
      }
      if (tag === 'select') {
        const val = String(el.value == null ? '' : el.value).trim();
        if (val) return val;
        const idx = Number(el.selectedIndex);
        if (Number.isFinite(idx) && idx >= 0 && el.options && el.options[idx]) {
          return String(el.options[idx].text || '').trim();
        }
      }
    } catch (_) {}
    return '';
  };

  const isElementVisible = (el) => {
    if (!el || el.nodeType !== 1 || !document.contains(el)) return false;
    try {
      const style = window.getComputedStyle ? window.getComputedStyle(el) : null;
      if (style && (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0)) {
        return false;
      }
      const r = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
      if (!r) return false;
      if (r.width <= 0 || r.height <= 0) return false;
      return true;
    } catch (_) {
      return false;
    }
  };

  const extractLineToken = (txt) => {
    const raw = String(txt || '');
    const c = compact(raw);
    if (/(maisde|menosde|over|under|to\\(|tu\\()/.test(c)) {
      const mPlain = raw.match(/\\d{1,3}(?:[.,]\\d{1,2})?/);
      if (mPlain && mPlain[0]) return mPlain[0].replace(',', '.').toLowerCase();
    }
    const m = raw.match(/[+-]\\s*\\d{1,3}(?:[.,]\\d{1,2})?/);
    if (!m || !m[0]) return '';
    return m[0].replace(/\\s+/g, '').replace(',', '.').toLowerCase();
  };

  const toNum = (raw) => {
    const v = Number.parseFloat(String(raw || '').replace(',', '.'));
    return Number.isFinite(v) ? v : NaN;
  };

  const strictOddFromNode = (el) => {
    if (!el || el.nodeType !== 1) return null;
    if (isInsideBetSlip(el)) return null;
    const oddLike = isOddLikeElement(el);

    const attrBest = bestFromAttributes(el);
    if (attrBest && attrBest.odd) {
      const n = toNum(attrBest.odd);
      if (Number.isFinite(n) && n >= 1.01) {
        return { odd: normalize(n), score: (attrBest.score || 0) + 80, node: el, source: 'attr' };
      }
    }

    const direct = readDirectText(el);
    if (direct) {
      if (!oddLike) return null;
      if (looksLikeLineContext(direct) && !oddLike) return null;
      const toks = parseCandidates(direct).filter((t) => t.hasDecimal && !t.signed && t.value >= 1.01);
      if (toks.length === 1) {
        if (!oddLike && toks[0].decimals === 1 && toks[0].value >= 8) return null;
        return { odd: normalize(toks[0].value), score: 250, node: el, source: 'direct' };
      }
      return null;
    }

    const full = readVisibleText(el);
    if (!full || full.length > 28) return null;
    if (!oddLike) return null;
    if (looksLikeLineContext(full) && !oddLike) return null;
    const toks = parseCandidates(full).filter((t) => t.hasDecimal && !t.signed && t.value >= 1.01);
    if (toks.length !== 1) return null;
    if (!oddLike && toks[0].decimals === 1 && toks[0].value >= 8) return null;
    return { odd: normalize(toks[0].value), score: 95, node: el, source: 'full' };
  };

  const refineOddNodeFromSelection = (selectionNode, preferNode, expectedOdd, lockLineToken = '') => {
    const expected = toNum(expectedOdd);
    const lockLineNum = Number.isFinite(toNum(String(lockLineToken || '').replace(/[+-]/g, '')))
      ? toNum(String(lockLineToken || '').replace(/[+-]/g, ''))
      : NaN;
    const candidates = [];
    const seen = new Set();
    const push = (el) => {
      if (!el || el.nodeType !== 1 || seen.has(el)) return;
      seen.add(el);
      candidates.push(el);
    };

    push(preferNode);
    push(selectionNode);

    try {
      if (selectionNode && selectionNode.querySelectorAll) {
        const hinted = selectionNode.querySelectorAll(ODD_HINT_SELECTOR);
        for (const el of Array.from(hinted).slice(0, 140)) push(el);
      }
    } catch (_) {}

    let best = null;
    for (const el of candidates) {
      const strict = strictOddFromNode(el);
      if (!strict || !strict.odd) continue;
      const n = toNum(strict.odd);
      if (!Number.isFinite(n)) continue;

      let score = strict.score || 0;
      const txt = readVisibleText(el);
      if (isInsideBetSlip(el)) score -= 500;
      if (looksLikeLineContext(txt) && !isOddLikeElement(el)) score -= 260;
      if (!Number.isNaN(lockLineNum) && Math.abs(n - lockLineNum) < 0.0006) score -= 360;
      if (Number.isFinite(expected)) {
        const delta = Math.abs(n - expected);
        if (delta < 0.0006) score += 400;
        else if (delta < 0.01) score += 160;
        else if (delta < 0.08) score += 40;
        else score -= 120;
      }

      const txtLen = txt.length || 0;
      if (txtLen > 0 && txtLen <= 12) score += 80;
      else if (txtLen <= 24) score += 25;
      else score -= 60;

      let depth = 0;
      let p = el;
      while (p && p !== selectionNode && depth < 16) {
        depth += 1;
        p = p.parentElement;
      }
      score += depth * 3;

      if (!best || score > best.score) {
        best = { node: el, odd: strict.odd, score };
      }
    }
    return best;
  };

  const scoreToken = (entry, ctx = {}) => {
    const tok = entry || {};
    let score = 0;
    if (ctx.fromAttr) score += 240;
    if (ctx.isOddLike) score += 120;
    if (ctx.isInteractive) score += 50;
    if (ctx.textLen <= 16) score += 70;
    else if (ctx.textLen <= 40) score += 35;
    else if (ctx.textLen > 120) score -= 100;
    if (ctx.tokensCount === 1) score += 110;
    else if (ctx.tokensCount === 2) score += 55;
    else if (ctx.tokensCount >= 4) score -= 120;

    if (tok.hasDecimal) score += 90;
    else score -= 420;
    if (tok.decimals === 2 || tok.decimals === 3) score += 45;
    else if (tok.decimals === 1) score += 10;

    if (tok.value >= 1.01 && tok.value <= 12) score += 170;
    else if (tok.value <= 25) score += 110;
    else if (tok.value <= 60) score += 40;
    else if (tok.value <= 150) score -= 10;
    else score -= 90;

    if (tok.signed) score -= 520;
    if (tok.decimals === 1 && tok.value >= 8) score -= 260;
    if (!tok.hasDecimal && tok.value >= 10) score -= 160;
    if (tok.value <= 1.01) score -= 350;

    if (ctx.preferLast) score += (tok.index || 0) * 0.02;
    return score;
  };

  const bestFromText = (text, ctx = {}) => {
    const tokens = parseCandidates(text).filter((t) => t.hasDecimal && !t.signed && t.value >= 1.01);
    if (!tokens.length) return null;
    const base = Object.assign({}, ctx, { tokensCount: tokens.length });
    let best = null;
    for (const token of tokens) {
      const score = scoreToken(token, base);
      if (!best || score > best.score) {
        best = { token, score };
      }
    }
    if (!best || !best.token) return null;
    const minScore = ctx.fromAttr ? 80 : 140;
    if (!(best.score >= minScore)) return null;
    return {
      odd: normalize(best.token.value),
      score: best.score,
      token: best.token,
    };
  };

  const bestFromAttributes = (el) => {
    if (!el || el.nodeType !== 1) return null;
    const attrs = ['data-odd', 'data-odds', 'data-price', 'data-value', 'data-selection-price'];
    let best = null;
    for (const name of attrs) {
      let raw = '';
      try { raw = el.getAttribute ? (el.getAttribute(name) || '') : ''; } catch (_) { raw = ''; }
      if (!raw) continue;
      const parsed = bestFromText(raw, {
        fromAttr: true,
        isOddLike: true,
        isInteractive: isInteractiveElement(el),
        textLen: String(raw).length,
        preferLast: true,
      });
      if (!parsed) continue;
      if (!best || parsed.score > best.score) best = parsed;
    }
    return best;
  };

  const bestFromElement = (el, options = {}) => {
    if (!el || el.nodeType !== 1) return null;
    const isOddLike = isOddLikeElement(el);
    const isInteractive = isInteractiveElement(el);

    const byAttr = bestFromAttributes(el);
    if (byAttr) {
      return { odd: byAttr.odd, score: byAttr.score, node: el };
    }

    const direct = readDirectText(el);
    if (direct) {
      const parsedDirect = bestFromText(direct, {
        isOddLike,
        isInteractive,
        textLen: direct.length,
        preferLast: !!options.preferLast,
      });
      if (parsedDirect) {
        return { odd: parsedDirect.odd, score: parsedDirect.score, node: el };
      }
    }

    const full = readVisibleText(el);
    if (!full || full.length > 180) return null;
    const parsedFull = bestFromText(full, {
      isOddLike,
      isInteractive,
      textLen: full.length,
      preferLast: !!options.preferLast,
    });
    if (!parsedFull) return null;
    return { odd: parsedFull.odd, score: parsedFull.score, node: el };
  };

  const findSelectionRoot = (startNode) => {
    let node = startNode && startNode.nodeType === 1 ? startNode : null;
    let best = null;
    for (let i = 0; node && i < 10; i += 1) {
      if (isInteractiveElement(node)) {
        const txt = readVisibleText(node);
        const len = txt.length;
        let area = 0;
        try {
          const r = node.getBoundingClientRect ? node.getBoundingClientRect() : null;
          area = r && Number.isFinite(r.width) && Number.isFinite(r.height) ? (r.width * r.height) : 0;
        } catch (_) {
          area = 0;
        }
        let score = 0;
        if (node.matches && node.matches('[data-odd],[data-odds],[data-price],[data-selection-price]')) score += 260;
        if (isOddLikeElement(node)) score += 90;
        if (len > 0 && len <= 120) score += 90;
        else if (len <= 220) score += 40;
        else score -= 80;
        if (area > 0 && area <= 220000) score += 120;
        else if (area > 0 && area <= 420000) score += 40;
        else if (area > 0) score -= 120;
        if (!best || score > best.score) best = { node, score };
      }
      node = node.parentElement;
    }
    if (best && best.node) return best.node;
    return startNode && startNode.nodeType === 1 ? startNode : null;
  };

  const isSelectedNode = (node) => {
    if (!node || node.nodeType !== 1 || !document.contains(node)) return false;
    try {
      if (node.matches && node.matches(SELECTED_SELECTOR) && !isInsideBetSlip(node)) return true;
    } catch (_) {}
    try {
      if (node.querySelectorAll) {
        const hits = Array.from(node.querySelectorAll(SELECTED_SELECTOR)).slice(0, 24);
        for (const hit of hits) {
          if (hit && hit.nodeType === 1 && !isInsideBetSlip(hit)) return true;
        }
      }
    } catch (_) {}
    return false;
  };

  const isSameOrRelatedNode = (a, b) => {
    if (!a || !b || a.nodeType !== 1 || b.nodeType !== 1) return false;
    if (a === b) return true;
    try {
      if (a.contains && a.contains(b)) return true;
      if (b.contains && b.contains(a)) return true;
    } catch (_) {}
    return false;
  };

  const normalizeContextText = (txt) => {
    const ascii = String(txt || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    return ascii
      .replace(/[+-]?\d{1,4}(?:[.,]\d{1,3})?/g, ' ')
      .replace(/[^a-z]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const contextWordOverlap = (aRaw, bRaw) => {
    const a = String(aRaw || '').trim();
    const b = String(bRaw || '').trim();
    if (!a || !b) return { common: 0, ratio: 0 };
    const sa = new Set(a.split(' ').filter(Boolean));
    const sb = new Set(b.split(' ').filter(Boolean));
    if (!sa.size || !sb.size) return { common: 0, ratio: 0 };
    let common = 0;
    for (const w of sa) {
      if (sb.has(w)) common += 1;
    }
    const ratio = common / Math.min(sa.size, sb.size);
    return { common, ratio };
  };

  const matchesContextToken = (candidateCtx, expectedCtx) => {
    const a = String(candidateCtx || '').trim();
    const b = String(expectedCtx || '').trim();
    if (!b) return true;
    if (!a) return false;
    if (a === b) return true;
    const ov = contextWordOverlap(a, b);
    return ov.common >= 2 && ov.ratio >= 0.5;
  };

  const extractSelectionContext = (node) => {
    if (!node || node.nodeType !== 1) return '';
    const txt = readVisibleText(node);
    const norm = normalizeContextText(txt);
    if (!norm) return '';
    const words = norm
      .split(' ')
      .filter((w) => w && w.length >= 3)
      .slice(0, 14);
    return words.join(' ');
  };

  const hasSameSelectionContext = (resolved) => {
    const current = String(state.lockContextToken || '').trim();
    if (!current) return false;
    const candidateNode = (resolved && (resolved.oddNode || resolved.selectionNode)) || null;
    const next = extractSelectionContext(candidateNode);
    if (!next) return false;
    return matchesContextToken(next, current);
  };

  const refreshLockContext = () => {
    const baseNode = state.selectionNode || state.oddNode || null;
    let ctx = extractSelectionContext(baseNode);
    if (!ctx && state.oddNode) {
      const rootFromOdd = findSelectionRoot(state.oddNode);
      ctx = extractSelectionContext(rootFromOdd);
    }
    if (!ctx && baseNode && baseNode.parentElement) {
      ctx = extractSelectionContext(baseNode.parentElement);
    }
    if (ctx) state.lockContextToken = ctx;
  };

  const isSameTrackedSelection = (resolved) => {
    if (!resolved) return false;
    const currentSel = state.selectionNode || state.oddNode || null;
    const nextSel = resolved.selectionNode || resolved.oddNode || null;
    if (isSameOrRelatedNode(currentSel, nextSel)) return true;
    if (isSameOrRelatedNode(state.selectionNode, resolved.selectionNode)) return true;
    if (isSameOrRelatedNode(state.oddNode, resolved.oddNode)) return true;
    if (hasSameSelectionContext(resolved)) return true;
    return false;
  };

  const isLockedSelectionActive = () => {
    if (!state.lockedByUser) return false;
    if (isBetfairExchangePage() && hasBetSlipSelection()) return true;
    if (isBtPathFamilyPage() && hasBetSlipSelection()) return true;
    if (isBet7kCms1Page() && hasBetSlipSelection()) return true;
    if (isSelectedNode(state.selectionNode)) return true;
    if (isSelectedNode(state.oddNode)) return true;
    return false;
  };

  const hasResolvedLockLine = (resolved) => {
    if (!resolved || !state.lockLineToken) return false;
    const node = resolved.selectionNode || resolved.oddNode || null;
    const txt = compact(readVisibleText(node));
    return !!(txt && txt.includes(state.lockLineToken));
  };

  const shouldHoldLockedSelection = (resolved) => {
    if (!state.lockedByUser) return false;
    if (!resolved || !resolved.odd) return false;
    if (resolved && resolved.fromBetSlip) {
      const staleMsFromSlip = Date.now() - Number(state.lastTs || 0);
      if (resolved.slipStrong) return false;
      if (staleMsFromSlip > 1500) return false;
    }
    if (isBetfairExchangePage() && resolved && resolved.fromBetSlip) return false;
    if (!isLockedSelectionActive()) return false;
    if (isSameTrackedSelection(resolved)) return false;
    if (hasSameSelectionContext(resolved)) return false;

    // If tracker is stale, allow rebinding to a same-line candidate.
    const staleMs = Date.now() - Number(state.lastTs || 0);
    if (staleMs > 2500 && hasResolvedLockLine(resolved)) return false;
    if (staleMs > 1800 && !state.lockLineToken && !state.lockContextToken) return false;

    return true;
  };

  const choosePickLockRoot = (resolved) => {
    if (!resolved) return null;
    const oddNode = resolved.oddNode && resolved.oddNode.nodeType === 1 ? resolved.oddNode : null;
    try {
      if (oddNode && oddNode.closest) {
        const nearInteractive = oddNode.closest(INTERACTIVE_SELECTOR);
        if (nearInteractive && nearInteractive.nodeType === 1 && !isInsideBetSlip(nearInteractive)) {
          return nearInteractive;
        }
      }
    } catch (_) {}
    const selNode = resolved.selectionNode && resolved.selectionNode.nodeType === 1 ? resolved.selectionNode : null;
    if (selNode && !isInsideBetSlip(selNode)) return selNode;
    return oddNode;
  };

  const extractOddFromNodeLoose = (node) => {
    if (!node || node.nodeType !== 1) return null;
    const controlValue = readFormControlValue(node);
    if (controlValue) {
      const parsedControl = bestFromText(controlValue, {
        isOddLike: true,
        isInteractive: true,
        textLen: controlValue.length,
        preferLast: true,
      });
      if (parsedControl && parsedControl.odd) {
        return { odd: parsedControl.odd, score: Number(parsedControl.score || 0) + 180, node };
      }
    }
    const attr = bestFromAttributes(node);
    if (attr && attr.odd) return { odd: attr.odd, score: Number(attr.score || 0) + 120, node };

    const direct = readDirectText(node);
    if (direct) {
      const parsedDirect = bestFromText(direct, {
        isOddLike: isOddLikeElement(node),
        isInteractive: isInteractiveElement(node),
        textLen: direct.length,
        preferLast: true,
      });
      if (parsedDirect && parsedDirect.odd) {
        return { odd: parsedDirect.odd, score: Number(parsedDirect.score || 0), node };
      }
    }

    const full = readVisibleText(node);
    if (!full || full.length > 26) return null;
    const parsedFull = bestFromText(full, {
      isOddLike: isOddLikeElement(node),
      isInteractive: isInteractiveElement(node),
      textLen: full.length,
      preferLast: true,
    });
    if (parsedFull && parsedFull.odd) {
      return { odd: parsedFull.odd, score: Number(parsedFull.score || 0), node };
    }
    return null;
  };

  const resolveFromBetSlip = (expectedContext = '') => {
    const onBetfairExchange = isBetfairExchangePage();
    const onBtPath = isBtPathFamilyPage();
    const onBet7kCms1 = isBet7kCms1Page();
    const onCupomFamily = onBtPath || onBet7kCms1;
    let roots = [];
    try {
      roots = Array.from(document.querySelectorAll(BETSLIP_ROOT_SELECTOR)).slice(0, 8);
    } catch (_) {
      roots = [];
    }
    if (!roots.length && onCupomFamily) {
      try {
        roots = Array.from(document.querySelectorAll(
          '[class*="cupom"],[id*="cupom"],[data-testid*="cupom"],[data-qa*="cupom"],[class*="bet-slip"],[class*="betslip"],[class*="ticket"],[class*="coupon"]'
        ))
          .filter((n) => n && n.nodeType === 1 && isElementVisible(n))
          .slice(0, 8);
      } catch (_) {
        roots = [];
      }
    }
    if (onCupomFamily) {
      try {
        const candidates = Array.from(document.querySelectorAll('aside,section,div,header'))
          .filter((n) => n && n.nodeType === 1 && isElementVisible(n))
          .slice(0, 240);
        const extra = [];
        for (const node of candidates) {
          const t = compact(readVisibleText(node));
          if (!t) continue;
          const hasCupom = /(cupom|aposta|apostar|apostas?|ganhopotencial|apostatotal|coupon|betslip|betslip|placebet|totalstake|potentialwin|clearall)/.test(t);
          if (!hasCupom) continue;
          if (node.querySelector && node.querySelector('input,select,textarea,[class*="odd"],[class*="price"]')) {
            extra.push(node);
          }
          if (extra.length >= 6) break;
        }
        if (extra.length) roots = extra.concat(roots).slice(0, 8);
      } catch (_) {}
    }
    if (!roots.length) return null;

    let visibleRoots = roots.filter((root) => root && root.nodeType === 1 && isElementVisible(root));
    if (!visibleRoots.length) return null;
    const likelyRoots = visibleRoots.filter((root) => isBetSlipRootLikely(root));
    if (likelyRoots.length) visibleRoots = likelyRoots;

    let bestMatched = null;
    let bestFallback = null;
    let selectedCandidates = 0;
    const fallbackOdds = new Set();

    for (const root of visibleRoots) {
      let entries = [];
      try {
        entries = Array.from(root.querySelectorAll([
          '[class*="selection"]',
          '[class*="outcome"]',
          '[class*="pick"]',
          '[class*="event"]',
          'li',
          'article',
          'div',
        ].join(','))).slice(0, 220);
      } catch (_) {
        entries = [];
      }
      if (!entries.length) entries = [root];

      for (const entry of entries) {
        if (!entry || entry.nodeType !== 1 || !isElementVisible(entry)) continue;
        const entryCtx = extractSelectionContext(entry);
        const exactContext = matchesContextToken(entryCtx, expectedContext);
        let entrySelected = false;
        try {
          if (entry.matches && entry.matches(SELECTED_SELECTOR)) entrySelected = true;
          if (!entrySelected && entry.querySelector && entry.querySelector(SELECTED_SELECTOR)) entrySelected = true;
        } catch (_) {}
        if (entrySelected) selectedCandidates += 1;

        let oddCandidates = [];
        try {
          oddCandidates = Array.from(entry.querySelectorAll([
            ODD_HINT_SELECTOR,
            'button',
            '[role="button"]',
            'input',
            'select',
            'textarea',
            '[contenteditable="true"]',
            'span',
            'div',
          ].join(','))).slice(0, 120);
        } catch (_) {
          oddCandidates = [];
        }
        if (!oddCandidates.length) oddCandidates = [entry];

        for (const oddNode of oddCandidates) {
          if (isStakeControlNode(oddNode)) continue;
          const parsed = extractOddFromNodeLoose(oddNode);
          if (!parsed || !parsed.odd) continue;
          const oddNum = toNum(parsed.odd);
          if (!Number.isFinite(oddNum)) continue;
          if (oddNum > 30) continue;
          if (oddNum >= 20 && !isOddLikeElement(oddNode)) continue;
          let score = Number(parsed.score || 0) + 80;
          if (oddNode === entry) score -= 30;
          if (isOddLikeElement(oddNode)) score += 40;
          if (isInteractiveElement(oddNode)) score += 30;
          const oddTag = String(oddNode && oddNode.tagName ? oddNode.tagName : '').toLowerCase();
          if (oddTag === 'input' || oddTag === 'select' || oddTag === 'textarea') score -= 300;
          if (isStakeLikeText(readVisibleText(oddNode))) score -= 280;
          if (entrySelected) score += 240;
          if (expectedContext) {
            if (exactContext) {
              score += 320;
            } else if (entryCtx) {
              const ov = contextWordOverlap(expectedContext, entryCtx);
              if (ov.common >= 2 && ov.ratio >= 0.5) score += 140;
              else if (ov.common >= 1) score += 40;
              else score -= 90;
            } else {
              score -= 80;
            }
          }

          const candidate = {
            odd: parsed.odd,
            score,
            oddNode,
            selectionNode: entry,
            fromBetSlip: true,
            slipStrong: !!(exactContext || entrySelected || !expectedContext),
          };

          if (exactContext) {
            if (!bestMatched || score > bestMatched.score) bestMatched = candidate;
            continue;
          }

          fallbackOdds.add(parsed.odd);
          if (!bestFallback || score > bestFallback.score) bestFallback = candidate;
        }
      }
    }
    if (bestMatched) return bestMatched;
    if (!bestFallback) return null;

    const fallbackDiversity = fallbackOdds.size;
    const canUseFallback = onBetfairExchange
      ? (selectedCandidates > 0 || fallbackDiversity <= 4 || !expectedContext || visibleRoots.length <= 2)
      : (onCupomFamily ? (selectedCandidates > 0 || fallbackDiversity <= 4 || !expectedContext) : (selectedCandidates > 0 || fallbackDiversity <= 2 || !expectedContext));
    const minScore = onBetfairExchange ? 120 : (onCupomFamily ? 140 : 200);
    if (canUseFallback && Number(bestFallback.score || 0) >= minScore) return bestFallback;
    if (onBtPath) {
      const loose = resolveBtPathCupomLoose();
      if (loose && loose.odd) return loose;
    }
    return null;
  };

  const collectCandidateElements = (rootNode, preferNode = null, options = {}) => {
    const out = [];
    const seen = new Set();
    const add = (el) => {
      if (!el || el.nodeType !== 1 || seen.has(el)) return;
      seen.add(el);
      out.push(el);
    };

    if (options && options.tight) {
      const baseRaw = (preferNode && preferNode.nodeType === 1) ? preferNode : rootNode;
      const baseInteractive = (baseRaw && baseRaw.closest) ? baseRaw.closest(INTERACTIVE_SELECTOR) : null;
      const base = baseInteractive || baseRaw || rootNode;
      add(base);
      add(preferNode);
      if (rootNode && rootNode !== base) add(rootNode);

      try {
        if (base && base.querySelectorAll) {
          const hinted = base.querySelectorAll(ODD_HINT_SELECTOR);
          for (const el of Array.from(hinted).slice(0, 24)) add(el);
        }
      } catch (_) {}

      try {
        if (base && base.children) {
          for (const child of Array.from(base.children).slice(0, 12)) {
            add(child);
            if (child && child.querySelectorAll) {
              const hintedChild = child.querySelectorAll(ODD_HINT_SELECTOR);
              for (const el of Array.from(hintedChild).slice(0, 6)) add(el);
            }
          }
        }
      } catch (_) {}

      let up = base && base.parentElement ? base.parentElement : null;
      for (let i = 0; up && i < 3; i += 1) {
        add(up);
        up = up.parentElement;
      }

      return out;
    }

    add(rootNode);
    add(preferNode);

    let up = preferNode;
    for (let i = 0; up && i < 5; i += 1) {
      add(up);
      if (up === rootNode) break;
      up = up.parentElement;
    }

    try {
      if (rootNode && rootNode.querySelectorAll) {
        const hinted = rootNode.querySelectorAll(ODD_HINT_SELECTOR);
        for (const el of Array.from(hinted).slice(0, 80)) add(el);

        const interactive = rootNode.querySelectorAll(INTERACTIVE_SELECTOR);
        for (const el of Array.from(interactive).slice(0, 40)) add(el);
      }
    } catch (_) {}

    return out;
  };

  const resolveFromNearNode = (rawNode, event) => {
    if (!rawNode || rawNode.nodeType !== 1) return null;
    const rootNode = findSelectionRoot(rawNode);
    if (!rootNode) return null;

    const candidates = [];
    const seen = new Set();
    const add = (el) => {
      if (!el || el.nodeType !== 1 || seen.has(el)) return;
      seen.add(el);
      candidates.push(el);
    };

    add(rawNode);
    add(rootNode);
    try {
      if (rawNode.querySelectorAll) {
        for (const el of Array.from(rawNode.querySelectorAll(ODD_HINT_SELECTOR)).slice(0, 32)) add(el);
      }
    } catch (_) {}
    try {
      if (rootNode.querySelectorAll) {
        for (const el of Array.from(rootNode.querySelectorAll(ODD_HINT_SELECTOR)).slice(0, 48)) add(el);
      }
    } catch (_) {}

    const x = Number(event && event.clientX);
    const y = Number(event && event.clientY);
    const hasPointer = Number.isFinite(x) && Number.isFinite(y);

    let best = null;
    for (const el of candidates) {
      const strict = strictOddFromNode(el);
      if (!strict || !strict.odd) continue;
      let score = strict.score || 0;
      if (el === rawNode) score += 260;
      if (el === rootNode) score += 40;
      if (isOddLikeElement(el)) score += 100;
      if (looksLikeLineContext(readVisibleText(el)) && !isOddLikeElement(el)) score -= 260;

      if (hasPointer && el.getBoundingClientRect) {
        try {
          const r = el.getBoundingClientRect();
          if (r && Number.isFinite(r.left) && Number.isFinite(r.top) && Number.isFinite(r.width) && Number.isFinite(r.height)) {
            const inside = x >= r.left && x <= (r.left + r.width) && y >= r.top && y <= (r.top + r.height);
            if (inside) {
              score += 260;
            } else {
              const cx = r.left + (r.width / 2);
              const cy = r.top + (r.height / 2);
              const dx = cx - x;
              const dy = cy - y;
              const dist = Math.sqrt((dx * dx) + (dy * dy));
              score -= Math.min(220, dist / 3.5);
            }
          }
        } catch (_) {}
      }

      if (!best || score > best.score) {
        best = {
          odd: strict.odd,
          score,
          oddNode: strict.node || el,
          selectionNode: rootNode,
        };
      }
    }

    return best;
  };

  const resolveFromRoot = (rootNode, preferNode = null, options = {}) => {
    if (!rootNode || rootNode.nodeType !== 1) return null;
    const candidates = collectCandidateElements(rootNode, preferNode, options);
    const lockLine = String(options && options.lockLine ? options.lockLine : '').toLowerCase();
    let best = null;
    for (const el of candidates) {
      if (isInsideBetSlip(el)) continue;
      const parsed = bestFromElement(el, { preferLast: true });
      if (!parsed || !parsed.odd) continue;
      let score = parsed.score;
      if (el === preferNode) score += 120;
      if (el === rootNode) score += 20;
      if (isOddLikeElement(el)) score += 50;
      if (lockLine) {
        const txtCompact = compact(readVisibleText(el));
        if (txtCompact.includes(lockLine)) score += 260;
        else score -= 220;
      }
      if (best === null || score > best.score) {
        best = {
          odd: parsed.odd,
          score,
          oddNode: parsed.node || el,
          selectionNode: rootNode,
        };
      }
    }
    return best;
  };

  const publish = (odd, source) => {
    if (!odd) return;
    if (source === 'pick') {
      state.lockedByUser = true;
      state.lockedAt = Date.now();
    }
    if (!state.lockedByUser) return;
    if (state.lastOdd === odd && source !== 'mutation' && source !== 'poll') return;
    state.lastOdd = odd;
    state.lastSource = source || 'unknown';
    state.lastTs = Date.now();
  };

  const resetObserver = () => {
    if (state.nodeObserver) {
      try { state.nodeObserver.disconnect(); } catch (_) {}
      state.nodeObserver = null;
    }
  };

  const observeTrackedNode = () => {
    resetObserver();
    const target = state.oddNode || state.selectionNode;
    if (!target || target.nodeType !== 1) return;
    try {
      state.nodeObserver = new MutationObserver(() => {
        let resolved = null;
        if (state.oddNode && document.contains(state.oddNode)) {
          const parsed = strictOddFromNode(state.oddNode);
          if (parsed && parsed.odd) {
            resolved = {
              odd: parsed.odd,
              score: parsed.score || 0,
              oddNode: state.oddNode,
              selectionNode: state.selectionNode || state.oddNode,
            };
          }
        }
        if (!resolved) {
          const refined = refineOddNodeFromSelection(
            state.selectionNode || target,
            state.oddNode || target,
            state.lastOdd || '',
            state.lockLineToken || ''
          );
          if (refined && refined.node && refined.odd) {
            resolved = {
              odd: refined.odd,
              score: refined.score || 0,
              oddNode: refined.node,
              selectionNode: state.selectionNode || target,
            };
          } else {
            resolved = resolveFromRoot(
              state.selectionNode || target,
              state.oddNode || target,
              { tight: true, lockLine: state.lockLineToken || '' }
            );
          }
        }
        if (!resolved || !resolved.odd) return;
        if (shouldHoldLockedSelection(resolved)) {
          return;
        }
        state.selectionNode = resolved.selectionNode || state.selectionNode || resolved.oddNode || null;
        state.oddNode = resolved.oddNode || state.oddNode || resolved.selectionNode || null;
        refreshLockContext();
        publish(resolved.odd, 'mutation');
      });
      state.nodeObserver.observe(target, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
      });
    } catch (_) {}
  };

  const trackResolved = (resolved, source) => {
    if (!resolved || !resolved.odd) return false;
    if (shouldHoldLockedSelection(resolved)) return false;
    const sourceContextToken = source === 'pick'
      ? extractSelectionContext(resolved.selectionNode || resolved.oddNode || null)
      : '';
    let selectionRoot = resolved.selectionNode || resolved.oddNode || null;
    if (source === 'pick') {
      const pickRoot = choosePickLockRoot(resolved);
      if (pickRoot) selectionRoot = pickRoot;
    }
    state.selectionNode = selectionRoot || null;
    state.oddNode = resolved.oddNode || selectionRoot || null;
    if (sourceContextToken) state.lockContextToken = sourceContextToken;
    refreshLockContext();
    if (source === 'pick') {
      const refinedPick = refineOddNodeFromSelection(
        state.selectionNode || state.oddNode || null,
        state.oddNode || null,
        resolved.odd,
        state.lockLineToken || ''
      );
      if (refinedPick && refinedPick.node) {
        state.oddNode = refinedPick.node;
      }
      const lineProbeTxt = readVisibleText(state.selectionNode || state.oddNode || null);
      state.lockLineToken = extractLineToken(lineProbeTxt);
      refreshLockContext();
    }
    observeTrackedNode();
    publish(resolved.odd, source || 'pick');
    return true;
  };

  const buildNodeChain = (event) => {
    try {
      if (event && typeof event.composedPath === 'function') {
        return event.composedPath().filter((it) => it && it.nodeType === 1);
      }
    } catch (_) {}
    const out = [];
    let node = event && event.target ? event.target : null;
    for (let i = 0; node && i < 14; i += 1) {
      if (node.nodeType === 1) out.push(node);
      node = node.parentElement;
    }
    return out;
  };

  const resolveFromEvent = (event) => {
    const chain = buildNodeChain(event);
    for (const rawNode of chain) {
      const near = resolveFromNearNode(rawNode, event);
      if (near && near.odd && near.score >= 220) return near;

      const rootNode = findSelectionRoot(rawNode);
      if (!rootNode) continue;
      const resolved = resolveFromRoot(rootNode, rawNode, {
        tight: true,
        lockLine: '',
      });
      if (!resolved || !resolved.odd) continue;
      if (!(resolved.score >= 220)) continue;
      return resolved;
    }
    return null;
  };

  const probeSelected = (opts = {}) => {
    let best = null;
    let nodes = [];
    try {
      nodes = Array.from(document.querySelectorAll(SELECTED_SELECTOR))
        .filter((n) => n && n.nodeType === 1 && !isInsideBetSlip(n))
        .slice(0, 80);
    } catch (_) {
      nodes = [];
    }

    const lockLine = String(opts && opts.lockLine ? opts.lockLine : '').toLowerCase();
    const contextToken = String(opts && opts.contextToken ? opts.contextToken : '').trim();
    for (const node of nodes) {
      const rootNode = findSelectionRoot(node);
      if (!rootNode) continue;
      const resolved = resolveFromRoot(rootNode, node, {
        tight: true,
        lockLine,
      });
      if (!resolved || !resolved.odd) continue;
      let score = resolved.score + 40;
      if (contextToken) {
        const ctx = extractSelectionContext(node) || extractSelectionContext(rootNode);
        if (ctx && ctx === contextToken) {
          score += 520;
        } else if (ctx && contextToken) {
          const ov = contextWordOverlap(contextToken, ctx);
          if (ov.common >= 2) score += 240;
          else score -= 180;
        }
      }
      if (!best || score > best.score) {
        best = Object.assign({}, resolved, { score });
      }
    }

    if (best) {
      if (!(opts && opts.apply === false)) trackResolved(best, 'selected');
      return best;
    }
    return null;
  };

  if (!state.installed) {
    state.installed = true;
    const onPick = (event) => {
      let resolved = resolveFromEvent(event);
      if (isBetfairExchangePage()) {
        const rawTarget = event && event.target ? event.target : null;
        const eventTargetNode = rawTarget && rawTarget.nodeType === 1 ? rawTarget : (rawTarget && rawTarget.parentElement ? rawTarget.parentElement : null);
        const pickContext = extractSelectionContext((resolved && (resolved.selectionNode || resolved.oddNode)) || eventTargetNode || null);
        const slipResolved = resolveFromBetSlip(pickContext || state.lockContextToken || '');
        // Betfair Exchange: ignore grid; only trust betslip when present.
        resolved = (slipResolved && slipResolved.odd) ? slipResolved : null;
      } else if (isBtPathFamilyPage() || isBet7kCms1Page()) {
        const rawTarget = event && event.target ? event.target : null;
        const eventTargetNode = rawTarget && rawTarget.nodeType === 1 ? rawTarget : (rawTarget && rawTarget.parentElement ? rawTarget.parentElement : null);
        const eventRootNode = findSelectionRoot(eventTargetNode);
        const nearResolved = eventTargetNode ? resolveFromNearNode(eventTargetNode, event) : null;
        let pickContext = extractSelectionContext(eventRootNode || eventTargetNode || null);
        if (!pickContext && nearResolved && nearResolved.selectionNode) {
          pickContext = extractSelectionContext(nearResolved.selectionNode);
        }
        const slipResolved = resolveFromBetSlip(pickContext || state.lockContextToken || '');
        const onBtPathPick = isBtPathFamilyPage();
        const onBet7kCms1Pick = isBet7kCms1Page();
        if (onBet7kCms1Pick) {
          // CMS1: nao confiar no resolved bruto; so usa fonte aderente ao clique/selecionado.
          resolved = null;
          const expectedCtx = pickContext || state.lockContextToken || '';
          const selectedNow = probeSelected({
            lockLine: state.lockLineToken || '',
            contextToken: expectedCtx,
            apply: false,
          });

          // CMS1: prioriza seleção realmente marcada no DOM.
          if (selectedNow && selectedNow.odd) {
            resolved = selectedNow;
          }

          if (!resolved && nearResolved && nearResolved.odd && eventTargetNode) {
            const nearNode = nearResolved.oddNode || nearResolved.selectionNode || null;
            const relatedToClick = isSameOrRelatedNode(nearNode, eventTargetNode);
            if (relatedToClick && Number(nearResolved.score || 0) >= 260) {
              resolved = nearResolved;
            }
          }

          // Se vier um "resolved" fora de contexto, invalida para não pegar odd errada.
          if (resolved && resolved.odd && expectedCtx) {
            const resolvedCtx = extractSelectionContext(resolved.selectionNode || resolved.oddNode || null);
            if (resolvedCtx && !matchesContextToken(resolvedCtx, expectedCtx)) {
              resolved = null;
            }
          }

          if (!resolved || !resolved.odd) {
            if (slipResolved && slipResolved.odd && expectedCtx) {
              const slipCtx = extractSelectionContext(slipResolved.selectionNode || slipResolved.oddNode || null);
              if (matchesContextToken(slipCtx, expectedCtx)) {
                resolved = slipResolved;
              }
            }
          } else if (slipResolved && slipResolved.odd) {
            const resolvedNum = toNum(resolved.odd);
            const slipNum = toNum(slipResolved.odd);
            const slipCtx = extractSelectionContext(slipResolved.selectionNode || slipResolved.oddNode || null);
            const sameCtx = matchesContextToken(slipCtx, pickContext || state.lockContextToken || '');
            // Só substitui por cupom se ele estiver fortemente ancorado no mesmo contexto.
            if (
              (slipResolved.slipStrong || sameCtx)
              && Number.isFinite(resolvedNum)
              && Number.isFinite(slipNum)
              && Math.abs(resolvedNum - slipNum) < 0.0006
            ) {
              resolved = slipResolved;
            }
          }

          // Rechecagem curta pós-clique: CMS1 costuma marcar seleção com atraso.
          setTimeout(() => {
            const lateCtx = expectedCtx || state.lockContextToken || '';
            const lateSelected = probeSelected({
              lockLine: state.lockLineToken || '',
              contextToken: lateCtx,
              apply: false,
            });
            if (lateSelected && lateSelected.odd) {
              trackResolved(lateSelected, 'pick');
              return;
            }
            const lateSlip = resolveFromBetSlip(lateCtx);
            if (lateSlip && lateSlip.odd && lateCtx) {
              const lateSlipCtx = extractSelectionContext(lateSlip.selectionNode || lateSlip.oddNode || null);
              if (matchesContextToken(lateSlipCtx, lateCtx)) {
                trackResolved(lateSlip, 'pick');
              }
            }
          }, 220);
        } else if (onBtPathPick) {
          // bt-path: usa cupom primeiro, mas mantém fallback da grade/evento.
          resolved = (slipResolved && slipResolved.odd) ? slipResolved : (resolveBtPathCupomLoose() || resolved);
        }
      }
      if (resolved) trackResolved(resolved, 'pick');
    };

    document.addEventListener('click', onPick, true);

    state.scanTimer = setInterval(() => {
      const elapsed = Date.now() - Number(state.lastTs || 0);
      const onCupomFamilyNow = isBtPathFamilyPage() || isBet7kCms1Page();
      const hasSlipSelectionNow = onCupomFamilyNow && hasBetSlipSelection();
      if (hasSlipSelectionNow) {
        if (!state.lockedByUser) {
          state.lockedByUser = true;
          state.lockedAt = Date.now();
        }
      }
      const canProbeCupomWithoutPickedNode = onCupomFamilyNow || hasSlipSelectionNow;
      if (state.selectionNode || state.oddNode || canProbeCupomWithoutPickedNode) {
        let resolved = null;
        let selectedResolved = null;
        let slipResolved = null;
        if (state.lockedByUser) {
          selectedResolved = probeSelected({
            lockLine: state.lockLineToken || '',
            contextToken: state.lockContextToken || '',
            apply: false,
          });
          slipResolved = resolveFromBetSlip(state.lockContextToken || '');
        }
        const onBetfair = isBetfairExchangePage();
        const onBtPath = isBtPathFamilyPage();
        const onBet7kCms1 = isBet7kCms1Page();
        const onCupomFamily = onBtPath || onBet7kCms1;
        if (!slipResolved && onCupomFamily) {
          slipResolved = resolveFromBetSlip(state.lockContextToken || '');
        }
        if (onBetfair) {
          // Betfair Exchange: ignore grid, use only betslip.
          resolved = (slipResolved && slipResolved.odd) ? slipResolved : null;
        } else if (onBet7kCms1) {
          // CMS1: prioriza seleção ativa (quando houver), depois cupom.
          if (selectedResolved && selectedResolved.odd) {
            resolved = selectedResolved;
          } else if (slipResolved && slipResolved.odd && state.lockContextToken) {
            const slipCtx = extractSelectionContext(slipResolved.selectionNode || slipResolved.oddNode || null);
            if (matchesContextToken(slipCtx, state.lockContextToken)) {
              resolved = slipResolved;
            }
          }
        } else if (onBtPath) {
          // bt-path: cupom-first com fallback da grade/seleção.
          resolved = (slipResolved && slipResolved.odd) ? slipResolved : resolveBtPathCupomLoose();
          if ((!resolved || !resolved.odd) && selectedResolved && selectedResolved.odd) {
            resolved = selectedResolved;
          }
          if (!resolved || !resolved.odd) {
            if (state.oddNode && document.contains(state.oddNode)) {
              const parsed = strictOddFromNode(state.oddNode);
              if (parsed && parsed.odd) {
                resolved = {
                  odd: parsed.odd,
                  score: parsed.score || 0,
                  oddNode: state.oddNode,
                  selectionNode: state.selectionNode || state.oddNode,
                };
              }
            }
            if (!resolved) {
              const refined = refineOddNodeFromSelection(
                state.selectionNode || state.oddNode,
                state.oddNode,
                state.lastOdd || '',
                state.lockLineToken || ''
              );
              if (refined && refined.node && refined.odd) {
                resolved = {
                  odd: refined.odd,
                  score: refined.score || 0,
                  oddNode: refined.node,
                  selectionNode: state.selectionNode || state.oddNode,
                };
              } else {
                resolved = resolveFromRoot(
                  state.selectionNode || state.oddNode,
                  state.oddNode,
                  { tight: true, lockLine: state.lockLineToken || '' }
                );
              }
            }
          }
        } else {
        if (state.oddNode && document.contains(state.oddNode)) {
          const parsed = strictOddFromNode(state.oddNode);
          if (parsed && parsed.odd) {
            resolved = {
              odd: parsed.odd,
              score: parsed.score || 0,
              oddNode: state.oddNode,
              selectionNode: state.selectionNode || state.oddNode,
            };
          }
        }
        if (!resolved) {
          const refined = refineOddNodeFromSelection(
            state.selectionNode || state.oddNode,
            state.oddNode,
            state.lastOdd || '',
            state.lockLineToken || ''
          );
          if (refined && refined.node && refined.odd) {
            resolved = {
              odd: refined.odd,
              score: refined.score || 0,
              oddNode: refined.node,
              selectionNode: state.selectionNode || state.oddNode,
            };
          } else {
            resolved = resolveFromRoot(
              state.selectionNode || state.oddNode,
              state.oddNode,
              { tight: true, lockLine: state.lockLineToken || '' }
            );
          }
        }
        if (onBetfair && slipResolved && slipResolved.odd) {
          resolved = slipResolved;
        } else if (selectedResolved && selectedResolved.odd) {
          // While locked, prefer the currently selected candidate from the page.
          resolved = selectedResolved;
        }
        if (!onBetfair && !onCupomFamily && slipResolved && slipResolved.odd) {
          if (!resolved || !resolved.odd) {
            resolved = slipResolved;
          } else {
            const resolvedIsStale = String(resolved.odd || '') === String(state.lastOdd || '');
            const slipHasNewOdd = String(slipResolved.odd || '') !== String(state.lastOdd || '');
            const slipClearlyBetter = Number(slipResolved.score || 0) > (Number(resolved.score || 0) + 180);
            if ((resolvedIsStale && slipHasNewOdd) || (elapsed > 1200 && slipHasNewOdd) || slipClearlyBetter) {
              resolved = slipResolved;
            }
          }
        }
        }
        if (resolved && resolved.odd) {
          if (!shouldHoldLockedSelection(resolved)) {
            state.selectionNode = resolved.selectionNode || state.selectionNode || resolved.oddNode || null;
            state.oddNode = resolved.oddNode || state.oddNode || resolved.selectionNode || null;
            refreshLockContext();
            publish(resolved.odd, resolved.fromBetSlip ? 'poll-slip' : 'poll');
          }
        }
      }
      if (!state.lockedByUser && (!state.lastTs || elapsed > 7000 || !state.selectionNode)) {
        probeSelected({ lockLine: '' });
      }
    }, 550);

    probeSelected({ lockLine: '' });
  }

  if (!state.lastOdd) {
    try {
      const onBetfairNow = isBetfairExchangePage();
      const onBtPathNow = isBtPathFamilyPage();
      const onBet7kCms1Now = isBet7kCms1Page();
      const onCupomFamilyNow = onBtPathNow || onBet7kCms1Now;
      let instantResolved = null;

      if (onBetfairNow || onCupomFamilyNow) {
        instantResolved = resolveFromBetSlip(state.lockContextToken || '');
        if ((!instantResolved || !instantResolved.odd) && onBtPathNow) {
          instantResolved = resolveBtPathCupomLoose();
        }
        if (onBet7kCms1Now && instantResolved && instantResolved.odd && state.lockContextToken) {
          const instantSlipCtx = extractSelectionContext(instantResolved.selectionNode || instantResolved.oddNode || null);
          if (!matchesContextToken(instantSlipCtx, state.lockContextToken)) {
            instantResolved = null;
          }
        }
      } else if (state.selectionNode || state.oddNode) {
        instantResolved = resolveFromRoot(
          state.selectionNode || state.oddNode,
          state.oddNode,
          { tight: true, lockLine: state.lockLineToken || '' }
        );
      }

      if (instantResolved && instantResolved.odd) {
        state.selectionNode = instantResolved.selectionNode || state.selectionNode || instantResolved.oddNode || null;
        state.oddNode = instantResolved.oddNode || state.oddNode || instantResolved.selectionNode || null;
        refreshLockContext();
        publish(instantResolved.odd, instantResolved.fromBetSlip ? 'instant-slip' : 'instant');
      }
    } catch (_) {}
  }

  if (!state.lastOdd) {
    try {
      const globalSlipOdd = resolveOddFromGlobalSlipText();
      if (globalSlipOdd) {
        publish(globalSlipOdd, 'instant-slip-global');
      }
    } catch (_) {}
  }

  return {
    odd: String(state.lastOdd || ''),
    ts: Number(state.lastTs || 0),
    source: String(state.lastSource || ''),
    href: String(location && location.href ? location.href : ''),
  };
})();
`;

const BETANO_GLOBAL_SLIP_TOTALS_SCRIPT = `
(() => {
  const normalize = (n) => Number(n).toFixed(3).replace(/\\.?0+$/, '');
  const compact = (txt) => String(txt || '').toLowerCase().replace(/\\s+/g, '');
  const clip = (txt, max = 180) => String(txt || '').replace(/\\s+/g, ' ').trim().slice(0, max);
  const KEY_STAKE = /(totalapostado|apostatotal|valordaaposta|(^|[^a-z])aposta|stake|totalstake)/;
  const KEY_POTENTIAL = /(ganhopotencial|pag\.?m.?x|pagamentom.?ximo|retornopotencial|retorno|potentialwin|potentialreturn|towin|ganho)/;
  const KEY_CUPOM = /(cupom|coupon|betslip|ticket|aposta|apostado|fazeraposta|pag\.?m.?x|simples|multiplo|sistema)/;
  const diag = {
    iframeTotal: 0,
    iframeSameOrigin: 0,
    iframeCrossOrigin: 0,
    hasStakeKeyword: false,
    hasPotentialKeyword: false,
    hasCupomKeyword: false,
    firstStakeSample: '',
    firstPotentialSample: '',
  };
  const toMoneyNum = (raw) => {
    const s = String(raw || '').replace(/\\s+/g, '').replace(/[^0-9,.-]/g, '');
    if (!s) return NaN;
    let norm = s;
    const hasComma = norm.includes(',');
    const hasDot = norm.includes('.');
    if (hasComma && hasDot) {
      if (norm.lastIndexOf(',') > norm.lastIndexOf('.')) {
        norm = norm.replace(/\\./g, '').replace(',', '.');
      } else {
        norm = norm.replace(/,/g, '');
      }
    } else if (hasComma) {
      norm = norm.replace(',', '.');
    }
    const n = Number.parseFloat(norm);
    return Number.isFinite(n) ? n : NaN;
  };

  const readFromText = (txt) => {
    const lower = String(txt || '').toLowerCase();
    if (!lower) return '';

    const pickNum = (patterns) => {
      for (const rx of patterns) {
        const m = lower.match(rx);
        if (!m || !m[1]) continue;
        const n = toMoneyNum(m[1]);
        if (Number.isFinite(n) && n > 0) return n;
      }
      return NaN;
    };

    const stake = pickNum([
      /(?:total\\s*apostado|aposta\\s*total|valor\\s*da\\s*aposta|stake|total\\s*stake)\\D{0,18}([0-9][0-9.,]{0,14})/,
      /([0-9][0-9.,]{0,14})\\D{0,12}(?:total\\s*apostado|aposta\\s*total|valor\\s*da\\s*aposta|stake|total\\s*stake)/,
      /(?:^|[^a-z0-9])aposta\\s*(?:r\\$)?\\s*([0-9][0-9.,]{0,14})/,
    ]);
    const potential = pickNum([
      /(?:ganho\\s*potencial|retorno\\s*potencial|retorno|potential\\s*win|potential\\s*return|to\\s*win|ganho)\\D{0,18}([0-9][0-9.,]{0,14})/,
      /([0-9][0-9.,]{0,14})\\D{0,12}(?:ganho\\s*potencial|retorno\\s*potencial|retorno|potential\\s*win|potential\\s*return|to\\s*win|ganho)/,
      /(?:pag\\.?\\s*m.?x|pagamento\\s*m.?ximo|paga\\s*m.?x)\\D{0,18}([0-9][0-9.,]{0,14})/,
      /([0-9][0-9.,]{0,14})\\D{0,14}(?:pag\\.?\\s*m.?x|pagamento\\s*m.?ximo|paga\\s*m.?x)/,
    ]);
    if (!Number.isFinite(stake) || !Number.isFinite(potential) || stake <= 0 || potential <= 0) return '';
    const oddNum = potential / stake;
    if (!Number.isFinite(oddNum) || oddNum < 1.01 || oddNum > 30) return '';
    return normalize(oddNum);
  };

  const texts = [];
  const pushText = (txt) => {
    const t = String(txt || '').trim();
    if (!t) return;
    const c = compact(t);
    const hasStake = KEY_STAKE.test(c);
    const hasPotential = KEY_POTENTIAL.test(c);
    const hasCupom = KEY_CUPOM.test(c);
    if (hasStake) diag.hasStakeKeyword = true;
    if (hasPotential) diag.hasPotentialKeyword = true;
    if (hasCupom) diag.hasCupomKeyword = true;
    if (hasStake && !diag.firstStakeSample) diag.firstStakeSample = clip(t);
    if (hasPotential && !diag.firstPotentialSample) diag.firstPotentialSample = clip(t);
    texts.push(t);
  };

  const collectTextsFromDoc = (doc) => {
    if (!doc) return;
    try {
      pushText(String((doc.body && doc.body.innerText) || ''));
    } catch (_) {}

    const panelSel = '[class*="cupom"],[id*="cupom"],[data-testid*="cupom"],[data-qa*="cupom"],[class*="bet-slip"],[class*="betslip"],[class*="coupon"],[class*="ticket"],aside,section,div';
    try {
      const nodes = Array.from(doc.querySelectorAll(panelSel)).slice(0, 320);
      for (const node of nodes) {
        if (!node || node.nodeType !== 1) continue;
        const txt = String(node.innerText || node.textContent || '');
        if (!txt) continue;
        const c = compact(txt);
        if (!/(cupom|coupon|betslip|ticket|aposta|apostado|fazeraposta|pag\.?m.?x|ganho|stake|potential|simples|multiplo|sistema)/.test(c)) continue;
        pushText(txt);
      }
    } catch (_) {}

    try {
      const hosts = Array.from(doc.querySelectorAll('*')).slice(0, 220);
      for (const host of hosts) {
        if (!host || !host.shadowRoot) continue;
        const root = host.shadowRoot;
        pushText(String(root.innerText || root.textContent || ''));
        try {
          const sNodes = Array.from(root.querySelectorAll(panelSel)).slice(0, 180);
          for (const node of sNodes) {
            const txt = String((node && (node.innerText || node.textContent)) || '');
            if (!txt) continue;
            const c = compact(txt);
            if (!/(cupom|coupon|betslip|ticket|aposta|apostado|fazeraposta|pag\.?m.?x|ganho|stake|potential|simples|multiplo|sistema)/.test(c)) continue;
            pushText(txt);
          }
        } catch (_) {}
      }
    } catch (_) {}
  };

  const docs = [];
  const seenDocs = new Set();
  const queue = [];
  try {
    if (document) queue.push(document);
  } catch (_) {}

  while (queue.length && docs.length < 8) {
    const doc = queue.shift();
    if (!doc || seenDocs.has(doc)) continue;
    seenDocs.add(doc);
    docs.push(doc);
    try {
      const frames = Array.from(doc.querySelectorAll('iframe,frame')).slice(0, 12);
      diag.iframeTotal += frames.length;
      for (const fr of frames) {
        try {
          const fdoc = fr && fr.contentDocument ? fr.contentDocument : null;
          if (fdoc) {
            diag.iframeSameOrigin += 1;
            if (!seenDocs.has(fdoc)) queue.push(fdoc);
          } else {
            diag.iframeCrossOrigin += 1;
          }
        } catch (_) {
          diag.iframeCrossOrigin += 1;
        }
      }
    } catch (_) {}
  }

  for (const doc of docs) {
    collectTextsFromDoc(doc);
  }

  for (const txt of texts) {
    const odd = readFromText(txt);
    if (odd) {
      return {
        odd,
        source: 'global-slip-total-cdp',
        href: String(location && location.href ? location.href : ''),
        ts: Date.now(),
        diag,
      };
    }
  }

  return {
    odd: '',
    source: 'global-slip-total-cdp',
    href: String(location && location.href ? location.href : ''),
    ts: Date.now(),
    diag,
  };
})();
`;

app.commandLine.appendSwitch('lang', 'pt-BR');
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');

function installDetachedSessionHardening(sess) {
  if (!sess || detachedSessionHardened) return;
  detachedSessionHardened = true;

  try {
    sess.setPermissionRequestHandler((_webContents, _permission, callback) => callback(true));
  } catch (_) {}

  try {
    sess.setPermissionCheckHandler(() => true);
  } catch (_) {}

  try {
    sess.webRequest.onBeforeSendHeaders((details, callback) => {
      const requestHeaders = { ...(details.requestHeaders || {}) };
      const hasLang = Object.keys(requestHeaders).some((k) => k.toLowerCase() === 'accept-language');
      if (!hasLang) requestHeaders['Accept-Language'] = DETACHED_ACCEPT_LANGUAGE;
      requestHeaders['DNT'] = requestHeaders['DNT'] || '1';
      callback({ requestHeaders });
    });
  } catch (_) {}
}

function shouldForceExternalForUrl(rawUrl) {
  if (DETACHED_EXTERNAL_ALWAYS) return true;
  if (!DETACHED_EXTERNAL_FORCE_DOMAINS.length || !isValidHttpUrl(rawUrl)) return false;
  try {
    const host = new URL(String(rawUrl).trim()).hostname.toLowerCase();
    return DETACHED_EXTERNAL_FORCE_DOMAINS.some(
      (domain) => host === domain || host.endsWith(`.${domain}`)
    );
  } catch (_) {
    return false;
  }
}

function clearDetachedFallbackTimer(sideKey) {
  const timer = pendingDetachedFallbackTimers[sideKey];
  if (timer) clearTimeout(timer);
  pendingDetachedFallbackTimers[sideKey] = null;
}

function scheduleDetachedExternalFallback(sideKey, url, reason = 'timeout') {
  clearDetachedFallbackTimer(sideKey);
  if (!DETACHED_EXTERNAL_FALLBACK_ENABLED || !isValidHttpUrl(url)) return;

  pendingDetachedFallbackTimers[sideKey] = setTimeout(() => {
    const payload = detachedWindowPayload[sideKey];
    const currentUrl = String((payload && payload.link) || url || '').trim();
    if (!isValidHttpUrl(currentUrl)) return;

    shell.openExternal(currentUrl)
      .then(() => {
        logger.write('warn', 'DETACHED_BROWSER', 'Fallback abriu URL no navegador do usuario', {
          side: sideKey,
          url: currentUrl,
          reason,
        });
      })
      .catch((err) => {
        logger.write('error', 'DETACHED_BROWSER', 'Falha no fallback de navegador externo', {
          side: sideKey,
          url: currentUrl,
          reason,
          error: String(err && err.message ? err.message : err),
        });
      });
  }, DETACHED_EXTERNAL_FALLBACK_DELAY_MS);
}

function loadDetachedUrl(sideKey, rawUrl, reason = 'direct') {
  const view = detachedBetViews[sideKey];
  if (!view || view.webContents.isDestroyed()) return;
  const url = String(rawUrl || '').trim();
  if (!isValidHttpUrl(url)) return;

  if (shouldForceExternalForUrl(url)) {
    shell.openExternal(url)
      .then(() => {
        logger.write('warn', 'DETACHED_BROWSER', 'URL aberta direto no navegador do usuario (modo external)', {
          side: sideKey,
          url,
          reason,
        });
      })
      .catch((err) => {
        logger.write('error', 'DETACHED_BROWSER', 'Falha ao abrir URL no navegador do usuario (modo external)', {
          side: sideKey,
          url,
          reason,
          error: String(err && err.message ? err.message : err),
        });
      });
    return;
  }

  scheduleDetachedExternalFallback(sideKey, url, reason);

  try {
    view.webContents.loadURL(url, {
      userAgent: DETACHED_USER_AGENT,
      extraHeaders: `Accept-Language: ${DETACHED_ACCEPT_LANGUAGE}\n`,
    });
  } catch (err) {
    logger.write('error', 'DETACHED_BROWSER', 'Falha ao iniciar loadURL no BrowserView', {
      side: sideKey,
      url,
      reason,
      error: String(err && err.message ? err.message : err),
    });
    scheduleDetachedExternalFallback(sideKey, url, 'loadURL-exception');
  }
}

function normalizeExternalBrowserPref(raw) {
  const txt = String(raw || '').trim().toLowerCase();
  if (!txt) return '';
  if (txt === 'chrome-managed') return 'chrome';
  if (txt === 'msedge') return 'edge';
  if (txt === 'mozilla' || txt === 'mozilla-firefox') return 'firefox';
  if (txt === 'system' || txt === 'chrome' || txt === 'edge' || txt === 'firefox') return txt;
  return '';
}

function chooseExternalBrowser(requestedRaw, defaultRaw) {
  let requested = normalizeExternalBrowserPref(requestedRaw);
  let fallback = normalizeExternalBrowserPref(defaultRaw) || 'chrome';
  if (fallback === 'system') fallback = 'chrome';

  if (!requested) requested = fallback;
  if (DETACHED_FORCE_ISOLATED_BROWSER && requested === 'system') {
    requested = fallback || 'chrome';
    if (requested === 'system') requested = 'chrome';
  }
  return requested || 'chrome';
}

function usesSharedManagedBrowserProfile(browserKind = 'chrome') {
  const safeKind = normalizeExternalBrowserPref(browserKind) || 'chrome';
  return DETACHED_PERSIST_BROWSER_PROFILE
    && DETACHED_SHARED_BROWSER_PROFILE
    && (safeKind === 'chrome' || safeKind === 'edge');
}

function getActiveManagedBrowserProcess(browserKind = 'chrome') {
  const safeKind = normalizeExternalBrowserPref(browserKind) || 'chrome';
  for (const side of ['bet1', 'bet2']) {
    const st = managedChromeState[side];
    if (st && st.browserKind === safeKind && st.process && !st.process.killed) {
      return st.process;
    }
  }
  return null;
}

function getManagedPort(sideKey, browserKind = 'chrome') {
  const side = usesSharedManagedBrowserProfile(browserKind) ? 'bet1' : (sideKey === 'bet2' ? 'bet2' : 'bet1');
  if (browserKind === 'edge') return managedEdgePorts[side];
  return managedChromePorts[side];
}

function resolveManagedBrowserExecutable(browserKind = 'chrome') {
  const safeKind = normalizeExternalBrowserPref(browserKind) || 'chrome';
  if (managedBrowserExecutableResolved[safeKind]) {
    const cached = managedBrowserExecutableCache[safeKind] || '';
    try {
      if (cached && fs.existsSync(cached)) return cached;
    } catch (_) {}
    managedBrowserExecutableCache[safeKind] = '';
    return '';
  }
  managedBrowserExecutableResolved[safeKind] = true;

  const envOverride = String(process.env.DETACHED_EXTERNAL_CHROME_PATH || '').trim();
  const candidates = [];
  if (envOverride && (safeKind === 'chrome' || safeKind === 'edge')) candidates.push(envOverride);

  const localAppData = String(process.env.LOCALAPPDATA || '').trim();
  const programFiles = String(process.env.PROGRAMFILES || '').trim();
  const programFilesX86 = String(process.env['PROGRAMFILES(X86)'] || '').trim();

  if (safeKind === 'chrome') {
    if (localAppData) {
      candidates.push(path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'));
    }
    if (programFiles) {
      candidates.push(path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'));
    }
    if (programFilesX86) {
      candidates.push(path.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'));
    }
  } else if (safeKind === 'edge') {
    if (localAppData) {
      candidates.push(path.join(localAppData, 'Microsoft', 'Edge', 'Application', 'msedge.exe'));
    }
    if (programFiles) {
      candidates.push(path.join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'));
    }
    if (programFilesX86) {
      candidates.push(path.join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'));
    }
  } else if (safeKind === 'firefox') {
    if (programFiles) {
      candidates.push(path.join(programFiles, 'Mozilla Firefox', 'firefox.exe'));
    }
    if (programFilesX86) {
      candidates.push(path.join(programFilesX86, 'Mozilla Firefox', 'firefox.exe'));
    }
  }

  for (const fullPath of candidates) {
    try {
      if (fullPath && fs.existsSync(fullPath)) {
        managedBrowserExecutableCache[safeKind] = fullPath;
        return managedBrowserExecutableCache[safeKind];
      }
    } catch (_) {}
  }

  managedBrowserExecutableCache[safeKind] = '';
  return '';
}

function createDetachedBrowserProcessHandle() {
  return {
    killed: false,
    kill() {
      this.killed = true;
      return true;
    },
  };
}

function getBrowserSpawnCwd(exe) {
  try {
    const dir = path.dirname(String(exe || ''));
    if (dir && fs.existsSync(dir)) return dir;
  } catch (_) {}
  try {
    const home = app.getPath('home');
    if (home && fs.existsSync(home)) return home;
  } catch (_) {}
  return undefined;
}

function launchBrowserExecutable(exe, args = [], meta = {}) {
  const safeArgs = Array.isArray(args) ? args.map((arg) => String(arg)) : [];
  const child = spawn(exe, safeArgs, {
    cwd: getBrowserSpawnCwd(exe),
    detached: false,
    stdio: 'ignore',
    windowsHide: false,
  });
  return { child, detachedLauncher: false };
}

function openInPreferredBrowser(browserKind, rawUrl, options = {}) {
  let safeKind = normalizeExternalBrowserPref(browserKind) || 'system';
  if (DETACHED_FORCE_ISOLATED_BROWSER && safeKind === 'system') safeKind = 'chrome';
  const url = String(rawUrl || '').trim();
  if (!isValidHttpUrl(url)) return false;
  const side = options.side === 'bet2' ? 'bet2' : 'bet1';
  const profileSide = options.profileSide === 'bet2' ? 'bet2' : side;
  const bounds = options.bounds || getDetachedSideBounds(side, { single: !options.side });

  if (safeKind === 'chrome' || safeKind === 'edge') {
    const exe = resolveManagedBrowserExecutable(safeKind);
    if (exe) {
      const x = Number.isFinite(bounds.x) ? Math.floor(bounds.x) : 0;
      const y = Number.isFinite(bounds.y) ? Math.floor(bounds.y) : 0;
      const width = Number.isFinite(bounds.width) ? Math.max(480, Math.floor(bounds.width)) : 960;
      const height = Number.isFinite(bounds.height) ? Math.max(520, Math.floor(bounds.height)) : 900;
      const profileDir = getManagedChromeProfileDir(`${safeKind}-fallback-${profileSide}`);
      const args = [
        '--new-window',
        `--user-data-dir=${profileDir}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-features=TranslateUI',
        `--window-position=${x},${y}`,
        `--window-size=${width},${height}`,
        url,
      ];
      if (options.remoteDebugging) {
        args.splice(2, 0, `--remote-debugging-port=${getManagedPort(side, safeKind)}`);
      }
      try {
        const { child } = launchBrowserExecutable(exe, args, {
          browserKind: safeKind,
          url,
          mode: 'preferred',
        });
        child.on('error', (err) => {
          logger.write('warn', 'DETACHED_BROWSER', 'Falha ao abrir navegador preferido', {
            browserKind: safeKind,
            exe,
            url,
            error: String(err && err.message ? err.message : err),
          });
          try {
            shell.openExternal(url).catch(() => {});
          } catch (_) {}
        });
        return true;
      } catch (_) {}
    }
  }

  if (safeKind === 'firefox') {
    const exe = resolveManagedBrowserExecutable('firefox');
    if (exe) {
      const profileDir = getManagedChromeProfileDir(`firefox-fallback-${profileSide}`);
      try {
        const child = spawn(exe, ['-new-instance', '-profile', profileDir, '-new-window', url], {
          cwd: getBrowserSpawnCwd(exe),
          detached: false,
          stdio: 'ignore',
          windowsHide: false,
        });
        child.on('error', (err) => {
          logger.write('warn', 'DETACHED_BROWSER', 'Falha ao abrir Firefox preferido', {
            exe,
            url,
            error: String(err && err.message ? err.message : err),
          });
          try {
            shell.openExternal(url).catch(() => {});
          } catch (_) {}
        });
        return true;
      } catch (_) {}
    }
  }

  shell.openExternal(url).catch(() => {});
  return true;
}

function getDetachedLayoutRects() {
  const workArea = getTargetWorkArea();
  const fallback = {
    workArea,
    dashboardBounds: null,
    browserBounds: { ...workArea },
  };

  if (!DETACHED_SIDEBAR_MODE || !mainWindow || mainWindow.isDestroyed()) {
    return fallback;
  }

  const maxSidebar = Math.max(300, Math.floor(workArea.width * 0.45));
  const sidebarWidth = Math.max(300, Math.min(DETACHED_SIDEBAR_WIDTH, maxSidebar));
  const remainingWidth = Math.max(0, workArea.width - sidebarWidth);
  if (remainingWidth < DETACHED_MIN_BROWSER_WIDTH) {
    return fallback;
  }

  return {
    workArea,
    dashboardBounds: {
      x: workArea.x,
      y: workArea.y,
      width: sidebarWidth,
      height: workArea.height,
    },
    browserBounds: {
      x: workArea.x + sidebarWidth,
      y: workArea.y,
      width: remainingWidth,
      height: workArea.height,
    },
  };
}

function getDetachedSideBounds(sideKey, options = {}) {
  const single = Boolean(options.single);
  const layout = getDetachedLayoutRects();
  const area = layout.browserBounds || layout.workArea;
  // Layout colado (sem vãos): ocupa 100% da área disponível à direita do painel.
  const safeX = Math.floor(area.x);
  const safeY = Math.floor(area.y);
  const safeWidth = Math.max(1, Math.floor(area.width));
  const safeHeight = Math.max(1, Math.floor(area.height));
  // Compensação de moldura/sombra do Chrome no Windows para evitar "frestas" visuais.
  const FRAME_SEAM_OVERLAP_X = 10;
  const RIGHT_EDGE_BLEED_X = 12;
  const seamOverlap = Math.max(0, Math.min(FRAME_SEAM_OVERLAP_X, Math.floor(safeWidth * 0.06)));
  const rightBleed = Math.max(0, RIGHT_EDGE_BLEED_X);

  if (single) {
    return { x: safeX, y: safeY, width: safeWidth + rightBleed, height: safeHeight };
  }

  // Split fixo 50/50 para as duas casas.
  const leftWidth = Math.floor(safeWidth / 2);
  const rightWidth = safeWidth - leftWidth;

  if (sideKey === 'bet2') {
    return {
      x: safeX + leftWidth - seamOverlap,
      y: safeY,
      width: rightWidth + seamOverlap + rightBleed,
      height: safeHeight,
    };
  }
  return { x: safeX, y: safeY, width: leftWidth + seamOverlap, height: safeHeight };
}

function applySidebarMainWindowLayout() {
  if (!DETACHED_SIDEBAR_MODE || !mainWindow || mainWindow.isDestroyed()) return;
  const layout = getDetachedLayoutRects();
  const dashboardBounds = layout.dashboardBounds;
  if (!dashboardBounds) return;

  try {
    if (!sidebarMainWindowApplied) {
      sidebarMainWindowBackup = {
        wasMaximized: mainWindow.isMaximized(),
        bounds: mainWindow.getBounds(),
      };
    }

    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    }

    mainWindow.setBounds({
      x: Math.floor(dashboardBounds.x),
      y: Math.floor(dashboardBounds.y),
      width: Math.max(300, Math.floor(dashboardBounds.width)),
      height: Math.max(600, Math.floor(dashboardBounds.height)),
    }, false);
    mainWindow.show();
    sidebarMainWindowApplied = true;
  } catch (_) {}
}

function restoreMainWindowFromSidebarLayout() {
  if (!mainWindow || mainWindow.isDestroyed() || !sidebarMainWindowApplied) return;
  const backup = sidebarMainWindowBackup;
  sidebarMainWindowApplied = false;
  sidebarMainWindowBackup = null;
  if (!backup) return;

  try {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    if (backup.wasMaximized) {
      mainWindow.maximize();
      return;
    }
    const bounds = backup.bounds;
    if (bounds && bounds.width > 0 && bounds.height > 0) {
      mainWindow.setBounds(bounds, false);
    }
  } catch (_) {}
}

function getManagedChromeProfileDir(sideKey) {
  const rawKey = String(sideKey || 'chrome').toLowerCase();
  const browserKind = rawKey.includes('edge')
    ? 'edge'
    : (rawKey.includes('firefox') ? 'firefox' : 'chrome');
  const baseUserDataDir = DETACHED_PERSIST_BROWSER_PROFILE
    ? path.join(app.getPath('userData'), 'browser-profile')
    : path.join(app.getPath('userData'), 'detached-external-chrome', managedProfileRunTag);
  const profileName = usesSharedManagedBrowserProfile(browserKind)
    ? browserKind
    : rawKey;
  const profileDir = path.join(baseUserDataDir, profileName);
  try {
    fs.mkdirSync(profileDir, { recursive: true });
  } catch (_) {}
  return profileDir;
}

function spawnManagedChromeWindow(sideKey, initialUrl, bounds, browserKind = 'chrome') {
  const side = sideKey === 'bet2' ? 'bet2' : 'bet1';
  const safeKind = normalizeExternalBrowserPref(browserKind) === 'edge' ? 'edge' : 'chrome';
  const url = isValidHttpUrl(initialUrl) ? String(initialUrl).trim() : 'about:blank';
  const exe = resolveManagedBrowserExecutable(safeKind);
  if (!exe) return false;

  const state = managedChromeState[side];
  const sharedProfile = usesSharedManagedBrowserProfile(safeKind);
  const sharedProcess = sharedProfile ? getActiveManagedBrowserProcess(safeKind) : null;
  if (state.process && !state.process.killed) {
    const needsNewSharedWindow = sharedProfile && !state.targetId && isValidHttpUrl(url);
    if (state.browserKind === safeKind && !needsNewSharedWindow) return true;
    if (sharedProfile && needsNewSharedWindow) {
      // Abre uma nova janela no mesmo perfil, sem encerrar o Chrome compartilhado.
    } else {
      try {
        state.process.kill();
      } catch (_) {}
      state.process = null;
    }
  } else if (sharedProcess) {
    state.process = sharedProcess;
    state.browserKind = safeKind;
  }

  if (!sharedProfile && state.process && !state.process.killed && state.browserKind !== safeKind) {
    try {
      state.process.kill();
    } catch (_) {}
    state.process = null;
  }

  const area = bounds || getDetachedSideBounds(side);
  const x = Number.isFinite(area.x) ? Math.floor(area.x) : 0;
  const y = Number.isFinite(area.y) ? Math.floor(area.y) : 0;
  const width = Number.isFinite(area.width) ? Math.max(480, Math.floor(area.width)) : 960;
  const height = Number.isFinite(area.height) ? Math.max(520, Math.floor(area.height)) : 900;
  const profileDir = getManagedChromeProfileDir(sharedProfile ? safeKind : `${safeKind}-${side}`);
  const remotePort = getManagedPort(side, safeKind);

  const args = [
    '--new-window',
    `--user-data-dir=${profileDir}`,
    `--remote-debugging-port=${remotePort}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-features=TranslateUI',
    `--window-position=${x},${y}`,
    `--window-size=${width},${height}`,
    url,
  ];

  try {
    const launch = launchBrowserExecutable(exe, args, {
      side,
      browserKind: safeKind,
      url,
      mode: 'managed',
    });
    const child = launch.child;
    const processRef = sharedProcess || (launch.detachedLauncher
      ? createDetachedBrowserProcessHandle()
      : child);
    state.process = processRef;
    state.profileDir = profileDir;
    state.lastUrl = url;
    state.browserKind = safeKind;
    if (sharedProfile && !sharedProcess) {
      ['bet1', 'bet2'].forEach((managedSide) => {
        const st = managedChromeState[managedSide];
        if (!st.process || st.process.killed) st.process = processRef;
        st.profileDir = profileDir;
        st.browserKind = safeKind;
      });
    }
    if (!launch.detachedLauncher) {
      child.on('exit', () => {
        const affectedSides = sharedProfile ? ['bet1', 'bet2'] : [side];
        affectedSides.forEach((managedSide) => {
          if (managedChromeState[managedSide].process === child) {
            managedChromeState[managedSide].process = null;
            managedChromeState[managedSide].targetId = '';
          }
        });
      });
    }
    child.on('error', (err) => {
      const affectedSides = sharedProfile ? ['bet1', 'bet2'] : [side];
      affectedSides.forEach((managedSide) => {
        if (managedChromeState[managedSide].process === processRef) {
          managedChromeState[managedSide].process = null;
          managedChromeState[managedSide].targetId = '';
        }
      });
      logger.write('warn', 'DETACHED_BROWSER', 'Falha ao iniciar navegador gerenciado', {
        side,
        browserKind: safeKind,
        exe,
        url,
        error: String(err && err.message ? err.message : err),
      });
    });
    return true;
  } catch (err) {
    logger.write('error', 'DETACHED_BROWSER', 'Falha ao abrir Chrome gerenciado', {
      side,
      url,
      error: String(err && err.message ? err.message : err),
    });
    return false;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(1, Number(ms) || 1)));
}

async function fetchJsonWithTimeout(url, timeoutMs = 3000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(500, timeoutMs));
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJsonWithTimeoutMethod(url, timeoutMs = 3000, method = 'GET') {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(500, timeoutMs));
  try {
    const res = await fetch(url, { signal: controller.signal, method });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function waitManagedChromeDebugger(sideKey, timeoutMs = 12000, browserKind = 'chrome') {
  const side = sideKey === 'bet2' ? 'bet2' : 'bet1';
  const port = getManagedPort(side, browserKind);
  const endAt = Date.now() + Math.max(2000, timeoutMs);
  while (Date.now() < endAt) {
    try {
      await fetchJsonWithTimeout(`http://127.0.0.1:${port}/json/version`, 1500);
      return true;
    } catch (_) {
      await sleep(250);
    }
  }
  return false;
}

function parseUrlSafe(rawUrl) {
  try {
    const txt = String(rawUrl || '').trim();
    if (!txt) return null;
    return new URL(txt);
  } catch (_) {
    return null;
  }
}

function normalizeHostForOddSync(rawUrl) {
  const parsed = parseUrlSafe(rawUrl);
  if (!parsed || !/^https?:$/i.test(String(parsed.protocol || ''))) return '';
  return String(parsed.hostname || '').trim().toLowerCase().replace(/^www\./, '');
}

function hostsMatchForOddSync(leftUrl, rightUrl) {
  const leftHost = normalizeHostForOddSync(leftUrl);
  const rightHost = normalizeHostForOddSync(rightUrl);
  if (!leftHost || !rightHost) return false;
  return leftHost === rightHost
    || leftHost.endsWith(`.${rightHost}`)
    || rightHost.endsWith(`.${leftHost}`);
}

function isInternalChromeTargetUrl(rawUrl) {
  const txt = String(rawUrl || '').trim().toLowerCase();
  return !txt
    || txt === 'about:blank'
    || txt.startsWith('chrome://')
    || txt.startsWith('devtools://')
    || txt.startsWith('edge://');
}

function isTargetUrlCompatibleWithDesired(targetUrlRaw, desiredUrlRaw) {
  const desiredHost = normalizeHostForOddSync(desiredUrlRaw);
  if (!desiredHost) return true;
  const targetUrl = String(targetUrlRaw || '').trim();
  if (isInternalChromeTargetUrl(targetUrl)) return true;
  return hostsMatchForOddSync(targetUrl, desiredUrlRaw);
}

function isSnapshotCompatibleWithExpected(snapshot, expectedUrl) {
  const expectedHost = normalizeHostForOddSync(expectedUrl);
  if (!expectedHost) return true;
  const observedUrl = String(
    (snapshot && snapshot.href)
      || (snapshot && snapshot.diag && (snapshot.diag.observedHref || snapshot.diag.targetUrl))
      || ''
  ).trim();
  if (!observedUrl || isInternalChromeTargetUrl(observedUrl)) return true;
  return hostsMatchForOddSync(observedUrl, expectedUrl);
}

function extractLikelyEventId(rawUrl) {
  const txt = String(rawUrl || '').trim();
  if (!txt) return '';
  const matches = txt.match(/(\d{6,})/g);
  if (!matches || !matches.length) return '';
  return String(matches[matches.length - 1] || '');
}

function scoreTargetAgainstDesired(targetUrlRaw, desiredUrlRaw) {
  const targetUrl = parseUrlSafe(targetUrlRaw);
  const desiredUrl = parseUrlSafe(desiredUrlRaw);
  if (!targetUrl) return -1;
  let score = 1;
  if (String(targetUrl.protocol || '').startsWith('http')) score += 5;
  if (!desiredUrl) return score;

  const tNorm = `${targetUrl.origin}${targetUrl.pathname}`.replace(/\/+$/, '').toLowerCase();
  const dNorm = `${desiredUrl.origin}${desiredUrl.pathname}`.replace(/\/+$/, '').toLowerCase();
  if (tNorm && dNorm && tNorm === dNorm) score += 1000;

  if (targetUrl.hostname.toLowerCase() === desiredUrl.hostname.toLowerCase()) score += 200;

  const tPath = (targetUrl.pathname || '').toLowerCase();
  const dPath = (desiredUrl.pathname || '').toLowerCase();
  if (tPath && dPath && tPath === dPath) score += 200;
  else if (tPath && dPath && (tPath.includes(dPath) || dPath.includes(tPath))) score += 120;

  const tEventId = extractLikelyEventId(targetUrl.href);
  const dEventId = extractLikelyEventId(desiredUrl.href);
  if (tEventId && dEventId && tEventId === dEventId) score += 350;

  return score;
}

async function getManagedChromePageTarget(sideKey, browserKind = 'chrome', desiredUrl = '') {
  const side = sideKey === 'bet2' ? 'bet2' : 'bet1';
  const state = managedChromeState[side] || {};
  const targets = await getManagedChromeTargets(side, browserKind);
  const pages = targets.filter((t) => t && t.type === 'page');

  const currentTargetId = String(state.targetId || '');
  if (currentTargetId) {
    const current = pages.find((t) => String(t.id || '') === currentTargetId);
    if (
      current
      && current.webSocketDebuggerUrl
      && isTargetUrlCompatibleWithDesired(String(current.url || ''), desiredUrl)
    ) return current;
    state.targetId = '';
  }

  let target = null;
  if (pages.length) {
    const otherTargetIds = new Set(
      ['bet1', 'bet2']
        .filter((key) => key !== side)
        .map((key) => String((managedChromeState[key] && managedChromeState[key].targetId) || ''))
        .filter(Boolean)
    );
    const preferredPages = pages.filter((item) => !otherTargetIds.has(String(item.id || '')));
    const pool = preferredPages.length
      ? preferredPages
      : (usesSharedManagedBrowserProfile(browserKind) && otherTargetIds.size ? [] : pages);
    const ranked = pool
      .filter((item) => isTargetUrlCompatibleWithDesired(String(item.url || ''), desiredUrl))
      .map((item) => ({
        item,
        score: scoreTargetAgainstDesired(String(item.url || ''), desiredUrl),
      }))
      .sort((a, b) => b.score - a.score);
    target = ranked[0] ? ranked[0].item : null;
  }

  if (!target) {
    if (usesSharedManagedBrowserProfile(browserKind) && isValidHttpUrl(desiredUrl)) {
      target = await createManagedChromeWindowTarget(
        side,
        desiredUrl,
        getDetachedSideBounds(side),
        browserKind
      ).catch(() => null);
    }
  }

  if (!target) {
    const port = getManagedPort(side, browserKind);
    const newUrl = `http://127.0.0.1:${port}/json/new?${encodeURIComponent('about:blank')}`;
    try {
      target = await fetchJsonWithTimeoutMethod(newUrl, 2500, 'PUT');
    } catch (_) {
      try {
        target = await fetchJsonWithTimeout(newUrl, 2500);
      } catch (_) {
        target = null;
      }
    }
  }

  if (target && target.webSocketDebuggerUrl) {
    managedChromeState[side].targetId = String(target.id || '');
    return target;
  }
  return null;
}

async function getManagedChromeTargets(sideKey, browserKind = 'chrome') {
  const side = sideKey === 'bet2' ? 'bet2' : 'bet1';
  const port = getManagedPort(side, browserKind);
  const listUrl = `http://127.0.0.1:${port}/json/list`;
  let targets = [];
  try {
    targets = await fetchJsonWithTimeout(listUrl, 2500);
  } catch (_) {
    targets = [];
  }
  if (!Array.isArray(targets)) targets = [];
  return targets.filter((t) => t && t.webSocketDebuggerUrl);
}

async function findManagedChromeTargetForUrl(sideKey, desiredUrl = '', browserKind = 'chrome', attempts = 6, delayMs = 180) {
  const side = sideKey === 'bet2' ? 'bet2' : 'bet1';
  const desired = String(desiredUrl || '').trim();
  for (let attempt = 0; attempt < Math.max(1, Number(attempts) || 1); attempt += 1) {
    const targets = await getManagedChromeTargets(side, browserKind).catch(() => []);
    const pages = (Array.isArray(targets) ? targets : [])
      .filter((target) => target && target.type === 'page' && target.id && target.webSocketDebuggerUrl);
    const ranked = pages
      .filter((target) => isTargetUrlCompatibleWithDesired(String(target.url || ''), desired))
      .map((target) => ({
        target,
        score: scoreTargetAgainstDesired(String(target.url || ''), desired),
      }))
      .sort((a, b) => b.score - a.score);
    const hit = ranked[0] ? ranked[0].target : null;
    if (hit && hit.webSocketDebuggerUrl) {
      managedChromeState[side].targetId = String(hit.id || '');
      return hit;
    }
    if (attempt < attempts - 1) await sleep(delayMs);
  }
  return null;
}

async function createManagedChromeWindowTarget(sideKey, url, bounds = null, browserKind = 'chrome') {
  const side = sideKey === 'bet2' ? 'bet2' : 'bet1';
  const targetUrl = isValidHttpUrl(url) ? String(url).trim() : 'about:blank';
  const sideBounds = bounds || getDetachedSideBounds(side);
  const baseTarget = (await getManagedChromeTargets(side, browserKind))
    .find((item) => item && item.webSocketDebuggerUrl);
  if (!baseTarget) return null;

  const created = await withManagedChromeCdpTarget(baseTarget, async (cdp) => {
    return cdp('Target.createTarget', {
      url: targetUrl,
      newWindow: true,
      background: false,
      left: Math.floor(sideBounds.x),
      top: Math.floor(sideBounds.y),
      width: Math.max(480, Math.floor(sideBounds.width)),
      height: Math.max(520, Math.floor(sideBounds.height)),
    }, 7000);
  }).catch(() => null);

  const targetId = String(created && created.targetId ? created.targetId : '');
  if (!targetId) return null;
  managedChromeState[side].targetId = targetId;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const target = (await getManagedChromeTargets(side, browserKind))
      .find((item) => String(item.id || '') === targetId);
    if (target && target.webSocketDebuggerUrl) return target;
    await sleep(150);
  }
  return null;
}

async function closeExtraSharedManagedChromeTargets(browserKind = 'chrome', options = {}) {
  if (!usesSharedManagedBrowserProfile(browserKind)) return;

  const attempts = Math.max(1, Number(options && options.attempts) || 1);
  const delayMs = Math.max(50, Number(options && options.delayMs) || 250);

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    for (const side of ['bet1', 'bet2']) {
      const st = managedChromeState[side];
      if (!st || String(st.targetId || '')) continue;
      const lastUrl = String(st.lastUrl || '').trim();
      if (!isValidHttpUrl(lastUrl)) continue;
      await findManagedChromeTargetForUrl(side, lastUrl, browserKind, 2, 120).catch(() => null);
    }

    const keepTargetIds = new Set(
      ['bet1', 'bet2']
        .map((side) => String((managedChromeState[side] && managedChromeState[side].targetId) || ''))
        .filter(Boolean)
    );
    if (!keepTargetIds.size) return;

    let pages = [];
    try {
      pages = (await getManagedChromeTargets('bet1', browserKind))
        .filter((target) => target && target.type === 'page' && target.id && target.webSocketDebuggerUrl);
    } catch (_) {
      pages = [];
    }
    if (pages.length <= keepTargetIds.size) {
      if (attempt < attempts - 1) await sleep(delayMs);
      continue;
    }

    const extras = pages.filter((target) => !keepTargetIds.has(String(target.id || '')));
    if (!extras.length) {
      if (attempt < attempts - 1) await sleep(delayMs);
      continue;
    }

    const controller = pages.find((target) => keepTargetIds.has(String(target.id || '')))
      || pages[0];
    if (!controller) return;

    await withManagedChromeCdpTarget(controller, async (cdp) => {
      for (const target of extras) {
        const targetId = String(target.id || '');
        if (!targetId) continue;
        await cdp('Target.closeTarget', { targetId }, 2500).catch(() => {});
      }
    }).then(() => {
      logger.write('info', 'DETACHED_BROWSER', 'Guias extras fechadas no Chrome compartilhado', {
        browserKind,
        closed: extras.length,
        kept: Array.from(keepTargetIds),
        attempt: attempt + 1,
      });
    }).catch((err) => {
      logger.write('warn', 'DETACHED_BROWSER', 'Nao foi possivel fechar guias extras do Chrome compartilhado', {
        browserKind,
        error: String(err && err.message ? err.message : err),
      });
    });

    if (attempt < attempts - 1) await sleep(delayMs);
  }
}

async function withManagedChromeCdpTarget(target, runner) {
  if (!target || !target.webSocketDebuggerUrl) throw new Error('CDP target indisponivel');
  if (typeof WebSocket !== 'function') throw new Error('WebSocket indisponivel neste runtime');

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map();
  let seq = 0;

  const closeSafely = () => {
    try {
      ws.close();
    } catch (_) {}
  };

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout conectando CDP')), 7000);
    ws.onopen = () => {
      clearTimeout(timer);
      resolve();
    };
    ws.onerror = () => {
      clearTimeout(timer);
      reject(new Error('Erro de conexao CDP'));
    };
  });

  ws.onmessage = (evt) => {
    try {
      const msg = JSON.parse(String(evt.data || '{}'));
      if (!msg || typeof msg.id !== 'number') return;
      const waiter = pending.get(msg.id);
      if (!waiter) return;
      pending.delete(msg.id);
      if (msg.error) waiter.reject(new Error(String(msg.error.message || 'CDP error')));
      else waiter.resolve(msg.result || {});
    } catch (_) {}
  };

  const send = (method, params = {}, timeoutMs = 7000) => new Promise((resolve, reject) => {
    const id = ++seq;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Timeout CDP: ${method}`));
    }, Math.max(500, timeoutMs));
    pending.set(id, {
      resolve: (result) => {
        clearTimeout(timer);
        resolve(result || {});
      },
      reject: (err) => {
        clearTimeout(timer);
        reject(err);
      },
    });
    ws.send(JSON.stringify({ id, method, params }));
  });

  try {
    return await runner(send, target);
  } finally {
    closeSafely();
  }
}

async function withManagedChromeCdp(sideKey, runner, browserKind = 'chrome', desiredUrl = '') {
  const target = await getManagedChromePageTarget(sideKey, browserKind, desiredUrl);
  return withManagedChromeCdpTarget(target, runner);
}

async function applyManagedChromePageZoom(cdp, sideKey = 'bet1', url = '') {
  if (!DETACHED_MANAGED_CHROME_ZOOM_ENABLED) return false;
  try {
    await cdp('Emulation.setPageScaleFactor', {
      pageScaleFactor: DETACHED_MANAGED_CHROME_ZOOM,
    }, 2500);
    return true;
  } catch (err) {
    logger.write('warn', 'DETACHED_BROWSER', 'Nao foi possivel aplicar zoom na guia gerenciada', {
      side: sideKey === 'bet2' ? 'bet2' : 'bet1',
      zoom: DETACHED_MANAGED_CHROME_ZOOM,
      url: String(url || '').trim(),
      error: String(err && err.message ? err.message : err),
    });
    return false;
  }
}

async function setManagedChromeWindowState(sideKey, stateName, bounds = null, browserKind = 'chrome') {
  const side = sideKey === 'bet2' ? 'bet2' : 'bet1';
  const ok = await waitManagedChromeDebugger(side, 2500, browserKind);
  if (!ok) return false;

  try {
    await withManagedChromeCdp(side, async (cdp) => {
      const info = await cdp('Browser.getWindowForTarget', {});
      if (!info || !Number.isFinite(info.windowId)) return;
      if (stateName === 'minimized') {
        await cdp('Browser.setWindowBounds', {
          windowId: info.windowId,
          bounds: { windowState: 'minimized' },
        });
        return;
      }

      const sideBounds = bounds || getDetachedSideBounds(side);
      await cdp('Browser.setWindowBounds', {
        windowId: info.windowId,
        bounds: {
          windowState: 'normal',
          left: Math.floor(sideBounds.x),
          top: Math.floor(sideBounds.y),
          width: Math.max(480, Math.floor(sideBounds.width)),
          height: Math.max(520, Math.floor(sideBounds.height)),
        },
      });
    }, browserKind, managedChromeState[side].lastUrl || '');
    return true;
  } catch (_) {
    return false;
  }
}

async function setManagedChromeWindowBoundsForUrl(sideKey, url, bounds, browserKind = 'chrome') {
  const side = sideKey === 'bet2' ? 'bet2' : 'bet1';
  const sideBounds = bounds || getDetachedSideBounds(side);
  try {
    await withManagedChromeCdp(side, async (cdp) => {
      await cdp('Page.enable', {}).catch(() => {});
      await cdp('Page.bringToFront', {}).catch(() => {});
      const info = await cdp('Browser.getWindowForTarget', {}).catch(() => null);
      if (!info || !Number.isFinite(info.windowId)) return;
      await cdp('Browser.setWindowBounds', {
        windowId: info.windowId,
        bounds: {
          windowState: 'normal',
          left: Math.floor(sideBounds.x),
          top: Math.floor(sideBounds.y),
          width: Math.max(480, Math.floor(sideBounds.width)),
          height: Math.max(520, Math.floor(sideBounds.height)),
        },
      });
    }, browserKind, String(url || '').trim());
    return true;
  } catch (err) {
    logger.write('warn', 'DETACHED_BROWSER', 'Nao foi possivel posicionar janela compartilhada', {
      side,
      url,
      error: String(err && err.message ? err.message : err),
    });
    return false;
  }
}

async function restartManagedChromeWindow(sideKey, url, bounds = null, browserKind = 'chrome') {
  const side = sideKey === 'bet2' ? 'bet2' : 'bet1';
  const safeKind = normalizeExternalBrowserPref(browserKind) === 'edge' ? 'edge' : 'chrome';
  managedChromeState[side] = managedChromeState[side] || {};
  const state = managedChromeState[side];
  if (usesSharedManagedBrowserProfile(safeKind) && getActiveManagedBrowserProcess(safeKind)) {
    state.targetId = '';
    await sleep(280);
    return spawnManagedChromeWindow(side, url, bounds || getDetachedSideBounds(side), safeKind);
  }
  if (state.process && !state.process.killed) {
    try {
      state.process.kill();
    } catch (_) {}
  }
  state.process = null;
  state.targetId = '';
  await sleep(280);
  return spawnManagedChromeWindow(side, url, bounds || getDetachedSideBounds(side), safeKind);
}

async function navigateManagedChromeSide(sideKey, url, bounds = null, browserKind = 'chrome') {
  const side = sideKey === 'bet2' ? 'bet2' : 'bet1';
  if (!isValidHttpUrl(url)) return false;
  const targetBounds = bounds || getDetachedSideBounds(side);
  const alreadyReady = await waitManagedChromeDebugger(side, 1200, browserKind);
  const sharedProfile = usesSharedManagedBrowserProfile(browserKind);
  const needsSharedWindow = usesSharedManagedBrowserProfile(browserKind)
    && !String((managedChromeState[side] && managedChromeState[side].targetId) || '');
  let openedWithSpawn = false;

  if (!alreadyReady) {
    if (!spawnManagedChromeWindow(side, url, targetBounds, browserKind)) return false;
    openedWithSpawn = true;
  }
  const ready = alreadyReady || await waitManagedChromeDebugger(side, 12000, browserKind);
  if (!ready) {
    await restartManagedChromeWindow(side, url, targetBounds, browserKind);
    managedChromeState[side].lastUrl = String(url).trim();
    if (usesSharedManagedBrowserProfile(browserKind)) {
      await findManagedChromeTargetForUrl(side, url, browserKind, 12, 220).catch(() => null);
    }
    await withManagedChromeCdp(side, async (cdp) => {
      await applyManagedChromePageZoom(cdp, side, url).catch(() => false);
    }, browserKind, String(url).trim()).catch(() => {});
    return true;
  }

  try {
    if (sharedProfile && needsSharedWindow && !openedWithSpawn) {
      const created = await createManagedChromeWindowTarget(side, url, targetBounds, browserKind);
      if (!created) {
        logger.write('warn', 'DETACHED_BROWSER', 'Nao foi possivel criar janela no Chrome compartilhado via CDP', {
          side,
          browserKind,
          url,
        });
      }
    }

    await withManagedChromeCdp(side, async (cdp) => {
      await cdp('Page.enable', {}).catch(() => {});
      await cdp('Runtime.enable', {}).catch(() => {});
      await cdp('Page.navigate', { url: String(url).trim() }, 10000);
      await applyManagedChromePageZoom(cdp, side, url).catch(() => false);
      await cdp('Page.bringToFront', {}).catch(() => {});
      const info = await cdp('Browser.getWindowForTarget', {}).catch(() => null);
      if (info && Number.isFinite(info.windowId)) {
        await cdp('Browser.setWindowBounds', {
          windowId: info.windowId,
          bounds: {
            windowState: 'normal',
            left: Math.floor(targetBounds.x),
            top: Math.floor(targetBounds.y),
            width: Math.max(480, Math.floor(targetBounds.width)),
            height: Math.max(520, Math.floor(targetBounds.height)),
          },
        }).catch(() => {});
      }
    }, browserKind, String(url).trim());
    managedChromeState[side].lastUrl = String(url).trim();
    return true;
  } catch (err) {
    logger.write('warn', 'DETACHED_BROWSER', 'CDP navigate falhou no Chrome gerenciado', {
      side,
      url,
      error: String(err && err.message ? err.message : err),
    });
    await restartManagedChromeWindow(side, url, targetBounds, browserKind);
    managedChromeState[side].lastUrl = String(url).trim();
    if (sharedProfile) {
      await findManagedChromeTargetForUrl(side, url, browserKind, 12, 220).catch(() => null);
      await closeExtraSharedManagedChromeTargets(browserKind, { attempts: 2, delayMs: 250 }).catch(() => {});
    }
    await withManagedChromeCdp(side, async (cdp) => {
      await applyManagedChromePageZoom(cdp, side, url).catch(() => false);
    }, browserKind, String(url).trim()).catch(() => {});
    return true;
  }
}

async function openDetachedExternally(link1, link2, options = {}) {
  const has1 = isValidHttpUrl(link1);
  const has2 = isValidHttpUrl(link2);
  if (!has1 && !has2) return;
  const bookmaker1 = String(options.bookmaker1 || '').trim();
  const bookmaker2 = String(options.bookmaker2 || '').trim();
  const event1 = String(options.event1 || '').trim();
  const event2 = String(options.event2 || '').trim();
  const externalPayload1 = buildDetachedPayload('bet1', link1, bookmaker1, event1);
  const externalPayload2 = buildDetachedPayload('bet2', link2, bookmaker2, event2);
  detachedWindowPayload.bet1 = externalPayload1;
  detachedWindowPayload.bet2 = externalPayload2;

  const selectedBrowser = chooseExternalBrowser(
    options.browserPref || '',
    DETACHED_EXTERNAL_BROWSER || ''
  );
  const hasTrackedOddSync = isTrackedOddSyncUrl(link1)
    || isTrackedOddSyncUrl(link2)
    || isTrackedOddSyncPayload(externalPayload1)
    || isTrackedOddSyncPayload(externalPayload2);
  let useManaged = hasTrackedOddSync || selectedBrowser === 'chrome' || selectedBrowser === 'edge';
  let managedKind = selectedBrowser === 'edge' && !hasTrackedOddSync ? 'edge' : 'chrome';
  if (useManaged && !resolveManagedBrowserExecutable(managedKind)) {
    const altKind = managedKind === 'edge' ? 'chrome' : 'edge';
    if (resolveManagedBrowserExecutable(altKind)) {
      managedKind = altKind;
    } else {
      useManaged = false;
      logger.write('warn', 'DETACHED_BROWSER', 'Navegador gerenciado indisponivel; usando navegador padrao', {
        selectedBrowser,
        link1: has1 ? link1 : '',
        link2: has2 ? link2 : '',
      });
    }
  }

  if (useManaged) {
    applySidebarMainWindowLayout();
    const leftBounds = getDetachedSideBounds('bet1');
    const rightBounds = getDetachedSideBounds('bet2');
    const fullBounds = getDetachedSideBounds('bet1', { single: true });

    if (usesSharedManagedBrowserProfile(managedKind)) {
      logger.write('info', 'DETACHED_BROWSER', 'Abrindo navegador com perfil compartilhado do Octosure', {
        managedKind,
        has1,
        has2,
        profileDir: getManagedChromeProfileDir(managedKind),
      });

      let ok1 = true;
      let ok2 = true;
      if (has1 && has2) {
        ok1 = await navigateManagedChromeSide('bet1', link1, leftBounds, managedKind);
        ok2 = await navigateManagedChromeSide('bet2', link2, rightBounds, managedKind);
      } else if (has1) {
        ok1 = await navigateManagedChromeSide('bet1', link1, fullBounds, managedKind);
        managedChromeState.bet2.targetId = '';
      } else if (has2) {
        ok2 = await navigateManagedChromeSide('bet1', link2, fullBounds, managedKind);
        managedChromeState.bet2.targetId = '';
      }
      if ((has1 && !ok1) || (has2 && !ok2)) {
        logger.write('warn', 'DETACHED_BROWSER', 'Falha ao reaproveitar guia do Chrome compartilhado', {
          managedKind,
          link1: has1 ? link1 : '',
          link2: has2 ? link2 : '',
          ok1,
          ok2,
        });
      }
      await closeExtraSharedManagedChromeTargets(managedKind, { attempts: 4, delayMs: 350 });
      keepDashboardAboveBrowsers();
      return;
    }

    let ok1 = true;
    let ok2 = true;
    if (has1 && has2) {
      [ok1, ok2] = await Promise.all([
        navigateManagedChromeSide('bet1', link1, leftBounds, managedKind),
        navigateManagedChromeSide('bet2', link2, rightBounds, managedKind),
      ]);
    } else if (has1) {
      ok1 = await navigateManagedChromeSide('bet1', link1, fullBounds, managedKind);
    } else if (has2) {
      ok2 = await navigateManagedChromeSide('bet2', link2, fullBounds, managedKind);
    }

    if ((has1 && !ok1) || (has2 && !ok2)) {
      if (hasTrackedOddSync) {
        const altKind = managedKind === 'edge' ? 'chrome' : 'edge';
        if (has1 && !ok1) {
          ok1 = await navigateManagedChromeSide('bet1', link1, has2 ? leftBounds : fullBounds, altKind);
        }
        if (has2 && !ok2) {
          ok2 = await navigateManagedChromeSide('bet2', link2, has1 ? rightBounds : fullBounds, altKind);
        }
      }

      if ((has1 && !ok1) || (has2 && !ok2)) {
        if (hasTrackedOddSync) {
          logger.write('error', 'BETANO_SYNC', 'Falha ao abrir casa rastreada em navegador gerenciado', {
            selectedBrowser,
            managedKind,
            link1: has1 ? link1 : '',
            link2: has2 ? link2 : '',
            ok1,
            ok2,
          });
        } else {
          if (has1 && !ok1) {
            openInPreferredBrowser(selectedBrowser, link1, {
              side: has2 ? 'bet1' : 'bet1',
              profileSide: 'bet1',
              bounds: has2 ? leftBounds : fullBounds,
            });
          }
          if (has2 && !ok2) {
            openInPreferredBrowser(selectedBrowser, link2, {
              side: has1 ? 'bet2' : 'bet1',
              profileSide: has1 ? 'bet2' : 'bet1',
              bounds: has1 ? rightBounds : fullBounds,
            });
          }
        }
      }
    }
    keepDashboardAboveBrowsers();
    return;
  }

  const leftBounds = getDetachedSideBounds('bet1');
  const rightBounds = getDetachedSideBounds('bet2');
  const fullBounds = getDetachedSideBounds('bet1', { single: true });
  if (has1) openInPreferredBrowser(selectedBrowser, link1, { side: has2 ? 'bet1' : 'bet1', profileSide: 'bet1', bounds: has2 ? leftBounds : fullBounds });
  if (has2) openInPreferredBrowser(selectedBrowser, link2, { side: has1 ? 'bet2' : 'bet1', profileSide: has1 ? 'bet2' : 'bet1', bounds: has1 ? rightBounds : fullBounds });
  keepDashboardAboveBrowsers();
}

async function prewarmManagedChromeWindows(browserPrefRaw = '', options = {}) {
  const explicitPrime = !!(options && options.explicitPrime);
  if (!explicitPrime && !DETACHED_EXTERNAL_ALWAYS) return false;
  const chosenBrowser = chooseExternalBrowser(browserPrefRaw, DETACHED_EXTERNAL_BROWSER || '');
  if (!(chosenBrowser === 'chrome' || chosenBrowser === 'edge')) return false;
  const managedKind = chosenBrowser === 'edge' ? 'edge' : 'chrome';
  if (usesSharedManagedBrowserProfile(managedKind)) return true;
  const leftBounds = getDetachedSideBounds('bet1');
  const rightBounds = getDetachedSideBounds('bet2');
  const leftReady = await waitManagedChromeDebugger('bet1', 1200, managedKind);
  const rightReady = await waitManagedChromeDebugger('bet2', 1200, managedKind);

  const started1 = leftReady ? true : spawnManagedChromeWindow('bet1', 'about:blank', leftBounds, managedKind);
  const started2 = rightReady ? true : spawnManagedChromeWindow('bet2', 'about:blank', rightBounds, managedKind);
  if (!started1 && !started2 && !leftReady && !rightReady) return false;

  await Promise.allSettled([
    setManagedChromeWindowState('bet1', 'normal', leftBounds, managedKind),
    setManagedChromeWindowState('bet2', 'normal', rightBounds, managedKind),
  ]);
  keepDashboardAboveBrowsers();
  return true;
}

async function prewarmDetachedBrowserWindows(browserPrefRaw = '', options = {}) {
  const explicitPrime = !!(options && options.explicitPrime);
  if (!explicitPrime && !DETACHED_EXTERNAL_ALWAYS) return false;

  const chosenBrowser = chooseExternalBrowser(browserPrefRaw, DETACHED_EXTERNAL_BROWSER || '');
  if (chosenBrowser === 'chrome' || chosenBrowser === 'edge') {
    return prewarmManagedChromeWindows(chosenBrowser, { explicitPrime: true });
  }

  if (chosenBrowser === 'firefox') {
    if (DETACHED_SIDEBAR_MODE) {
      applySidebarMainWindowLayout();
    }
    const leftBounds = getDetachedSideBounds('bet1');
    const rightBounds = getDetachedSideBounds('bet2');
    const opened1 = openInPreferredBrowser('firefox', 'about:blank', {
      side: 'bet1',
      profileSide: 'bet1',
      bounds: leftBounds,
    });
    const opened2 = openInPreferredBrowser('firefox', 'about:blank', {
      side: 'bet2',
      profileSide: 'bet2',
      bounds: rightBounds,
    });
    keepDashboardAboveBrowsers();
    return !!(opened1 || opened2);
  }

  return false;
}

function getTargetWorkArea() {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const bounds = mainWindow.getBounds();
      if (bounds && bounds.width > 0 && bounds.height > 0) {
        return screen.getDisplayMatching(bounds).workArea;
      }
    }
  } catch (_) {}
  return screen.getPrimaryDisplay().workArea;
}

function hasManagedBrowserContext(sideKey, browserKind = 'chrome') {
  const side = sideKey === 'bet2' ? 'bet2' : 'bet1';
  const st = managedChromeState[side];
  if (!st) return false;
  if (st.process && !st.process.killed) return true;
  if (String(st.targetId || '')) return true;
  return !!getActiveManagedBrowserProcess(browserKind || st.browserKind || 'chrome');
}

function hasActiveManagedBrowserWindows() {
  return ['bet1', 'bet2'].some((side) => {
    return hasManagedBrowserContext(side, managedChromeState[side] && managedChromeState[side].browserKind);
  });
}

function normalizeOddCandidate(raw) {
  const txt = String(raw == null ? '' : raw).replace(',', '.').trim();
  if (!txt) return '';
  const value = Number.parseFloat(txt);
  if (!Number.isFinite(value)) return '';
  if (value < 1.01 || value > 1000) return '';
  return value.toFixed(3).replace(/\.?0+$/, '');
}

function parseMoneyLikeNumber(raw) {
  const s = String(raw == null ? '' : raw).replace(/\s+/g, '').replace(/[^0-9,.-]/g, '');
  if (!s) return NaN;
  let norm = s;
  const hasComma = norm.includes(',');
  const hasDot = norm.includes('.');
  if (hasComma && hasDot) {
    if (norm.lastIndexOf(',') > norm.lastIndexOf('.')) {
      norm = norm.replace(/\./g, '').replace(',', '.');
    } else {
      norm = norm.replace(/,/g, '');
    }
  } else if (hasComma) {
    norm = norm.replace(',', '.');
  }
  const n = Number.parseFloat(norm);
  return Number.isFinite(n) ? n : NaN;
}

function extractStakePotentialValues(rawText) {
  const lower = String(rawText || '').toLowerCase();
  if (!lower) return { stake: NaN, potential: NaN };

  const pickNum = (patterns) => {
    for (const rx of patterns) {
      const m = lower.match(rx);
      if (!m || !m[1]) continue;
      const n = parseMoneyLikeNumber(m[1]);
      if (Number.isFinite(n) && n > 0) return n;
    }
    return NaN;
  };

  const stake = pickNum([
    /(?:total\s*apostado|aposta\s*total|valor\s*da\s*aposta|stake|total\s*stake)\D{0,20}([0-9][0-9.,]{0,16})/,
    /([0-9][0-9.,]{0,16})\D{0,14}(?:total\s*apostado|aposta\s*total|valor\s*da\s*aposta|stake|total\s*stake)/,
    /(?:^|[^a-z0-9])aposta\s*(?:r\$)?\s*([0-9][0-9.,]{0,16})/,
  ]);
  const potential = pickNum([
    /(?:ganho\s*potencial|retorno\s*potencial|retorno|potential\s*win|potential\s*return|to\s*win|ganho)\D{0,20}([0-9][0-9.,]{0,16})/,
    /([0-9][0-9.,]{0,16})\D{0,14}(?:ganho\s*potencial|retorno\s*potencial|retorno|potential\s*win|potential\s*return|to\s*win|ganho)/,
    /(?:pag\.?\s*m.?x|pagamento\s*m.?ximo|paga\s*m.?x)\D{0,20}([0-9][0-9.,]{0,16})/,
    /([0-9][0-9.,]{0,16})\D{0,14}(?:pag\.?\s*m.?x|pagamento\s*m.?ximo|paga\s*m.?x)/,
  ]);
  return { stake, potential };
}

function extractDecimalOddTokens(rawText) {
  const txt = String(rawText || '');
  if (!txt) return [];
  const rx = /[+-]?\d{1,4}(?:[.,]\d{1,3})/g;
  const out = [];
  let m;
  while ((m = rx.exec(txt)) !== null) {
    const token = String(m[0] || '');
    if (!token.includes('.') && !token.includes(',')) continue;
    const n = Number.parseFloat(token.replace(',', '.'));
    if (!Number.isFinite(n)) continue;
    if (n < 1.01 || n > 30) continue;
    out.push(n);
  }
  return out;
}

function resolveOddFromAxTree(axPayload) {
  const nodes = Array.isArray(axPayload && axPayload.nodes) ? axPayload.nodes : [];
  const stakeMarks = [];
  const potentialMarks = [];
  const selectedOdds = [];
  const cupomOdds = [];
  const KEY_CUPOM = /(cupom|coupon|betslip|ticket|aposta|apostado|fazeraposta|pag\.?m.?x|stake|potential|ganho|simples|multiplo|sistema)/;

  const textSamples = [];
  const pushSample = (txt) => {
    const t = String(txt || '').replace(/\s+/g, ' ').trim();
    if (!t) return;
    if (textSamples.length >= 3) return;
    textSamples.push(t.slice(0, 140));
  };

  for (let idx = 0; idx < nodes.length && idx < 2600; idx += 1) {
    const node = nodes[idx] || {};
    const texts = [];
    const pushText = (val) => {
      const t = String(val || '').trim();
      if (t) texts.push(t);
    };
    try { pushText(node && node.name && node.name.value); } catch (_) {}
    try { pushText(node && node.description && node.description.value); } catch (_) {}
    try { pushText(node && node.value && node.value.value); } catch (_) {}
    if (!texts.length) continue;

    let isSelectedNode = false;
    try {
      const props = Array.isArray(node.properties) ? node.properties : [];
      for (const p of props) {
        const pn = String((p && p.name) || '').toLowerCase();
        if (!pn || !/(selected|pressed|checked)/.test(pn)) continue;
        const pv = p && p.value ? p.value.value : undefined;
        if (pv === true || String(pv).toLowerCase() === 'true' || pv === '1' || pv === 1) {
          isSelectedNode = true;
          break;
        }
      }
    } catch (_) {}

    for (const txt of texts) {
      const compact = txt.toLowerCase().replace(/\s+/g, '');
      pushSample(txt);

      const { stake, potential } = extractStakePotentialValues(txt);
      if (Number.isFinite(stake) && stake > 0) stakeMarks.push({ idx, value: stake });
      if (Number.isFinite(potential) && potential > 0) potentialMarks.push({ idx, value: potential });

      const odds = extractDecimalOddTokens(txt);
      if (isSelectedNode && odds.length) {
        for (const n of odds) selectedOdds.push({ idx, value: n });
      }
      if (KEY_CUPOM.test(compact) && odds.length) {
        for (const n of odds) cupomOdds.push({ idx, value: n });
      }
    }
  }

  if (selectedOdds.length) {
    const value = selectedOdds[selectedOdds.length - 1].value;
    return {
      odd: normalizeOddCandidate(value),
      source: 'ax-tree-selected',
      diag: {
        axNodes: nodes.length,
        axStakeMarks: stakeMarks.length,
        axPotentialMarks: potentialMarks.length,
        axSelectedOdds: selectedOdds.length,
        axCupomOdds: cupomOdds.length,
        axSample: textSamples.join(' | '),
      },
    };
  }

  let bestRatio = null;
  const sTail = stakeMarks.slice(-120);
  const pTail = potentialMarks.slice(-120);
  for (const s of sTail) {
    for (const p of pTail) {
      const dist = Math.abs((p.idx || 0) - (s.idx || 0));
      if (dist > 40) continue;
      const oddNum = (p.value || 0) / (s.value || 0);
      if (!Number.isFinite(oddNum) || oddNum < 1.01 || oddNum > 30) continue;
      const score = 100 - dist;
      if (!bestRatio || score > bestRatio.score) {
        bestRatio = { odd: oddNum, score };
      }
    }
  }
  if (bestRatio && Number.isFinite(bestRatio.odd)) {
    return {
      odd: normalizeOddCandidate(bestRatio.odd),
      source: 'ax-tree-ratio',
      diag: {
        axNodes: nodes.length,
        axStakeMarks: stakeMarks.length,
        axPotentialMarks: potentialMarks.length,
        axSelectedOdds: selectedOdds.length,
        axCupomOdds: cupomOdds.length,
        axSample: textSamples.join(' | '),
      },
    };
  }

  if (cupomOdds.length) {
    const values = cupomOdds.map((x) => Number(x.value)).filter((n) => Number.isFinite(n) && n >= 1.01 && n <= 30);
    if (values.length) {
      const short = values.filter((n) => n <= 15);
      const chosen = short.length ? Math.min(...short) : Math.min(...values);
      return {
        odd: normalizeOddCandidate(chosen),
        source: 'ax-tree-cupom-min',
        diag: {
          axNodes: nodes.length,
          axStakeMarks: stakeMarks.length,
          axPotentialMarks: potentialMarks.length,
          axSelectedOdds: selectedOdds.length,
          axCupomOdds: cupomOdds.length,
          axSample: textSamples.join(' | '),
        },
      };
    }
  }

  return {
    odd: '',
    source: 'ax-tree-none',
    diag: {
      axNodes: nodes.length,
      axStakeMarks: stakeMarks.length,
      axPotentialMarks: potentialMarks.length,
      axSelectedOdds: selectedOdds.length,
      axCupomOdds: cupomOdds.length,
      axSample: textSamples.join(' | '),
    },
  };
}

function isBetanoPayload(payload) {
  if (!payload || typeof payload !== 'object') return false;
  const bookmaker = String(payload.bookmaker || '').trim().toLowerCase();
  if (bookmaker.includes('betano')) return true;
  try {
    const host = new URL(String(payload.link || '').trim()).hostname.toLowerCase();
    return host.includes('betano.bet.br');
  } catch (_) {
    return false;
  }
}

function isBet365Payload(payload) {
  if (!payload || typeof payload !== 'object') return false;
  const bookmaker = String(payload.bookmaker || '').trim().toLowerCase();
  if (bookmaker.includes('bet365')) return true;
  try {
    const host = new URL(String(payload.link || '').trim()).hostname.toLowerCase();
    return host.includes('bet365.bet.br');
  } catch (_) {
    return false;
  }
}

function isEntainPayload(payload) {
  if (!payload || typeof payload !== 'object') return false;
  const bookmaker = String(payload.bookmaker || '').trim().toLowerCase();
  if (bookmaker.includes('sportingbet') || bookmaker.includes('betboo')) return true;
  try {
    const host = new URL(String(payload.link || '').trim()).hostname.toLowerCase();
    return host.includes('sports.sportingbet.bet.br') || host.includes('betboo.bet.br');
  } catch (_) {
    return false;
  }
}

function isBetfairExchangeUrl(rawUrl) {
  try {
    const parsed = new URL(String(rawUrl || '').trim());
    const host = String(parsed.hostname || '').toLowerCase();
    if (!host.includes('betfair.bet.br')) return false;

    const pathWithHash = `${String(parsed.pathname || '')}${String(parsed.hash || '')}`.toLowerCase();
    if (!pathWithHash.includes('/exchange/plus/')) return false;
    if (!/\/market\/[0-9]+(?:\.[0-9]+)?/i.test(pathWithHash)) return false;
    return true;
  } catch (_) {
    return false;
  }
}

function isBetfairExchangePayload(payload) {
  if (!payload || typeof payload !== 'object') return false;
  const link = String(payload.link || '').trim();
  if (isBetfairExchangeUrl(link)) return true;
  return false;
}

function isSoftConstructAUrl(rawUrl) {
  try {
    const parsed = new URL(String(rawUrl || '').trim());
    const host = String(parsed.hostname || '').toLowerCase();
    const isTargetHost = (
      host.includes('br4.bet.br')
      || host.includes('lotogreen.bet.br')
      || host.includes('betfusion.bet.br')
      || host.includes('mcgames.bet.br')
    );
    if (!isTargetHost) return false;
    const pathHash = (String(parsed.pathname || '') + String(parsed.hash || '')).toLowerCase();
    if (/\/sports\/liveevent\/le-\d+/i.test(pathHash)) return true;
    if (/\/sports\/le-\d+/i.test(pathHash)) return true;
    return false;
  } catch (_) {
    return false;
  }
}

function isSoftConstructAPayload(payload) {
  if (!payload || typeof payload !== 'object') return false;
  const link = String(payload.link || '').trim();
  if (isSoftConstructAUrl(link)) return true;
  return false;
}

function isBtPathFamilyUrl(rawUrl) {
  try {
    const parsed = new URL(String(rawUrl || '').trim());
    const host = String(parsed.hostname || '').toLowerCase();
    const isTargetHost = host.includes('apostaganha.bet.br') || host.includes('blaze.bet.br');
    if (!isTargetHost) return false;
    const btPath = (parsed.searchParams.get('bt-path') || parsed.searchParams.get('bt_path') || '').trim();
    if (!btPath) return false;
    // Must include a slash-like path and be reasonably long to avoid home links.
    if (!/[\/]/.test(btPath)) return false;
    if (btPath.length < 6) return false;
    return true;
  } catch (_) {
    return false;
  }
}

function isBtPathFamilyPayload(payload) {
  if (!payload || typeof payload !== 'object') return false;
  const link = String(payload.link || '').trim();
  if (isBtPathFamilyUrl(link)) return true;
  return false;
}

function isBet7kCms1Url(rawUrl) {
  try {
    const parsed = new URL(String(rawUrl || '').trim());
    const host = String(parsed.hostname || '').toLowerCase();
    const isTargetHost = (
      host.includes('7k.bet.br')
      || host.includes('betvip.bet.br')
      || host.includes('brx.bet.br')
      || host.includes('brxbet.bet.br')
      || host.includes('cassino.bet.br')
      || host.includes('donald.bet.br')
      || host.includes('rico.bet.br')
      || host.includes('ricobet.bet.br')
      || host.includes('bra.bet.br')
      || host.includes('mmabet.bet.br')
      || host.includes('play.bet.br')
      || host.includes('betfalcons.bet.br')
      || host.includes('betgorillas.bet.br')
      || host.includes('b1bet.bet.br')
      || host.includes('betpontobet.bet.br')
      || host.includes('geralbet.bet.br')
      || host.includes('lider.bet.br')
    );
    if (!isTargetHost) return false;

    const pathHash = (String(parsed.pathname || '') + String(parsed.hash || '')).toLowerCase();
    if (
      pathHash.includes('/live-betting/')
      || pathHash.includes('/sports/')
      || pathHash.includes('/fbook/')
    ) {
      return true;
    }
    const eventId = String(parsed.searchParams.get('eventId') || parsed.searchParams.get('eventID') || '').trim();
    if (eventId) return true;
    return false;
  } catch (_) {
    return false;
  }
}

function isBet7kCms1Payload(payload) {
  if (!payload || typeof payload !== 'object') return false;
  const bookmaker = String(payload.bookmaker || '').trim().toLowerCase();
  if (
    bookmaker.includes('7k.bet.br')
    || bookmaker.includes('betvip')
    || bookmaker.includes('brx')
    || bookmaker.includes('brxbet')
    || bookmaker.includes('cassino')
    || bookmaker.includes('donald')
    || bookmaker.includes('rico')
    || bookmaker.includes('ricobet')
    || bookmaker.includes('bra.bet')
    || bookmaker.includes('mmabet')
    || bookmaker.includes('play.bet')
    || bookmaker.includes('betfalcons')
    || bookmaker.includes('betgorillas')
    || bookmaker.includes('b1bet')
    || bookmaker.includes('betpontobet')
    || bookmaker.includes('geralbet')
    || bookmaker.includes('lider')
  ) {
    return true;
  }
  const link = String(payload.link || '').trim();
  if (isBet7kCms1Url(link)) return true;
  return false;
}

function isBetanoUrl(rawUrl) {
  try {
    const host = new URL(String(rawUrl || '').trim()).hostname.toLowerCase();
    return host.includes('betano.bet.br');
  } catch (_) {
    return false;
  }
}

function isBet365Url(rawUrl) {
  try {
    const host = new URL(String(rawUrl || '').trim()).hostname.toLowerCase();
    return host.includes('bet365.bet.br');
  } catch (_) {
    return false;
  }
}

function isEntainUrl(rawUrl) {
  try {
    const host = new URL(String(rawUrl || '').trim()).hostname.toLowerCase();
    return host.includes('sports.sportingbet.bet.br') || host.includes('betboo.bet.br');
  } catch (_) {
    return false;
  }
}

function isTrackedOddSyncPayload(payload) {
  return isBetanoPayload(payload)
    || isBet365Payload(payload)
    || isEntainPayload(payload)
    || isBetfairExchangePayload(payload)
    || isSoftConstructAPayload(payload)
    || isBtPathFamilyPayload(payload)
    || isBet7kCms1Payload(payload)
    || isValidHttpUrl(payload && payload.link);
}

function isTrackedOddSyncUrl(rawUrl) {
  return isBetanoUrl(rawUrl)
    || isBet365Url(rawUrl)
    || isEntainUrl(rawUrl)
    || isBetfairExchangeUrl(rawUrl)
    || isSoftConstructAUrl(rawUrl)
    || isBtPathFamilyUrl(rawUrl)
    || isBet7kCms1Url(rawUrl)
    || isValidHttpUrl(rawUrl);
}

function clearBetanoOddState(sideKey) {
  if (!betanoOddsSyncState[sideKey]) return;
  betanoOddsSyncState[sideKey] = { odd: '', href: '', ts: 0 };
  if (betanoEventMismatchState[sideKey]) {
    betanoEventMismatchState[sideKey] = {
      count: 0,
      lastTs: 0,
      expectedEventId: '',
      observedEventId: '',
      lastNavigateTs: 0,
    };
  }
}

async function evaluateOddBundleOnCdp(cdp) {
  await cdp('Runtime.enable', {}).catch(() => {});
  const envEvaluated = await cdp('Runtime.evaluate', {
    expression: `(() => ({ href: String(location && location.href ? location.href : ''), title: String(document && document.title ? document.title : ''), bodyChars: Number(((document && document.body && document.body.innerText) || '').length || 0) }))()`,
    awaitPromise: true,
    returnByValue: true,
  }, 2200).catch(() => null);
  const envValue = envEvaluated && envEvaluated.result ? envEvaluated.result.value : null;
  const env = envValue && typeof envValue === 'object' ? envValue : null;

  const evaluated = await cdp('Runtime.evaluate', {
    expression: BETANO_ODDS_WATCH_SCRIPT,
    awaitPromise: true,
    returnByValue: true,
  }, 6500).catch(() => null);
  const value = evaluated && evaluated.result ? evaluated.result.value : null;
  const watch = value && typeof value === 'object' ? value : null;

  let global = null;
  let ax = null;
  if (!watch || !watch.odd) {
    const fallbackEvaluated = await cdp('Runtime.evaluate', {
      expression: BETANO_GLOBAL_SLIP_TOTALS_SCRIPT,
      awaitPromise: true,
      returnByValue: true,
    }, 3500).catch(() => null);
    const fallbackValue = fallbackEvaluated && fallbackEvaluated.result ? fallbackEvaluated.result.value : null;
    global = fallbackValue && typeof fallbackValue === 'object' ? fallbackValue : null;
  }
  if ((!watch || !watch.odd) && (!global || !global.odd)) {
    await cdp('Accessibility.enable', {}).catch(() => {});
    const axRaw = await cdp('Accessibility.getFullAXTree', {}, 3500).catch(() => null);
    ax = axRaw && typeof axRaw === 'object' ? axRaw : null;
  }
  return { watch, global, env, ax };
}

function extractOddSnapshotFromBundle(rawBundle, fallbackHref = '') {
  if (!rawBundle || typeof rawBundle !== 'object') return null;
  const rawWatch = rawBundle.watch && typeof rawBundle.watch === 'object' ? rawBundle.watch : null;
  const rawGlobal = rawBundle.global && typeof rawBundle.global === 'object' ? rawBundle.global : null;
  const rawEnv = rawBundle.env && typeof rawBundle.env === 'object' ? rawBundle.env : null;
  const rawAx = rawBundle.ax && typeof rawBundle.ax === 'object' ? rawBundle.ax : null;

  let odd = normalizeOddCandidate(rawWatch && rawWatch.odd ? rawWatch.odd : '');
  let href = String(rawWatch && rawWatch.href ? rawWatch.href : '').trim();
  if (!href && rawEnv && rawEnv.href) href = String(rawEnv.href).trim();
  if (!href && fallbackHref) href = String(fallbackHref).trim();
  let source = String(rawWatch && rawWatch.source ? rawWatch.source : '').trim();
  let ts = Number(rawWatch && rawWatch.ts ? rawWatch.ts : 0) || Date.now();
  let axDiag = null;

  if (!odd && rawGlobal) {
    const fromGlobal = normalizeOddCandidate(rawGlobal.odd);
    if (fromGlobal) {
      odd = fromGlobal;
      href = String(rawGlobal.href || href || '').trim();
      source = String(rawGlobal.source || 'global-slip-total-cdp').trim();
      ts = Number(rawGlobal.ts || 0) || Date.now();
    }
  }

  if (!odd && rawAx) {
    const axResolved = resolveOddFromAxTree(rawAx);
    axDiag = axResolved && axResolved.diag && typeof axResolved.diag === 'object' ? axResolved.diag : null;
    const fromAx = normalizeOddCandidate(axResolved && axResolved.odd ? axResolved.odd : '');
    if (fromAx) {
      odd = fromAx;
      source = String(axResolved && axResolved.source ? axResolved.source : 'ax-tree-cdp').trim();
      ts = Date.now();
    }
  }

  const globalDiag = rawGlobal && rawGlobal.diag && typeof rawGlobal.diag === 'object' ? rawGlobal.diag : null;
  return {
    odd: odd || '',
    href,
    source: source || String(rawGlobal && rawGlobal.source ? rawGlobal.source : '').trim(),
    ts,
    diag: {
      watchOdd: String(rawWatch && rawWatch.odd ? rawWatch.odd : ''),
      watchSource: String(rawWatch && rawWatch.source ? rawWatch.source : ''),
      globalOdd: String(rawGlobal && rawGlobal.odd ? rawGlobal.odd : ''),
      globalSource: String(rawGlobal && rawGlobal.source ? rawGlobal.source : ''),
      observedHref: String(rawEnv && rawEnv.href ? rawEnv.href : href || ''),
      observedTitle: String(rawEnv && rawEnv.title ? rawEnv.title : ''),
      bodyChars: Number(rawEnv && rawEnv.bodyChars ? rawEnv.bodyChars : 0) || 0,
      iframeTotal: Number(globalDiag && globalDiag.iframeTotal ? globalDiag.iframeTotal : 0) || 0,
      iframeSameOrigin: Number(globalDiag && globalDiag.iframeSameOrigin ? globalDiag.iframeSameOrigin : 0) || 0,
      iframeCrossOrigin: Number(globalDiag && globalDiag.iframeCrossOrigin ? globalDiag.iframeCrossOrigin : 0) || 0,
      hasStakeKeyword: !!(globalDiag && globalDiag.hasStakeKeyword),
      hasPotentialKeyword: !!(globalDiag && globalDiag.hasPotentialKeyword),
      hasCupomKeyword: !!(globalDiag && globalDiag.hasCupomKeyword),
      firstStakeSample: String(globalDiag && globalDiag.firstStakeSample ? globalDiag.firstStakeSample : ''),
      firstPotentialSample: String(globalDiag && globalDiag.firstPotentialSample ? globalDiag.firstPotentialSample : ''),
      axNodes: Number(axDiag && axDiag.axNodes ? axDiag.axNodes : 0) || 0,
      axStakeMarks: Number(axDiag && axDiag.axStakeMarks ? axDiag.axStakeMarks : 0) || 0,
      axPotentialMarks: Number(axDiag && axDiag.axPotentialMarks ? axDiag.axPotentialMarks : 0) || 0,
      axSelectedOdds: Number(axDiag && axDiag.axSelectedOdds ? axDiag.axSelectedOdds : 0) || 0,
      axCupomOdds: Number(axDiag && axDiag.axCupomOdds ? axDiag.axCupomOdds : 0) || 0,
      axSample: String(axDiag && axDiag.axSample ? axDiag.axSample : ''),
      targetUrl: String(rawBundle && rawBundle.targetUrl ? rawBundle.targetUrl : ''),
      targetType: String(rawBundle && rawBundle.targetType ? rawBundle.targetType : ''),
    },
  };
}

async function readBetanoOddSnapshot(sideKey, browserKind = 'chrome', desiredUrl = '') {
  const side = sideKey === 'bet2' ? 'bet2' : 'bet1';
  const st = managedChromeState[side];
  if (!hasManagedBrowserContext(side, browserKind)) return null;
  if (st.cdpBusy) return null;
  st.cdpBusy = true;
  try {
    const ready = await waitManagedChromeDebugger(side, 900, browserKind);
    if (!ready) return null;
    const rawBundle = await withManagedChromeCdp(side, async (cdp, target) => {
      const bundle = await evaluateOddBundleOnCdp(cdp);
      return {
        ...bundle,
        targetId: String(target && target.id ? target.id : ''),
        targetUrl: String(target && target.url ? target.url : ''),
        targetType: String(target && target.type ? target.type : 'page'),
      };
    }, browserKind, desiredUrl);

    let snapshot = extractOddSnapshotFromBundle(rawBundle, desiredUrl);
    if (!snapshot) return null;

    const primaryTargetId = String(rawBundle && rawBundle.targetId ? rawBundle.targetId : '');
    if (!snapshot.odd) {
      const desiredParsed = parseUrlSafe(desiredUrl);
      const desiredHost = desiredParsed && desiredParsed.hostname ? String(desiredParsed.hostname).toLowerCase() : '';
      const otherTargetIds = new Set(
        ['bet1', 'bet2']
          .filter((key) => key !== side)
          .map((key) => String((managedChromeState[key] && managedChromeState[key].targetId) || ''))
          .filter(Boolean)
      );
      let tried = 0;
      let bestDiagSnapshot = snapshot;

      const targets = await getManagedChromeTargets(side, browserKind).catch(() => []);
      const ranked = (Array.isArray(targets) ? targets : [])
        .filter((item) => item && item.webSocketDebuggerUrl && String(item.id || '') !== primaryTargetId)
        .filter((item) => !otherTargetIds.has(String(item.id || '')))
        .filter((item) => isTargetUrlCompatibleWithDesired(String(item.url || ''), desiredUrl))
        .map((item) => {
          const typ = String(item.type || '').toLowerCase();
          const parsed = parseUrlSafe(String(item.url || ''));
          let score = scoreTargetAgainstDesired(String(item.url || ''), desiredUrl);
          if (typ === 'iframe') score += 450;
          else if (typ === 'page') score += 120;
          else score += 40;
          if (parsed && /^https?:/i.test(String(parsed.protocol || ''))) score += 30;
          if (desiredHost && parsed && String(parsed.hostname || '').toLowerCase() === desiredHost) score += 260;
          return { item, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);

      for (const cand of ranked) {
        tried += 1;
        const altRaw = await withManagedChromeCdpTarget(cand.item, async (cdp, target) => {
          const bundle = await evaluateOddBundleOnCdp(cdp);
          return {
            ...bundle,
            targetId: String(target && target.id ? target.id : ''),
            targetUrl: String(target && target.url ? target.url : ''),
            targetType: String(target && target.type ? target.type : String(cand.item.type || '')),
          };
        }).catch(() => null);
        if (!altRaw) continue;

        const altSnapshot = extractOddSnapshotFromBundle(altRaw, desiredUrl);
        if (!altSnapshot) continue;

        if (altSnapshot.odd) {
          const tt = String((altSnapshot.diag && altSnapshot.diag.targetType) || (cand.item && cand.item.type) || '').trim();
          if (tt) altSnapshot.source = `${altSnapshot.source || 'alt-target'}:${tt}`;
          if (altSnapshot.diag) {
            altSnapshot.diag.altTargetsTried = tried;
            altSnapshot.diag.primaryTargetId = primaryTargetId;
          }
          return altSnapshot;
        }

        const altAxNodes = Number(altSnapshot && altSnapshot.diag && altSnapshot.diag.axNodes ? altSnapshot.diag.axNodes : 0) || 0;
        const bestAxNodes = Number(bestDiagSnapshot && bestDiagSnapshot.diag && bestDiagSnapshot.diag.axNodes ? bestDiagSnapshot.diag.axNodes : 0) || 0;
        if (altAxNodes > bestAxNodes) bestDiagSnapshot = altSnapshot;
      }

      if (bestDiagSnapshot && bestDiagSnapshot.diag) {
        bestDiagSnapshot.diag.altTargetsTried = tried;
        bestDiagSnapshot.diag.primaryTargetId = primaryTargetId;
      }
      snapshot = bestDiagSnapshot || snapshot;
    }

    return snapshot;
  } catch (_) {
    return null;
  } finally {
    st.cdpBusy = false;
  }
}

async function syncBetanoOddSide(sideKey) {
  const side = sideKey === 'bet2' ? 'bet2' : 'bet1';
  const st = managedChromeState[side];
  if (!hasManagedBrowserContext(side, st && st.browserKind ? st.browserKind : 'chrome')) {
    logBetanoSyncDiag(side, 'skip:no-managed-process', {
      browserKind: st && st.browserKind ? st.browserKind : '',
      hasState: !!st,
      processKilled: !!(st && st.process && st.process.killed),
    });
    clearBetanoOddState(side);
    return;
  }

  const kind = st.browserKind === 'edge' ? 'edge' : 'chrome';
  const payload = detachedWindowPayload[side];
  let expectedUrl = String(payload && payload.link ? payload.link : '').trim();
  let hasTrackedContext = isTrackedOddSyncPayload(payload);

  if (!hasTrackedContext) {
    const lastUrl = String(st.lastUrl || '').trim();
    if (isTrackedOddSyncUrl(lastUrl)) {
      expectedUrl = lastUrl;
      hasTrackedContext = true;
      logBetanoSyncDiag(side, 'fallback:using-last-url', { lastUrl }, 8000);
    }
  }

  if (!hasTrackedContext) {
    try {
      const ready = await waitManagedChromeDebugger(side, 800, kind);
      if (ready) {
        const target = await getManagedChromePageTarget(side, kind, '');
        const targetUrl = String(target && target.url ? target.url : '').trim();
        if (isTrackedOddSyncUrl(targetUrl)) {
          expectedUrl = targetUrl;
          hasTrackedContext = true;
          logBetanoSyncDiag(side, 'fallback:using-target-url', { targetUrl }, 8000);
        }
      }
    } catch (_) {}
  }

  if (!hasTrackedContext) {
    logBetanoSyncDiag(side, 'skip:not-tracked-side', {
      bookmaker: payload && payload.bookmaker ? String(payload.bookmaker) : '',
      link: payload && payload.link ? String(payload.link) : '',
      lastUrl: st && st.lastUrl ? String(st.lastUrl) : '',
    });
    clearBetanoOddState(side);
    return;
  }

  const snapshot = await readBetanoOddSnapshot(side, kind, expectedUrl);
  if (!snapshot || !snapshot.odd) {
    const diag = snapshot && snapshot.diag && typeof snapshot.diag === 'object' ? snapshot.diag : {};
    logBetanoSyncDiag(side, 'snapshot:empty', {
      browserKind: kind,
      expectedUrl,
      managedPort: getManagedPort(side, kind),
      profileDir: st && st.profileDir ? st.profileDir : '',
      observedHref: String(diag.observedHref || ''),
      observedTitle: String(diag.observedTitle || ''),
      bodyChars: Number(diag.bodyChars || 0) || 0,
      iframeTotal: Number(diag.iframeTotal || 0) || 0,
      iframeSameOrigin: Number(diag.iframeSameOrigin || 0) || 0,
      iframeCrossOrigin: Number(diag.iframeCrossOrigin || 0) || 0,
      hasStakeKeyword: !!diag.hasStakeKeyword,
      hasPotentialKeyword: !!diag.hasPotentialKeyword,
      hasCupomKeyword: !!diag.hasCupomKeyword,
      firstStakeSample: String(diag.firstStakeSample || ''),
      firstPotentialSample: String(diag.firstPotentialSample || ''),
      axNodes: Number(diag.axNodes || 0) || 0,
      axStakeMarks: Number(diag.axStakeMarks || 0) || 0,
      axPotentialMarks: Number(diag.axPotentialMarks || 0) || 0,
      axSelectedOdds: Number(diag.axSelectedOdds || 0) || 0,
      axCupomOdds: Number(diag.axCupomOdds || 0) || 0,
      axSample: String(diag.axSample || ''),
      targetType: String(diag.targetType || ''),
      targetUrl: String(diag.targetUrl || ''),
      altTargetsTried: Number(diag.altTargetsTried || 0) || 0,
      primaryTargetId: String(diag.primaryTargetId || ''),
      watchOdd: String(diag.watchOdd || ''),
      watchSource: String(diag.watchSource || ''),
      globalOdd: String(diag.globalOdd || ''),
      globalSource: String(diag.globalSource || ''),
    });
    return;
  }

  if (!isSnapshotCompatibleWithExpected(snapshot, expectedUrl)) {
    const diag = snapshot && snapshot.diag && typeof snapshot.diag === 'object' ? snapshot.diag : {};
    logBetanoSyncDiag(side, 'snapshot:host-mismatch', {
      expectedUrl,
      observedUrl: snapshot.href || '',
      observedHref: String(diag.observedHref || ''),
      targetUrl: String(diag.targetUrl || ''),
      targetType: String(diag.targetType || ''),
      source: snapshot.source || '',
      odd: snapshot.odd || '',
    }, 2500);
    clearBetanoOddState(side);
    return;
  }

  if (isBet7kCms1Url(expectedUrl)) {
    const snapSource = String(snapshot.source || '').toLowerCase();
    const snapDiag = snapshot.diag && typeof snapshot.diag === 'object' ? snapshot.diag : {};
    const axSelectedOdds = Number(snapDiag.axSelectedOdds || 0) || 0;
    const axCupomOdds = Number(snapDiag.axCupomOdds || 0) || 0;
    const weakCupomOnly = snapSource.includes('ax-tree-cupom-min') && axSelectedOdds <= 0 && axCupomOdds > 0;
    if (weakCupomOnly) {
      logBetanoSyncDiag(side, 'snapshot:low-confidence-cupom', {
        source: snapshot.source || '',
        expectedUrl,
        observedUrl: snapshot.href || '',
        axSelectedOdds,
        axCupomOdds,
      }, 5000);
      return;
    }
  }

  {
    const expectedEventId = extractLikelyEventId(expectedUrl);
    const observedEventId = extractLikelyEventId(snapshot.href || '');
    if (expectedEventId && observedEventId && expectedEventId !== observedEventId) {
      const mismatchState = betanoEventMismatchState[side] || {
        count: 0,
        lastTs: 0,
        expectedEventId: '',
        observedEventId: '',
        lastNavigateTs: 0,
      };
      const nowTs = Date.now();
      const sameMismatch = mismatchState.expectedEventId === expectedEventId
        && mismatchState.observedEventId === observedEventId
        && (nowTs - Number(mismatchState.lastTs || 0)) < 15000;
      mismatchState.count = sameMismatch ? (Number(mismatchState.count || 0) + 1) : 1;
      mismatchState.lastTs = nowTs;
      mismatchState.expectedEventId = expectedEventId;
      mismatchState.observedEventId = observedEventId;
      betanoEventMismatchState[side] = mismatchState;

      logBetanoSyncDiag(side, 'snapshot:event-mismatch', {
        expectedEventId,
        observedEventId,
        expectedUrl,
        observedUrl: snapshot.href || '',
        mismatchCount: mismatchState.count,
      });

      const canRecoverNow = isValidHttpUrl(expectedUrl)
        && mismatchState.count >= 2
        && (nowTs - Number(mismatchState.lastNavigateTs || 0)) > 4500;
      if (canRecoverNow) {
        mismatchState.lastNavigateTs = nowTs;
        const recovered = await navigateManagedChromeSide(side, expectedUrl, null, kind).catch(() => false);
        logBetanoSyncDiag(side, 'snapshot:event-recover-navigate', {
          expectedEventId,
          observedEventId,
          expectedUrl,
          observedUrl: snapshot.href || '',
          recovered: !!recovered,
          mismatchCount: mismatchState.count,
        }, 2000);
      }
      return;
    }
    if (betanoEventMismatchState[side]) {
      betanoEventMismatchState[side] = {
        count: 0,
        lastTs: 0,
        expectedEventId: '',
        observedEventId: '',
        lastNavigateTs: 0,
      };
    }
  }

  const previous = betanoOddsSyncState[side] || { odd: '', href: '', ts: 0 };
  const sameOdd = previous.odd === snapshot.odd;
  const sameHref = (previous.href || '') === (snapshot.href || '');
  if (sameOdd && sameHref) {
    logBetanoSyncDiag(side, 'snapshot:no-change', {
      odd: snapshot.odd,
      source: snapshot.source || '',
    }, 12000);
    return;
  }

  betanoOddsSyncState[side] = {
    odd: snapshot.odd,
    href: snapshot.href || '',
    ts: snapshot.ts || Date.now(),
  };

  logger.write('debug', 'BETANO_SYNC', 'Odd capturada', {
    side,
    odd: snapshot.odd,
    source: snapshot.source || '',
    href: snapshot.href || '',
  });

  if (!mainWindow || mainWindow.isDestroyed()) return;
  try {
    mainWindow.webContents.send('betano-odd-update', {
      side,
      odd: snapshot.odd,
      url: snapshot.href || String(payload && payload.link ? payload.link : ''),
      expectedUrl,
      source: snapshot.source || 'betano-watch',
      bookmaker: String(payload && payload.bookmaker ? payload.bookmaker : ''),
      event: String(payload && payload.event ? payload.event : ''),
      ts: snapshot.ts || Date.now(),
    });
  } catch (_) {}
}

async function runBetanoOddsSyncTick() {
  if (betanoOddsSyncRunning) return;
  betanoOddsSyncRunning = true;
  try {
    await Promise.allSettled([
      syncBetanoOddSide('bet1'),
      syncBetanoOddSide('bet2'),
    ]);
  } finally {
    betanoOddsSyncRunning = false;
  }
}

function startBetanoOddsSyncLoop() {
  if (betanoOddsSyncTimer) return;
  betanoOddsSyncTimer = setInterval(() => {
    runBetanoOddsSyncTick().catch(() => {});
  }, BETANO_ODDS_SYNC_INTERVAL_MS);
  runBetanoOddsSyncTick().catch(() => {});
}

function stopBetanoOddsSyncLoop() {
  if (betanoOddsSyncTimer) {
    clearInterval(betanoOddsSyncTimer);
    betanoOddsSyncTimer = null;
  }
}

function isValidHttpUrl(raw) {
  try {
    const txt = String(raw || '').trim();
    if (!txt) return false;
    const parsed = new URL(txt);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

function makeDetachedWindowTitle(sideLabel, bookmaker, eventName) {
  const parts = [];
  parts.push(sideLabel || 'Casa');
  if (bookmaker) parts.push(String(bookmaker).trim());
  if (eventName) parts.push(String(eventName).trim());
  return parts.filter(Boolean).join(' - ');
}

function buildDetachedPayload(sideKey, url, bookmaker, eventName) {
  return {
    side: sideKey,
    link: String(url || '').trim(),
    bookmaker: String(bookmaker || '').trim(),
    event: String(eventName || '').trim(),
    title: makeDetachedWindowTitle(sideKey === 'bet2' ? 'Casa 2' : 'Casa 1', bookmaker, eventName),
  };
}

function sendDetachedPayload(sideKey) {
  const win = detachedBetWindows[sideKey];
  const payload = detachedWindowPayload[sideKey];
  if (!win || win.isDestroyed() || !payload) return;
  try {
    win.webContents.send('detached-load', payload);
  } catch (_) {}
}

function fitDetachedView(sideKey) {
  const win = detachedBetWindows[sideKey];
  const view = detachedBetViews[sideKey];
  if (!win || win.isDestroyed() || !view || view.webContents.isDestroyed()) return;
  const bounds = win.getContentBounds();
  const topOffset = Math.max(70, Math.min(240, Number(detachedToolbarHeights[sideKey] || 94)));
  const width = Math.max(1, bounds.width);
  const height = Math.max(1, bounds.height - topOffset);

  try {
    view.setBounds({ x: 0, y: topOffset, width, height });
    view.setAutoResize({ width: true, height: true });
  } catch (_) {}
}

function ensureDetachedView(sideKey) {
  const win = detachedBetWindows[sideKey];
  if (!win || win.isDestroyed()) return null;

  let view = detachedBetViews[sideKey];
  if (view && !view.webContents.isDestroyed()) {
    try {
      win.setBrowserView(view);
      fitDetachedView(sideKey);
    } catch (_) {}
    return view;
  }

  view = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      nativeWindowOpen: true,
      partition: DETACHED_SESSION_PARTITION,
    },
  });

  installDetachedSessionHardening(view.webContents.session);

  try {
    view.webContents.setUserAgent(DETACHED_USER_AGENT);
  } catch (_) {}

  view.webContents.setWindowOpenHandler(({ url: popupUrl }) => {
    if (isValidHttpUrl(popupUrl)) {
      loadDetachedUrl(sideKey, popupUrl, 'popup');
    } else if (String(popupUrl || '').trim()) {
      shell.openExternal(String(popupUrl).trim()).catch(() => {});
    }
    return { action: 'deny' };
  });

  const syncUrlToUi = (url) => {
    if (!isValidHttpUrl(url)) return;
    const payload = detachedWindowPayload[sideKey];
    if (!payload) return;
    payload.link = String(url).trim();
    sendDetachedPayload(sideKey);
  };

  view.webContents.on('did-navigate', (_event, url) => syncUrlToUi(url));
  view.webContents.on('did-navigate-in-page', (_event, url) => syncUrlToUi(url));
  view.webContents.on('did-finish-load', () => {
    clearDetachedFallbackTimer(sideKey);
  });
  view.webContents.on('did-stop-loading', () => {
    clearDetachedFallbackTimer(sideKey);
  });
  view.webContents.on('dom-ready', () => {
    try {
      view.webContents.executeJavaScript(DETACHED_STEALTH_SCRIPT, true).catch(() => {});
    } catch (_) {}
  });
  view.webContents.on('did-fail-load', (_event, code, desc, url, isMainFrame) => {
    if (Number(code) === -3) return;
    logger.write('warn', 'DETACHED_BROWSER', 'Falha ao carregar URL no BrowserView', {
      side: sideKey,
      url,
      code,
      desc,
      isMainFrame: Boolean(isMainFrame),
    });
    if (Boolean(isMainFrame) && isValidHttpUrl(url)) {
      scheduleDetachedExternalFallback(sideKey, url, `did-fail-load:${code}`);
    }
  });

  detachedBetViews[sideKey] = view;
  try {
    win.setBrowserView(view);
  } catch (_) {}
  fitDetachedView(sideKey);
  return view;
}

function cleanupDetachedWindow(sideKey, options = {}) {
  const shouldClearPayload = !(options && options.clearPayload === false);
  const win = detachedBetWindows[sideKey];
  if (win && !win.isDestroyed()) {
    try {
      win.setBrowserView(null);
    } catch (_) {}
  }

  const view = detachedBetViews[sideKey];
  if (view && !view.webContents.isDestroyed()) {
    try {
      view.webContents.destroy();
    } catch (_) {}
  }

  detachedBetWindows[sideKey] = null;
  detachedBetViews[sideKey] = null;
  if (shouldClearPayload) detachedWindowPayload[sideKey] = null;
  detachedToolbarHeights[sideKey] = 94;
  clearDetachedFallbackTimer(sideKey);
}

function syncDetachedWindowsWithMainState(stateName) {
  const target = String(stateName || '').trim().toLowerCase();

  // 1) Sincroniza janelas destacadas internas (BrowserWindow).
  ['bet1', 'bet2'].forEach((key) => {
    const win = detachedBetWindows[key];
    if (!win || win.isDestroyed()) return;
    try {
      if (target === 'minimized') {
        win.minimize();
        return;
      }
      if (target === 'normal') {
        if (win.isMinimized()) win.restore();
        if (!win.isVisible()) win.show();
        fitDetachedView(key);
      }
    } catch (_) {}
  });

  // 2) Sincroniza navegadores externos gerenciados (Chrome/Edge via CDP).
  if (!hasActiveManagedBrowserWindows()) return;

  const hasLeft = hasManagedBrowserContext('bet1', managedChromeState.bet1 && managedChromeState.bet1.browserKind);
  const hasRight = hasManagedBrowserContext('bet2', managedChromeState.bet2 && managedChromeState.bet2.browserKind);
  const fullBounds = getDetachedSideBounds('bet1', { single: true });
  const leftBounds = getDetachedSideBounds('bet1');
  const rightBounds = getDetachedSideBounds('bet2');

  const ops = [];
  ['bet1', 'bet2'].forEach((side) => {
    const st = managedChromeState[side];
    const kind = st.browserKind || 'chrome';
    if (!hasManagedBrowserContext(side, kind)) return;
    if (target === 'minimized') {
      ops.push(setManagedChromeWindowState(side, 'minimized', null, kind));
      return;
    }
    if (target === 'normal') {
      const bounds = (hasLeft && hasRight)
        ? (side === 'bet2' ? rightBounds : leftBounds)
        : fullBounds;
      ops.push(setManagedChromeWindowState(side, 'normal', bounds, kind));
    }
  });

  if (ops.length) {
    Promise.allSettled(ops).catch(() => {});
  }
}

function arrangeDetachedBetWindows() {
  const leftWin = detachedBetWindows.bet1;
  const rightWin = detachedBetWindows.bet2;
  const hasLeft = Boolean(leftWin && !leftWin.isDestroyed());
  const hasRight = Boolean(rightWin && !rightWin.isDestroyed());
  if (!hasLeft && !hasRight) return;

  if (DETACHED_SIDEBAR_MODE) {
    applySidebarMainWindowLayout();
  }

  if (hasLeft && hasRight) {
    const leftBounds = getDetachedSideBounds('bet1');
    const rightBounds = getDetachedSideBounds('bet2');
    try {
      leftWin.setBounds(leftBounds, false);
      fitDetachedView('bet1');
    } catch (_) {}
    try {
      rightWin.setBounds(rightBounds, false);
      fitDetachedView('bet2');
    } catch (_) {}
    return;
  }

  const key = hasLeft ? 'bet1' : 'bet2';
  const win = hasLeft ? leftWin : rightWin;
  const fullBounds = getDetachedSideBounds(key, { single: true });
  try {
    win.setBounds(fullBounds, false);
    fitDetachedView(key);
  } catch (_) {}
}

function tileDetachedBetWindows() {
  arrangeDetachedBetWindows();
}

function openDetachedBetWindow(side, url, title, bookmaker = '', eventName = '') {
  if (!isValidHttpUrl(url)) return null;
  const key = side === 'bet2' ? 'bet2' : 'bet1';
  let win = detachedBetWindows[key];
  const sideLabel = key === 'bet2' ? 'Casa 2' : 'Casa 1';

  detachedWindowPayload[key] = buildDetachedPayload(
    key,
    url,
    bookmaker,
    eventName || title || sideLabel
  );

  if (!win || win.isDestroyed()) {
    win = new BrowserWindow({
      width: 1360,
      height: 920,
      minWidth: 560,
      minHeight: 620,
      icon: APP_WINDOW_ICON,
      show: false,
      frame: false,
      autoHideMenuBar: true,
      resizable: true,
      movable: true,
      backgroundColor: '#0f1724',
      webPreferences: {
        preload: path.join(__dirname, 'detached-preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
      },
    });

    win.once('ready-to-show', () => {
      if (!win || win.isDestroyed()) return;
      win.show();
      fitDetachedView(key);
      win.focus();
    });

    const fit = () => fitDetachedView(key);
    win.on('resize', fit);
    win.on('show', fit);
    win.on('maximize', fit);
    win.on('unmaximize', fit);

    win.on('closed', () => {
      if (detachedBetWindows[key] === win) {
        cleanupDetachedWindow(key);
      }
    });

    win.webContents.on('did-finish-load', () => {
      sendDetachedPayload(key);
      const view = ensureDetachedView(key);
      const payload = detachedWindowPayload[key];
      const targetUrl = String((payload && payload.link) || '').trim();
      if (view && !view.webContents.isDestroyed() && isValidHttpUrl(targetUrl)) {
        loadDetachedUrl(key, targetUrl, 'ui-ready');
      }
      fitDetachedView(key);
    });

    win.loadFile(path.join(__dirname, 'src', 'detached', 'index.html'));
    detachedBetWindows[key] = win;
  }

  try {
    if (title) win.setTitle(String(title));

    const view = ensureDetachedView(key);
    if (view && !view.webContents.isDestroyed()) {
      loadDetachedUrl(key, String(url).trim(), 'open-window');
    }

    sendDetachedPayload(key);

    if (!win.isVisible()) win.show();
    win.focus();
    return win;
  } catch (err) {
    logger.write('error', 'DETACHED_BROWSER', 'Falha ao abrir janela destacada', {
      side: key,
      url,
      error: String(err && err.message ? err.message : err),
    });
    return null;
  }
}

function findDetachedWindowKeyBySender(senderWebContents) {
  if (!senderWebContents) return null;
  const senderId = senderWebContents.id;
  if (!Number.isFinite(senderId)) return null;
  for (const key of ['bet1', 'bet2']) {
    const win = detachedBetWindows[key];
    if (win && !win.isDestroyed() && win.webContents && win.webContents.id === senderId) {
      return key;
    }
  }
  return null;
}

function applyDetachedWindowAction(key, actionRaw) {
  const win = detachedBetWindows[key];
  if (!win || win.isDestroyed()) return;

  try {
    if (actionRaw === 'minimize') {
      win.minimize();
      return;
    }
    if (actionRaw === 'maximize') {
      if (DETACHED_SIDEBAR_MODE) {
        arrangeDetachedBetWindows();
        win.focus();
        return;
      }
      if (win.isMaximized()) win.unmaximize();
      else win.maximize();
      win.focus();
      return;
    }
    if (actionRaw === 'close') {
      win.close();
      cleanupDetachedWindow(key);
      const hasLeft = detachedBetWindows.bet1 && !detachedBetWindows.bet1.isDestroyed();
      const hasRight = detachedBetWindows.bet2 && !detachedBetWindows.bet2.isDestroyed();
      if (!hasLeft && !hasRight) {
        restoreMainWindowFromSidebarLayout();
      }
    }
  } catch (_) {}
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: DETACHED_SIDEBAR_MODE ? 320 : 1024,
    minHeight: DETACHED_SIDEBAR_MODE ? 620 : 700,
    icon: APP_WINDOW_ICON,
    frame: false,
    resizable: true,
    transparent: false,
    backgroundColor: '#0a0f1a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
    },
    show: false,
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'loading', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
    keepDashboardAboveBrowsers();
  });

  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('maximize-change', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('maximize-change', false);
  });

  mainWindow.on('minimize', () => {
    syncDetachedWindowsWithMainState('minimized');
  });

  mainWindow.on('restore', () => {
    syncDetachedWindowsWithMainState('normal');
    arrangeDetachedBetWindows();
    keepDashboardAboveBrowsers();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

ipcMain.on('navigate-to-login', () => {
  if (mainWindow) {
    mainWindow.loadFile(path.join(__dirname, 'src', 'login', 'index.html'));
  }
});

ipcMain.on('navigate-to-dashboard', () => {
  if (mainWindow) {
    mainWindow.loadFile(path.join(__dirname, 'src', 'dashboard', 'index.html'));
  }
});

ipcMain.handle('get-socket-config', () => {
  const fallbackSocketUrl = getDefaultSocketUrl();
  const resolvedUrl = String(socketUrl || process.env.SOCKET_URL || fallbackSocketUrl)
    .trim()
    .replace(/\s+/g, '')
    .replace(/\/+$/, '');
  return {
    url: resolvedUrl || fallbackSocketUrl,
    token: socketToken || null,
  };
});

ipcMain.handle('get-app-info', () => ({
  name: String((appPackage && appPackage.productName) || app.getName() || 'Octosure'),
  version: String(app.getVersion() || (appPackage && appPackage.version) || ''),
}));

ipcMain.handle('set-socket-token', (_event, { token, url } = {}) => {
  socketToken = token || null;
  socketUrl = url || null;
});

ipcMain.handle('clear-socket-token', () => {
  socketToken = null;
  socketUrl = null;
});

ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-force-maximize', () => {
  if (!mainWindow) return;
  try {
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isMaximized()) mainWindow.maximize();
    mainWindow.show();
    mainWindow.focus();
  } catch (_) {}
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.on('open-bet-windows', (_event, payload = {}) => {
  const link1 = String(payload.link1 || '').trim();
  const link2 = String(payload.link2 || '').trim();
  const bookmaker1 = String(payload.bookmaker1 || '').trim();
  const bookmaker2 = String(payload.bookmaker2 || '').trim();
  const event1 = String(payload.event1 || '').trim();
  const event2 = String(payload.event2 || '').trim();
  const browserPref = normalizeExternalBrowserPref(payload.browserPref || payload.browser || '');
  const has1 = isValidHttpUrl(link1);
  const has2 = isValidHttpUrl(link2);

  logger.write('info', 'BETANO_SYNC', 'open-bet-windows', {
    has1,
    has2,
    bookmaker1,
    bookmaker2,
    link1,
    link2,
    browserPref,
  });

  // Atualiza payload global mesmo quando abrir externamente (Chrome/Edge),
  // para que a regra de layout 70/30 da Pinnacle seja aplicada.
  detachedWindowPayload.bet1 = buildDetachedPayload('bet1', link1, bookmaker1, event1);
  detachedWindowPayload.bet2 = buildDetachedPayload('bet2', link2, bookmaker2, event2);

  if (!has1 && !has2) return;
  if (DETACHED_SIDEBAR_MODE) {
    applySidebarMainWindowLayout();
  }

  if (browserPref) {
    ['bet1', 'bet2'].forEach((key) => {
      const win = detachedBetWindows[key];
      if (win && !win.isDestroyed()) {
        try {
          win.close();
        } catch (_) {}
      }
      cleanupDetachedWindow(key, { clearPayload: false });
    });
    Promise.resolve(openDetachedExternally(link1, link2, {
      browserPref,
      bookmaker1,
      bookmaker2,
      event1,
      event2,
    })).catch(() => {});
    return;
  }

  const forceExternal1 = shouldForceExternalForUrl(link1);
  const forceExternal2 = shouldForceExternalForUrl(link2);
  const forceAnyExternal = forceExternal1 || forceExternal2;

  if (forceAnyExternal) {
    ['bet1', 'bet2'].forEach((key) => {
      const win = detachedBetWindows[key];
      if (win && !win.isDestroyed()) {
        try {
          win.close();
        } catch (_) {}
      }
      cleanupDetachedWindow(key, { clearPayload: false });
    });

    Promise.resolve(openDetachedExternally(
      forceExternal1 ? link1 : '',
      forceExternal2 ? link2 : '',
      {
        browserPref,
        bookmaker1,
        bookmaker2,
        event1,
        event2,
      }
    )).catch(() => {});
    return;
  }

  let opened1 = null;
  let opened2 = null;

  if (has1) {
    opened1 = openDetachedBetWindow('bet1', link1, makeDetachedWindowTitle('Casa 1', bookmaker1, event1), bookmaker1, event1);
  }
  if (has2) {
    opened2 = openDetachedBetWindow('bet2', link2, makeDetachedWindowTitle('Casa 2', bookmaker2, event2), bookmaker2, event2);
  }

  arrangeDetachedBetWindows();
  if (opened1) {
    try {
      opened1.focus();
    } catch (_) {}
  }
});

ipcMain.on('prime-bet-windows', (_event, payload = {}) => {
  const browserPref = normalizeExternalBrowserPref(payload.browserPref || payload.browser || '');
  Promise.resolve(
    prewarmDetachedBrowserWindows(browserPref, { explicitPrime: true })
  ).catch(() => {});
});

ipcMain.on('toggle-detached-layout', (_event, payload = {}) => {
  const mode = String((payload && payload.mode) || '').trim().toLowerCase();
  if (!mainWindow || mainWindow.isDestroyed()) return;

  if (mode === 'expand') {
    restoreMainWindowFromSidebarLayout();
    try {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isMaximized()) mainWindow.maximize();
      mainWindow.show();
      mainWindow.focus();
    } catch (_) {}
    return;
  }

  if (mode === 'collapse') {
    if (DETACHED_SIDEBAR_MODE) {
      applySidebarMainWindowLayout();
    }

    if (hasActiveManagedBrowserWindows()) {
      const leftBounds = getDetachedSideBounds('bet1');
      const rightBounds = getDetachedSideBounds('bet2');
      ['bet1', 'bet2'].forEach((side) => {
        const st = managedChromeState[side];
        const kind = st.browserKind || 'chrome';
        if (!hasManagedBrowserContext(side, kind)) return;
        const sideBounds = side === 'bet2' ? rightBounds : leftBounds;
        Promise.resolve(
          setManagedChromeWindowState(side, 'normal', sideBounds, kind)
        ).catch(() => {});
      });
    } else {
      arrangeDetachedBetWindows();
      ['bet1', 'bet2'].forEach((key) => {
        const win = detachedBetWindows[key];
        if (!win || win.isDestroyed()) return;
        try {
          win.show();
        } catch (_) {}
      });
    }

    try {
      mainWindow.show();
      mainWindow.focus();
    } catch (_) {}
  }
});

ipcMain.on('close-bet-windows', () => {
  if (hasActiveManagedBrowserWindows()) {
    const ops = [];
    ['bet1', 'bet2'].forEach((side) => {
      const st = managedChromeState[side];
      const kind = (st && st.browserKind) || 'chrome';
      if (!hasManagedBrowserContext(side, kind)) return;
      ops.push(setManagedChromeWindowState(side, 'minimized', null, kind));
    });
    Promise.all(ops).catch(() => {});
    restoreMainWindowFromSidebarLayout();
    return;
  }

  ['bet1', 'bet2'].forEach((key) => {
    const win = detachedBetWindows[key];
    if (win && !win.isDestroyed()) {
      try {
        win.close();
      } catch (_) {}
    }
    cleanupDetachedWindow(key);
  });
  restoreMainWindowFromSidebarLayout();
});

ipcMain.on('control-bet-window', (_event, payload = {}) => {
  const sideRaw = String(payload.side || '').trim().toLowerCase();
  const actionRaw = String(payload.action || '').trim().toLowerCase();
  const key = (sideRaw === 'bet2' || sideRaw === '2' || sideRaw === 'right') ? 'bet2' : 'bet1';

  if (hasActiveManagedBrowserWindows()) {
    const st = managedChromeState[key];
    const kind = (st && st.browserKind) || 'chrome';
    if (actionRaw === 'minimize' || actionRaw === 'close') {
      Promise.resolve(setManagedChromeWindowState(key, 'minimized', null, kind)).catch(() => {});
      return;
    }
    if (actionRaw === 'maximize') {
      Promise.resolve(setManagedChromeWindowState(key, 'normal', null, kind)).catch(() => {});
      return;
    }
  }

  applyDetachedWindowAction(key, actionRaw);
});

ipcMain.on('detached-window-control', (event, payload = {}) => {
  const key = findDetachedWindowKeyBySender(event && event.sender ? event.sender : null);
  if (!key) return;
  const actionRaw = String(payload.action || '').trim().toLowerCase();
  applyDetachedWindowAction(key, actionRaw);
});

ipcMain.on('detached-ui-ready', (event, payload = {}) => {
  const key = findDetachedWindowKeyBySender(event && event.sender ? event.sender : null);
  if (!key) return;
  const toolbarHeight = Number(payload && payload.toolbarHeight);
  if (Number.isFinite(toolbarHeight) && toolbarHeight > 20) {
    detachedToolbarHeights[key] = Math.max(70, Math.min(240, Math.floor(toolbarHeight)));
  }
  fitDetachedView(key);
  sendDetachedPayload(key);
});

ipcMain.handle('detached-copy-text', (_event, payload = {}) => {
  const text = typeof payload === 'string'
    ? payload
    : String((payload && payload.text) || '');
  const value = text.trim();
  if (!value) return false;
  try {
    clipboard.writeText(value);
    return true;
  } catch (_) {
    return false;
  }
});

function normalizeUpdateNotes(raw) {
  if (!raw) return '';
  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (!item) return '';
        if (typeof item === 'string') return item.trim();
        if (item.note) return String(item.note).trim();
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }
  return String(raw).trim();
}

function emitUpdateStatus() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try {
    mainWindow.webContents.send('app-update-status', { ...updateState });
  } catch (_) {}
}

function setUpdateState(status, patch = {}) {
  updateState.status = String(status || 'idle');
  updateState.checkedAt = Date.now();
  Object.assign(updateState, patch || {});
  emitUpdateStatus();
}

async function checkForAppUpdates(trigger = 'manual') {
  if (!updatesEnabled || !autoUpdater) {
    setUpdateState('disabled', {
      enabled: false,
      error: '',
    });
    return { ok: false, reason: 'disabled' };
  }
  if (updateCheckInFlight) {
    return { ok: false, reason: 'busy' };
  }

  updateCheckInFlight = true;
  try {
    logger.write('info', 'APP_UPDATE', 'check:start', { trigger });
    setUpdateState('checking', { enabled: true, error: '' });
    await autoUpdater.checkForUpdates();
    logger.write('info', 'APP_UPDATE', 'check:requested', { trigger });
    return { ok: true };
  } catch (err) {
    const message = String((err && err.message) || err || 'Falha ao verificar atualizacao.');
    logger.write('warn', 'APP_UPDATE', 'check:error', { trigger, message });
    setUpdateState('error', {
      enabled: true,
      error: message,
    });
    return { ok: false, reason: 'error', message };
  } finally {
    updateCheckInFlight = false;
  }
}

function stopAppUpdateLoop() {
  if (updateCheckTimer) {
    clearInterval(updateCheckTimer);
    updateCheckTimer = null;
  }
}

function restartAndInstallUpdate() {
  if (!updatesEnabled || !autoUpdater) {
    return false;
  }
  try {
    setImmediate(() => {
      try {
        autoUpdater.quitAndInstall(false, true);
      } catch (_) {}
    });
    return true;
  } catch (_) {
    return false;
  }
}

function setupAutoUpdater() {
  if (!autoUpdater) {
    logger.write('warn', 'APP_UPDATE', 'bootstrap:missing-module', {
      message: 'electron-updater nao encontrado. Execute npm install para ativar atualizacoes.',
    });
    setUpdateState('disabled', {
      enabled: false,
      error: 'electron-updater nao instalado',
    });
    return;
  }

  if (!app.isPackaged && !OCTOSURE_ALLOW_DEV_UPDATES) {
    logger.write('info', 'APP_UPDATE', 'bootstrap:dev-skip', {
      packaged: app.isPackaged,
    });
    setUpdateState('disabled', {
      enabled: false,
      error: '',
    });
    return;
  }

  updatesEnabled = true;
  updateState.enabled = true;
  updateState.provider = OCTOSURE_UPDATE_FEED_URL || '';

  try {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.allowPrerelease = false;
    autoUpdater.allowDowngrade = false;
  } catch (_) {}

  if (OCTOSURE_UPDATE_FEED_URL) {
    try {
      autoUpdater.setFeedURL({
        provider: 'generic',
        url: OCTOSURE_UPDATE_FEED_URL,
      });
    } catch (err) {
      logger.write('warn', 'APP_UPDATE', 'bootstrap:set-feed-failed', {
        url: OCTOSURE_UPDATE_FEED_URL,
        message: String((err && err.message) || err),
      });
    }
  }

  if (!autoUpdater.__octosureListenersAttached) {
    autoUpdater.on('checking-for-update', () => {
      setUpdateState('checking', {
        enabled: true,
        error: '',
      });
    });

    autoUpdater.on('update-available', (info = {}) => {
      logger.write('info', 'APP_UPDATE', 'update-available', {
        version: info.version || '',
      });
      setUpdateState('update-available', {
        enabled: true,
        updateAvailable: true,
        updateDownloaded: false,
        version: String(info.version || ''),
        releaseDate: info.releaseDate ? String(info.releaseDate) : '',
        releaseName: String(info.releaseName || ''),
        notes: normalizeUpdateNotes(info.releaseNotes || info.notes || ''),
        error: '',
      });
    });

    autoUpdater.on('update-not-available', (info = {}) => {
      setUpdateState('up-to-date', {
        enabled: true,
        updateAvailable: false,
        updateDownloaded: false,
        version: String(info.version || ''),
        releaseDate: '',
        releaseName: '',
        notes: '',
        error: '',
      });
    });

    autoUpdater.on('download-progress', (progress = {}) => {
      setUpdateState('downloading', {
        enabled: true,
        updateAvailable: true,
        updateDownloaded: false,
        downloadPercent: Number(progress.percent || 0),
        downloadTransferred: Number(progress.transferred || 0),
        downloadTotal: Number(progress.total || 0),
        downloadSpeed: Number(progress.bytesPerSecond || 0),
        error: '',
      });
    });

    autoUpdater.on('update-downloaded', (info = {}) => {
      const payload = {
        enabled: true,
        updateAvailable: true,
        updateDownloaded: true,
        version: String(info.version || ''),
        releaseDate: info.releaseDate ? String(info.releaseDate) : '',
        releaseName: String(info.releaseName || ''),
        notes: normalizeUpdateNotes(info.releaseNotes || info.notes || ''),
        error: '',
      };
      logger.write('info', 'APP_UPDATE', 'update-downloaded', payload);
      setUpdateState('update-downloaded', payload);
      if (mainWindow && !mainWindow.isDestroyed()) {
        try {
          mainWindow.webContents.send('app-update-ready', { ...payload });
        } catch (_) {}
      }
    });

    autoUpdater.on('error', (err) => {
      const message = String((err && err.message) || err || 'Falha no auto-updater.');
      logger.write('error', 'APP_UPDATE', 'updater-error', { message });
      setUpdateState('error', {
        enabled: true,
        error: message,
      });
    });

    autoUpdater.__octosureListenersAttached = true;
  }

  stopAppUpdateLoop();
  updateCheckTimer = setInterval(() => {
    checkForAppUpdates('interval').catch(() => {});
  }, OCTOSURE_UPDATE_INTERVAL_MS);

  checkForAppUpdates('startup').catch(() => {});
}

ipcMain.handle('log', (_event, { level, category, message, data } = {}) => {
  logger.write(level || 'info', category, message || '', data);
});

ipcMain.handle('app-update-get-state', () => ({ ...updateState }));

ipcMain.handle('app-update-check-now', async () => {
  const result = await checkForAppUpdates('renderer');
  return {
    ...result,
    state: { ...updateState },
  };
});

ipcMain.handle('app-update-restart-install', () => {
  const ok = restartAndInstallUpdate();
  return { ok };
});

app.whenReady().then(() => {
  if (process.platform === 'win32') {
    try {
      app.setAppUserModelId(OCTOSURE_APP_ID);
    } catch (_) {}
  }
  logger.startSession();
  logger.write('info', 'BETANO_SYNC', 'session:init', {
    chromePorts: managedChromePorts,
    edgePorts: managedEdgePorts,
    profileRunTag: managedProfileRunTag,
  });
  createWindow();
  startBetanoOddsSyncLoop();
  setupAutoUpdater();
});

app.on('window-all-closed', () => {
  stopBetanoOddsSyncLoop();
  stopAppUpdateLoop();
  app.quit();
});

app.on('before-quit', () => {
  stopBetanoOddsSyncLoop();
  stopAppUpdateLoop();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
