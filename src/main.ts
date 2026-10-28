import './style.css';
import { CHARACTERS, getChar, type CharacterDef } from './characters';
import { Game, KO_TARGET, type KillEvent, type NetHooks, type ScoreRow, type Slot } from './game';
import { ELEMENT_ICONS } from './icons';
import { NetClient } from './net';
import type { BotInfo, LobbyPlayer, ServerMessage } from '../shared/protocol';

type Screen = 'menu' | 'lobby' | 'game' | 'end';

const BOT_NAMES = ['Ember Bot', 'Glacier Bot', 'Cyclone Bot', 'Riptide Bot', 'Piston Bot', 'Sprout Bot'];

const state = {
  screen: 'menu' as Screen,
  char: localStorage.getItem('ec-char') ?? 'blaze',
  name: localStorage.getItem('ec-name') ?? '',
  size: Number(localStorage.getItem('ec-size') ?? 4),
  online: false,
  myId: '',
  code: '',
  hostId: '',
  roomSize: 4,
  roomBots: true,
  lobby: [] as LobbyPlayer[],
  connecting: false,
};
if (![2, 4, 5].includes(state.size)) state.size = 4;

const game = new Game(document.getElementById('app')!);
game.startDemo();

let net: NetClient | null = null;

const ui = document.getElementById('ui')!;
ui.innerHTML = `
  <button id="char-btn" class="char-btn" aria-haspopup="dialog" aria-expanded="false"></button>
  <div id="char-panel" class="char-panel hidden" role="dialog" aria-label="Choose your character"></div>
  <section id="menu" class="screen"></section>
  <section id="lobby" class="screen hidden"></section>
  <section id="hud" class="hud hidden"></section>
  <section id="end" class="screen hidden"></section>
  <div id="toast" class="toast hidden"></div>
`;

const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T;
const charBtn = $('#char-btn');
const charPanel = $('#char-panel');
const menuEl = $('#menu');
const lobbyEl = $('#lobby');
const hudEl = $('#hud');
const endEl = $('#end');
const toastEl = $('#toast');

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const playerName = () => state.name.trim() || 'Player';

function badge(def: CharacterDef, size = '') {
  return `<span class="badge ${size}" style="--c:${def.css}">${ELEMENT_ICONS[def.id] ?? ''}</span>`;
}

let toastTimer = 0;
function toast(msg: string) {
  toastEl.textContent = msg;
  toastEl.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.add('hidden'), 3500);
}

function show(screen: Screen) {
  state.screen = screen;
  menuEl.classList.toggle('hidden', screen !== 'menu');
  lobbyEl.classList.toggle('hidden', screen !== 'lobby');
  hudEl.classList.toggle('hidden', screen !== 'game');
  endEl.classList.toggle('hidden', screen !== 'end');
  document.body.dataset.screen = screen;
  if (screen === 'menu') renderMenu();
  if (screen === 'lobby') renderLobby();
}

// ---------------- character picker (top-right) ----------------

function renderCharButton() {
  const def = getChar(state.char);
  charBtn.innerHTML = `${badge(def, 'sm')}<span class="char-btn-text"><small>Character</small><strong>${def.name}</strong></span><span class="caret">&#9662;</span>`;
  charBtn.style.setProperty('--c', def.css);
}

function powerList(def: CharacterDef) {
  return `<ol class="powers">${def.abilities
    .map(
      (a, i) => `<li class="${i === 8 ? 'ult' : ''}"><kbd>${i + 1}</kbd><div><strong>${a.name}</strong><span>${a.desc}</span></div><em>${a.cd}s</em></li>`,
    )
    .join('')}</ol>`;
}

function renderCharPanel() {
  const sel = getChar(state.char);
  charPanel.innerHTML = `
    <div class="panel-head">
      <div><h2>Choose your fighter</h2><p>Switch any time, even mid-match. Press <kbd>C</kbd> to toggle.</p></div>
      <button class="icon-btn" data-close aria-label="Close">&times;</button>
    </div>
    <div class="char-list">
      ${CHARACTERS.map(
        (c) => `
        <button class="char-card ${c.id === sel.id ? 'active' : ''}" data-char="${c.id}" style="--c:${c.css}">
          ${badge(c)}
          <span class="char-card-body">
            <strong>${c.name}</strong>
            <span class="element">${c.element}</span>
            <span class="stats"><span>HP ${c.hp}</span><span>SPD ${c.speed}</span></span>
          </span>
        </button>`,
      ).join('')}
    </div>
    <div class="char-detail" style="--c:${sel.css}">
      <div class="char-detail-head">${badge(sel, 'lg')}<div><h3>${sel.name} <span>${sel.element}</span></h3><p>${sel.tagline}</p></div></div>
      ${powerList(sel)}
    </div>`;
}

function openCharPanel(open: boolean) {
  charPanel.classList.toggle('hidden', !open);
  charBtn.setAttribute('aria-expanded', String(open));
  if (open) {
    renderCharPanel();
    game.releasePointer();
  }
}

function selectChar(id: string) {
  state.char = id;
  localStorage.setItem('ec-char', id);
  renderCharButton();
  renderCharPanel();
  if (state.screen === 'menu') renderShowcase();
  if (state.online) net?.send({ t: 'char', char: id });
  if (game.running && !game.demo && game.localId) {
    game.changeChar(game.localId, id);
    buildAbilityBar();
  }
}

charBtn.addEventListener('click', () => openCharPanel(charPanel.classList.contains('hidden')));
charPanel.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  if (t.closest('[data-close]')) return openCharPanel(false);
  const card = t.closest<HTMLElement>('[data-char]');
  if (card) selectChar(card.dataset.char!);
});
window.addEventListener('keydown', (e) => {
  const tag = (e.target as HTMLElement).tagName;
  if (tag === 'INPUT') return;
  if (e.code === 'KeyC') openCharPanel(charPanel.classList.contains('hidden'));
  if (e.code === 'Escape') openCharPanel(false);
});
document.addEventListener('mousedown', (e) => {
  const t = e.target as HTMLElement;
  if (!charPanel.classList.contains('hidden') && !t.closest('#char-panel') && !t.closest('#char-btn')) openCharPanel(false);
});

// ---------------- menu ----------------

function renderShowcase() {
  const def = getChar(state.char);
  const el = $('#showcase', menuEl);
  if (!el) return;
  el.style.setProperty('--c', def.css);
  el.innerHTML = `
    <div class="showcase-head">${badge(def, 'xl')}<div><span class="eyebrow">Selected fighter</span><h2>${def.name}</h2><p class="element">${def.element}</p></div></div>
    <p class="tagline">${def.tagline}</p>
    ${powerList(def)}
    <button class="btn ghost" data-open-chars>Change character</button>`;
}

function renderMenu() {
  menuEl.innerHTML = `
    <div class="menu-wrap">
      <div class="menu-card">
        <div class="brand">
          <span class="logo"></span>
          <div>
            <h1>Elemental Clash</h1>
            <p>Six elemental fighters. One huge arena. Every player for themselves.</p>
          </div>
        </div>
        <label class="field">
          <span>Fighter name</span>
          <input id="name-input" maxlength="16" placeholder="Player" value="${esc(state.name)}" autocomplete="off" />
        </label>
        <div class="field">
          <span>Fighters in the arena</span>
          <div class="seg" role="radiogroup">
            ${[2, 4, 5].map((n) => `<button role="radio" aria-checked="${n === state.size}" class="${n === state.size ? 'on' : ''}" data-size="${n}">${n} players</button>`).join('')}
          </div>
        </div>
        <div class="mode-grid">
          <button class="btn primary big" id="btn-single">
            <strong>Single Player</strong>
            <small>You vs ${state.size - 1} bot${state.size - 1 === 1 ? '' : 's'}</small>
          </button>
          <button class="btn big" id="btn-create" ${state.connecting ? 'disabled' : ''}>
            <strong>Multiplayer</strong>
            <small>Create a ${state.size}-player online room</small>
          </button>
        </div>
        <div class="join-row">
          <input id="join-code" maxlength="4" placeholder="ROOM CODE" autocomplete="off" />
          <button class="btn" id="btn-join" ${state.connecting ? 'disabled' : ''}>Join room</button>
        </div>
        <div class="controls">
          <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Move</span>
          <span><kbd class="wide">Space</kbd> Jump</span>
          <span><kbd>1</kbd>&ndash;<kbd>9</kbd> Powers</span>
          <span><kbd>Mouse</kbd> Aim</span>
          <span><kbd>C</kbd> Characters</span>
        </div>
        <p class="touch-note">This game needs a keyboard and mouse.</p>
      </div>
      <aside class="showcase" id="showcase"></aside>
    </div>`;
  renderShowcase();
  const nameInput = $<HTMLInputElement>('#name-input', menuEl);
  nameInput.addEventListener('input', () => {
    state.name = nameInput.value;
    localStorage.setItem('ec-name', state.name);
  });
  menuEl.querySelectorAll<HTMLElement>('[data-size]').forEach((b) =>
    b.addEventListener('click', () => {
      state.size = Number(b.dataset.size);
      localStorage.setItem('ec-size', String(state.size));
      renderMenu();
    }),
  );
  $('#btn-single', menuEl).addEventListener('click', startSingle);
  $('#btn-create', menuEl).addEventListener('click', createRoom);
  const codeInput = $<HTMLInputElement>('#join-code', menuEl);
  codeInput.addEventListener('input', () => (codeInput.value = codeInput.value.toUpperCase().replace(/[^A-Z]/g, '')));
  codeInput.addEventListener('keydown', (e) => e.key === 'Enter' && joinRoom(codeInput.value));
  $('#btn-join', menuEl).addEventListener('click', () => joinRoom(codeInput.value));
}

menuEl.addEventListener('click', (e) => {
  if ((e.target as HTMLElement).closest('[data-open-chars]')) openCharPanel(true);
});

// ---------------- single player ----------------

function startSingle() {
  state.online = false;
  const slots: Slot[] = [{ id: 'you', name: playerName(), charId: state.char, kind: 'local' }];
  const pool = CHARACTERS.map((c) => c.id).filter((c) => c !== state.char);
  for (let i = 1; i < state.size; i++) {
    const c = pool.splice(Math.floor(Math.random() * pool.length), 1)[0] ?? CHARACTERS[i % CHARACTERS.length].id;
    slots.push({ id: `bot-${i}`, name: BOT_NAMES[i - 1], charId: c, kind: 'bot' });
  }
  beginMatch(slots, true, null);
}

function beginMatch(slots: Slot[], ownsBots: boolean, hooks: NetHooks | null) {
  openCharPanel(false);
  game.startMatch(slots, { ownsBots, net: hooks });
  killfeed.length = 0;
  buildHud();
  show('game');
}

// ---------------- online ----------------

async function ensureNet(): Promise<NetClient | null> {
  if (net?.connected) return net;
  state.connecting = true;
  renderMenu();
  const n = new NetClient();
  try {
    await n.connect();
  } catch (err) {
    state.connecting = false;
    renderMenu();
    toast((err as Error).message);
    return null;
  }
  state.connecting = false;
  net = n;
  n.on(onServer);
  n.onClose = () => {
    net = null;
    if (state.online) {
      state.online = false;
      toast('Disconnected from the game server.');
      backToMenu();
    }
  };
  return n;
}

async function createRoom() {
  const n = await ensureNet();
  n?.send({ t: 'create', name: playerName(), char: state.char, size: state.size, bots: true });
}

async function joinRoom(code: string) {
  code = code.trim().toUpperCase();
  if (code.length !== 4) return toast('Room codes are 4 letters.');
  const n = await ensureNet();
  n?.send({ t: 'join', code, name: playerName(), char: state.char });
}

function hooksFor(n: NetClient): NetHooks {
  return {
    sendState: (s) => n.send({ t: 'state', s }),
    sendCast: (id, i, o, d, dist, slam) => n.send({ t: 'cast', id, i, o, d, dist, slam }),
    sendDied: (id, by) => n.send({ t: 'died', id, by }),
  };
}

function onServer(msg: ServerMessage) {
  switch (msg.t) {
    case 'joined':
      state.online = true;
      state.myId = msg.id;
      state.code = msg.code;
      state.hostId = msg.hostId;
      state.roomSize = msg.size;
      state.roomBots = msg.bots;
      state.lobby = msg.players;
      show('lobby');
      break;
    case 'lobby':
      state.hostId = msg.hostId;
      state.roomSize = msg.size;
      state.roomBots = msg.bots;
      state.lobby = msg.players;
      if (state.screen === 'lobby') renderLobby();
      if (state.screen === 'end') renderEndButtons();
      break;
    case 'error':
      toast(msg.message);
      break;
    case 'start':
      startOnline(msg.players, msg.bots, msg.hostId);
      break;
    case 'left': {
      const who = state.lobby.find((p) => p.id === msg.id);
      state.lobby = state.lobby.filter((p) => p.id !== msg.id);
      game.removeFighter(msg.id);
      if (who) toast(`${who.name} left the room.`);
      if (state.screen === 'lobby') renderLobby();
      break;
    }
    case 'host':
      state.hostId = msg.id;
      game.setOwnsBots(msg.id === state.myId);
      if (msg.id === state.myId) toast('You are now the host.');
      if (state.screen === 'lobby') renderLobby();
      if (state.screen === 'end') renderEndButtons();
      break;
    case 'state':
      game.applyRemoteState(msg.s);
      break;
    case 'cast':
      game.applyRemoteCast(msg.id, msg.i, msg.o, msg.d, msg.dist, msg.slam);
      break;
    case 'died':
      game.applyRemoteDied(msg.id, msg.by);
      break;
  }
}

function startOnline(players: LobbyPlayer[], bots: BotInfo[], hostId: string) {
  if (!net) return;
  state.hostId = hostId;
  state.lobby = players;
  const slots: Slot[] = [
    ...players.map((p) => ({
      id: p.id,
      name: p.name,
      charId: p.id === state.myId ? state.char : p.char,
      kind: (p.id === state.myId ? 'local' : 'remote') as Slot['kind'],
    })),
    ...bots.map((b) => ({ id: b.id, name: b.name, charId: b.char, kind: 'bot' as const })),
  ];
  beginMatch(slots, hostId === state.myId, hooksFor(net));
}

function renderLobby() {
  const isHost = state.hostId === state.myId;
  const humans = state.lobby.length;
  const botCount = state.roomBots ? Math.max(0, state.roomSize - humans) : 0;
  const canStart = humans + botCount >= 2;
  const rows: string[] = state.lobby.map((p) => {
    const def = getChar(p.id === state.myId ? state.char : p.char);
    return `<li style="--c:${def.css}">${badge(def, 'sm')}<span class="who"><strong>${esc(p.name)}</strong><small>${def.name} &middot; ${def.element}</small></span>${p.id === state.hostId ? '<span class="tag">Host</span>' : ''}${p.id === state.myId ? '<span class="tag you">You</span>' : ''}</li>`;
  });
  for (let i = humans; i < state.roomSize; i++) {
    rows.push(
      state.roomBots
        ? `<li class="empty"><span class="badge sm bot">AI</span><span class="who"><strong>Bot</strong><small>Fills this slot if nobody joins</small></span></li>`
        : `<li class="empty"><span class="badge sm">?</span><span class="who"><strong>Open slot</strong><small>Waiting for a player&hellip;</small></span></li>`,
    );
  }
  lobbyEl.innerHTML = `
    <div class="lobby-card">
      <div class="lobby-head">
        <div>
          <span class="eyebrow">Online room &middot; ${state.roomSize} players</span>
          <h2>Room <span class="code">${state.code}</span></h2>
          <p>Friends join by entering this code on the main menu. Open a second tab to test it yourself.</p>
        </div>
        <button class="btn ghost" id="copy-code">Copy code</button>
      </div>
      <ul class="lobby-list">${rows.join('')}</ul>
      <label class="toggle ${isHost ? '' : 'disabled'}">
        <input type="checkbox" id="bots-toggle" ${state.roomBots ? 'checked' : ''} ${isHost ? '' : 'disabled'} />
        <span>Fill empty slots with bots</span>
      </label>
      <div class="lobby-actions">
        <button class="btn" id="leave-room">Leave</button>
        ${
          isHost
            ? `<button class="btn primary" id="start-room" ${canStart ? '' : 'disabled'}>Start match</button>`
            : `<span class="waiting">Waiting for the host to start&hellip;</span>`
        }
      </div>
    </div>`;
  $('#copy-code', lobbyEl).addEventListener('click', () => {
    navigator.clipboard?.writeText(state.code).then(() => toast('Room code copied.'), () => toast(`Room code: ${state.code}`));
  });
  $('#leave-room', lobbyEl).addEventListener('click', leaveRoom);
  $<HTMLInputElement>('#bots-toggle', lobbyEl).addEventListener('change', (e) => {
    net?.send({ t: 'bots', bots: (e.target as HTMLInputElement).checked });
  });
  $('#start-room', lobbyEl)?.addEventListener('click', () => net?.send({ t: 'start' }));
}

function leaveRoom() {
  net?.send({ t: 'leave' });
  state.online = false;
  backToMenu();
}

function backToMenu() {
  game.stopMatch();
  game.startDemo();
  show('menu');
}

// ---------------- HUD ----------------

const killfeed: { html: string; at: number }[] = [];
let slotEls: { root: HTMLElement; cd: HTMLElement; txt: HTMLElement }[] = [];

function buildHud() {
  hudEl.innerHTML = `
    <div class="hud-player" id="hud-player"></div>
    <ol class="hud-score" id="hud-score"></ol>
    <div class="hud-timer"><strong id="hud-time">3:00</strong><span>First to ${KO_TARGET} KOs</span></div>
    <button class="btn ghost small hud-leave" id="hud-leave">Leave match</button>
    <ul class="killfeed" id="killfeed"></ul>
    <div class="crosshair"><span></span><i id="hitmarker"></i></div>
    <div class="respawn hidden" id="respawn"></div>
    <div class="lock-hint" id="lock-hint">Click the arena to aim with your mouse &middot; <kbd>Esc</kbd> to release</div>
    <div class="vignette" id="vignette"></div>
    <div class="abilities" id="abilities"></div>`;
  $('#hud-leave', hudEl).addEventListener('click', () => (state.online ? leaveRoom() : backToMenu()));
  buildAbilityBar();
}

function buildAbilityBar() {
  const bar = $('#abilities', hudEl);
  if (!bar) return;
  const def = getChar(state.char);
  bar.style.setProperty('--c', def.css);
  bar.innerHTML = def.abilities
    .map(
      (a, i) => `<button class="slot ${i === 8 ? 'ult' : ''}" data-i="${i}" title="${a.name}: ${a.desc} (${a.cd}s cooldown)">
        <kbd>${i + 1}</kbd><span class="slot-name">${a.name}</span><span class="slot-cd"></span><span class="slot-txt"></span>
      </button>`,
    )
    .join('');
  slotEls = [...bar.querySelectorAll<HTMLElement>('.slot')].map((root) => ({
    root,
    cd: root.querySelector<HTMLElement>('.slot-cd')!,
    txt: root.querySelector<HTMLElement>('.slot-txt')!,
  }));
  bar.querySelectorAll<HTMLElement>('.slot').forEach((s) =>
    s.addEventListener('click', () => game.pressAbility(Number(s.dataset.i))),
  );
}

function nameTag(r: ScoreRow) {
  const def = getChar(r.charId);
  return `<b style="color:${def.css}">${esc(r.name)}</b>`;
}

game.onKill = (e: KillEvent) => {
  const html = e.killer ? `${nameTag(e.killer)} <span>KO'd</span> ${nameTag(e.victim)}` : `${nameTag(e.victim)} <span>was KO'd</span>`;
  killfeed.unshift({ html, at: performance.now() });
  if (killfeed.length > 5) killfeed.pop();
};

let hitTimer = 0;
game.onHit = () => {
  const h = document.getElementById('hitmarker');
  if (!h) return;
  h.classList.add('on');
  clearTimeout(hitTimer);
  hitTimer = window.setTimeout(() => h.classList.remove('on'), 120);
};

let hurtTimer = 0;
game.onLocalDamaged = () => {
  const v = document.getElementById('vignette');
  if (!v || v.classList.contains('on')) return;
  v.classList.add('on');
  clearTimeout(hurtTimer);
  hurtTimer = window.setTimeout(() => v.classList.remove('on'), 160);
};

game.onEnd = (rows) => {
  showEnd(rows);
};

let lastHud = '';
function updateHud() {
  if (state.screen !== 'game') return;
  const s = game.localStatus();
  if (!s) return;
  const t = Math.ceil(game.timeLeft());
  $('#hud-time', hudEl).textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;

  const chips = [
    s.shielded && '<span class="chip shield">Shielded</span>',
    s.stunned && '<span class="chip stun">Frozen</span>',
    s.slowed && '<span class="chip slow">Slowed</span>',
    s.burning && '<span class="chip burn">Burning</span>',
    s.hasted && '<span class="chip haste">Hasted</span>',
    s.protected && '<span class="chip">Spawn shield</span>',
  ]
    .filter(Boolean)
    .join('');
  const hpFrac = Math.max(0, s.hp / s.def.hp);
  const playerHtml = `
    <div class="hp-row" style="--c:${s.def.css}">${badge(s.def)}<div class="hp-col">
      <div class="hp-name"><strong>${esc(playerName())}</strong><span>${s.def.name} &middot; ${s.def.element}</span></div>
      <div class="hp-bar"><i style="width:${(hpFrac * 100).toFixed(1)}%" class="${hpFrac < 0.3 ? 'low' : ''}"></i><span>${Math.ceil(s.hp)} / ${s.def.hp}</span></div>
      <div class="chips">${chips}</div>
    </div></div>`;
  const scoreHtml = game
    .scoreboard()
    .map((r, i) => {
      const def = getChar(r.charId);
      return `<li class="${r.isYou ? 'you' : ''} ${r.alive ? '' : 'dead'}" style="--c:${def.css}"><em>${i + 1}</em><span class="dot"></span><span class="n">${esc(r.name)}</span><b>${r.kills}</b><small>${r.deaths}</small></li>`;
    })
    .join('');
  const now = performance.now();
  while (killfeed.length && now - killfeed[killfeed.length - 1].at > 6000) killfeed.pop();
  const feedHtml = killfeed.map((k) => `<li>${k.html}</li>`).join('');
  const key = playerHtml + scoreHtml + feedHtml;
  if (key !== lastHud) {
    lastHud = key;
    $('#hud-player', hudEl).innerHTML = playerHtml;
    $('#hud-score', hudEl).innerHTML = `<li class="head"><em>#</em><span class="dot"></span><span class="n">Fighter</span><b>KO</b><small>D</small></li>${scoreHtml}`;
    $('#killfeed', hudEl).innerHTML = feedHtml;
  }

  s.cds.forEach((c, i) => {
    const el = slotEls[i];
    if (!el) return;
    const frac = c.total > 0 ? c.left / c.total : 0;
    el.cd.style.transform = `scaleY(${frac})`;
    el.txt.textContent = c.left > 0 ? (c.left >= 1 ? Math.ceil(c.left).toString() : c.left.toFixed(1)) : '';
    el.root.classList.toggle('ready', c.left <= 0 && s.alive && !s.stunned);
  });

  const respawn = $('#respawn', hudEl);
  respawn.classList.toggle('hidden', s.alive);
  if (!s.alive) respawn.innerHTML = `<strong>Knocked out!</strong><span>Respawning in ${Math.ceil(s.respawnIn)}&hellip;</span>`;
  $('#lock-hint', hudEl).classList.toggle('hidden', game.pointerLocked);
}

// ---------------- end screen ----------------

function showEnd(rows: ScoreRow[]) {
  const winner = rows[0];
  const def = winner ? getChar(winner.charId) : getChar(state.char);
  const youWon = !!winner?.isYou;
  endEl.innerHTML = `
    <div class="end-card" style="--c:${def.css}">
      <span class="eyebrow">Match over</span>
      <div class="winner">${badge(def, 'xl')}<div><h2>${youWon ? 'Victory!' : `${esc(winner?.name ?? 'Nobody')} wins`}</h2><p>${def.name} &middot; ${winner?.kills ?? 0} KOs</p></div></div>
      <table class="results">
        <thead><tr><th>#</th><th>Fighter</th><th>Character</th><th>KOs</th><th>Deaths</th></tr></thead>
        <tbody>${rows
          .map((r, i) => {
            const d = getChar(r.charId);
            return `<tr class="${r.isYou ? 'you' : ''}"><td>${i + 1}</td><td>${esc(r.name)}</td><td style="color:${d.css}">${d.name}</td><td>${r.kills}</td><td>${r.deaths}</td></tr>`;
          })
          .join('')}</tbody>
      </table>
      <div class="end-actions" id="end-actions"></div>
    </div>`;
  renderEndButtons();
  show('end');
}

function renderEndButtons() {
  const el = document.getElementById('end-actions');
  if (!el) return;
  if (!state.online) {
    el.innerHTML = `<button class="btn" id="end-menu">Main menu</button><button class="btn primary" id="end-again">Play again</button>`;
    $('#end-again', el).addEventListener('click', startSingle);
    $('#end-menu', el).addEventListener('click', backToMenu);
  } else {
    const isHost = state.hostId === state.myId;
    el.innerHTML = `<button class="btn" id="end-leave">Leave room</button>${
      isHost ? `<button class="btn primary" id="end-rematch">Rematch</button>` : `<span class="waiting">Waiting for the host to start a rematch&hellip;</span>`
    }`;
    $('#end-leave', el).addEventListener('click', leaveRoom);
    $('#end-rematch', el)?.addEventListener('click', () => net?.send({ t: 'start' }));
  }
}

// ---------------- boot ----------------

renderCharButton();
show('menu');
const hudLoop = () => {
  updateHud();
  requestAnimationFrame(hudLoop);
};
requestAnimationFrame(hudLoop);
