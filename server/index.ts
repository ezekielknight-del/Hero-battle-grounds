import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';
import type { BotInfo, ClientMessage, LobbyPlayer, ServerMessage } from '../shared/protocol.ts';

const PORT = Number(process.env.PORT ?? process.env.SERVER_PORT ?? 47322);
const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const CHAR_IDS = ['frost', 'blaze', 'verdant', 'tide', 'turbo', 'gale'];
const BOT_NAMES = ['Ember Bot', 'Glacier Bot', 'Cyclone Bot', 'Riptide Bot', 'Piston Bot', 'Sprout Bot'];

interface Client {
  id: string;
  ws: WebSocket;
  name: string;
  char: string;
  room: Room | null;
}

interface Room {
  code: string;
  size: number;
  bots: boolean;
  hostId: string;
  started: boolean;
  clients: Map<string, Client>;
}

const rooms = new Map<string, Room>();
let nextId = 1;

const MIME: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
};

const http = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (url.pathname === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size }));
    return;
  }
  // Serves the production build (npm run build) so one process can host the whole game.
  let file = normalize(join(DIST, decodeURIComponent(url.pathname)));
  if (!file.startsWith(DIST)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const s = await stat(file).catch(() => null);
    if (!s || s.isDirectory()) file = join(DIST, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Build not found. Run `npm run build`, or use `npm run dev` for development.');
  }
});

const wss = new WebSocketServer({ server: http, path: '/ws' });

function send(c: Client, msg: ServerMessage) {
  if (c.ws.readyState === WebSocket.OPEN) c.ws.send(JSON.stringify(msg));
}

function broadcast(room: Room, msg: ServerMessage, except?: string) {
  const data = JSON.stringify(msg);
  for (const c of room.clients.values()) {
    if (c.id !== except && c.ws.readyState === WebSocket.OPEN) c.ws.send(data);
  }
}

function lobbyPlayers(room: Room): LobbyPlayer[] {
  return [...room.clients.values()].map((c) => ({ id: c.id, name: c.name, char: c.char }));
}

function sendLobby(room: Room) {
  broadcast(room, {
    t: 'lobby',
    hostId: room.hostId,
    size: room.size,
    bots: room.bots,
    players: lobbyPlayers(room),
    started: room.started,
  });
}

function makeCode(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  for (;;) {
    let code = '';
    for (let i = 0; i < 4; i++) code += letters[Math.floor(Math.random() * letters.length)];
    if (!rooms.has(code)) return code;
  }
}

function cleanName(name: unknown): string {
  const s = typeof name === 'string' ? name.trim().slice(0, 16) : '';
  return s || 'Player';
}

function cleanChar(char: unknown): string {
  return typeof char === 'string' && CHAR_IDS.includes(char) ? char : 'blaze';
}

function leaveRoom(c: Client) {
  const room = c.room;
  if (!room) return;
  room.clients.delete(c.id);
  c.room = null;
  if (room.clients.size === 0) {
    rooms.delete(room.code);
    return;
  }
  broadcast(room, { t: 'left', id: c.id });
  if (room.hostId === c.id) {
    room.hostId = room.clients.keys().next().value!;
    broadcast(room, { t: 'host', id: room.hostId });
  }
  sendLobby(room);
}

function startMatch(room: Room) {
  room.started = true;
  const players = lobbyPlayers(room);
  const bots: BotInfo[] = [];
  if (room.bots) {
    for (let i = players.length; i < room.size; i++) {
      bots.push({
        id: `bot-${room.code}-${i}-${Date.now() % 100000}`,
        name: BOT_NAMES[i % BOT_NAMES.length],
        char: CHAR_IDS[Math.floor(Math.random() * CHAR_IDS.length)],
      });
    }
  }
  broadcast(room, { t: 'start', players, bots, hostId: room.hostId });
}

wss.on('connection', (ws) => {
  const client: Client = { id: `p${nextId++}`, ws, name: 'Player', char: 'blaze', room: null };

  ws.on('message', (raw) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    const room = client.room;
    switch (msg.t) {
      case 'create': {
        leaveRoom(client);
        const size = [2, 4, 5].includes(msg.size) ? msg.size : 4;
        const r: Room = {
          code: makeCode(),
          size,
          bots: !!msg.bots,
          hostId: client.id,
          started: false,
          clients: new Map(),
        };
        client.name = cleanName(msg.name);
        client.char = cleanChar(msg.char);
        r.clients.set(client.id, client);
        client.room = r;
        rooms.set(r.code, r);
        send(client, { t: 'joined', id: client.id, code: r.code, hostId: r.hostId, size: r.size, bots: r.bots, players: lobbyPlayers(r) });
        break;
      }
      case 'join': {
        const code = String(msg.code ?? '').trim().toUpperCase();
        const r = rooms.get(code);
        if (!r) return send(client, { t: 'error', message: `No room with code ${code || '(empty)'}.` });
        if (r.started) return send(client, { t: 'error', message: 'That match already started. Wait for it to finish.' });
        if (r.clients.size >= r.size) return send(client, { t: 'error', message: 'That room is full.' });
        leaveRoom(client);
        client.name = cleanName(msg.name);
        client.char = cleanChar(msg.char);
        r.clients.set(client.id, client);
        client.room = r;
        send(client, { t: 'joined', id: client.id, code: r.code, hostId: r.hostId, size: r.size, bots: r.bots, players: lobbyPlayers(r) });
        sendLobby(r);
        break;
      }
      case 'char':
        client.char = cleanChar(msg.char);
        if (room && !room.started) sendLobby(room);
        break;
      case 'bots':
        if (room && room.hostId === client.id) {
          room.bots = !!msg.bots;
          sendLobby(room);
        }
        break;
      case 'start':
        if (room && room.hostId === client.id) {
          const total = room.clients.size + (room.bots ? room.size - room.clients.size : 0);
          if (total < 2) return send(client, { t: 'error', message: 'Need at least 2 fighters. Invite a friend or enable bots.' });
          startMatch(room);
        }
        break;
      case 'leave':
        leaveRoom(client);
        break;
      case 'state':
      case 'cast':
      case 'died':
        if (room && room.started) broadcast(room, msg, client.id);
        break;
    }
  });

  ws.on('close', () => leaveRoom(client));
});

http.listen(PORT, '0.0.0.0', () => {
  console.log(`Elemental Battleground server listening on http://0.0.0.0:${PORT} (WebSocket at /ws)`);
});
