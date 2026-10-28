# Elemental Clash

A 3D PVP arena brawler that runs in the browser. Six elemental fighters battle in a huge stadium. You can play single player against bots, or online with 2, 4 or 5 players.

## Fighters

| Fighter | Element | Style |
| --- | --- | --- |
| Frost | Ice | Round snow brawler in a blue cap. Slows and freezes enemies |
| Blaze | Fire | Masked muscle-house. All-out offense, sets enemies on fire |
| Verdant | Green energy | A cactus. Homing orbs, healing and a huge energy cannon |
| Tide | Water | One-eyed dockhand with a bottle. Knockback, bubbles and whirlpools |
| Turbo | Car powers | Screen-faced robot with a blaster arm. Tanky rammer |
| Gale | Air | Wind-blown kid in a huge scarf, and an airbender |

Each fighter has 9 powers on keys `1`–`9`, and no two fighters share a power. Frost chills and then shatters chilled enemies. Blaze's shots explode and his fire follows him. Verdant heals by dealing damage and can teleport. Tide pushes, reels, and launches people. Turbo rams, lays mines, and bounces shots. Gale's blade comes back, and his wind throws everyone around. Power `9` is an ultimate with a long cooldown.

## Controls

| Input | Action |
| --- | --- |
| `W` `A` `S` `D` | Move |
| `Space` | Jump |
| `1`–`9` | Use powers |
| Mouse | Aim and turn the camera (click the arena to lock the mouse, `Esc` to release) |
| Left click | Power 1 |
| `←` / `→` | Turn the camera without a mouse |
| `C` or the **Character** button (top right) | Open the character list. You can switch fighters at any time, even mid-match. |

Aiming snaps a little toward enemies near your crosshair. Matches last 3 minutes. The first fighter to 10 KOs wins, otherwise whoever has the most KOs when time runs out.

## Modes

- **Single Player**: you against bots. Choose 2, 4 or 5 fighters in total.
- **Multiplayer**: create a 2-, 4- or 5-player room and share the 4-letter code. Friends enter the code on the main menu to join. The host can fill empty slots with bots. To try it alone, open a second browser tab and join your own room.

## Running locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

This starts two processes:

- the Vite dev server for the game at http://localhost:47321
- the WebSocket room server on port 47322 (Vite proxies `/ws` to it, so you only need to open the game URL)

To use different ports, set `WEB_PORT` (game) and/or `SERVER_PORT` (room server), for example `WEB_PORT=8000 npm run dev`.

To play with friends on the same network, share `http://<your-local-ip>:47321`.

### Production build

```bash
npm run build
PORT=8080 npm start
```

`npm start` serves the built game and the WebSocket server from a single port.

## Project layout

```
src/
  main.ts         menus, character picker, lobby, HUD, end screen
  game.ts         game loop: movement, physics, powers, bots, camera, net sync
  characters.ts   the six fighters and their nine powers
  arena.ts        stadium, platforms, pillars, lighting
  fighterMesh.ts  character models and name/health labels
  particles.ts    GPU particle system
  net.ts          WebSocket client
server/index.ts   room server (create/join rooms, relays game messages)
shared/protocol.ts  message types shared by the client and server
```

## How multiplayer works

The server only manages rooms and relays messages. Each player's browser simulates their own fighter and sends its position about 20 times a second. When someone uses a power, every client replays the same effect. Each client decides whether its own fighter got hit, then reports its health and any KO. The room host also runs the bots.
