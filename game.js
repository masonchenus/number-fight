(() => {
    'use strict';

    if (typeof window === 'undefined' || typeof document === 'undefined') {
        try { console.error('[Big Int Field] game.js loaded without window/document. Open index.html in a normal browser.'); } catch { }
        return;
    }

    const earlyOverlay = document.getElementById('debug-overlay');
    if (earlyOverlay) {
        earlyOverlay.classList.remove('hidden');
        earlyOverlay.textContent = 'DEBUG: game.js loading...';
    }

    try {
        let apiKey = "";
        try { apiKey = localStorage.getItem('bif_ai_key') || ""; } catch { }
        const canvas = document.getElementById('battlefield');
        const ctx = canvas.getContext('2d');
        const mCanvas = document.getElementById('minimap-canvas');
        const mCtx = mCanvas.getContext('2d');
        const gCanvas = document.getElementById('graph-canvas');
        const gCtx = gCanvas.getContext('2d');
        const genValInput = document.getElementById('gen-val');
        const genStatsEl = document.getElementById('gen-stats');
        const exactValInput = document.getElementById('exact-val');
        const exactStatsEl = document.getElementById('exact-stats');
        const seedInput = document.getElementById('rng-seed');
        const spawnDistSelect = document.getElementById('spawn-dist');
        const digitsMinInput = document.getElementById('digits-min');
        const digitsMaxInput = document.getElementById('digits-max');
        const spawnRateSlider = document.getElementById('spawn-rate-slider');
        const rateDisplay = document.getElementById('rate-display');
        const spawnDebug = document.getElementById('spawn-debug');
        const runtimeError = document.getElementById('runtime-error');
        const debugOverlay = document.getElementById('debug-overlay');
        const gesturePanel = document.getElementById('gesture-panel');
        const gestureActive = document.getElementById('gesture-active');
        const formationSelect = document.getElementById('formation-select');
        const pauseBtn = document.getElementById('pause-btn');
        const stepBtn = document.getElementById('step-btn');
        const centerSelectedBtn = document.getElementById('center-selected-btn');
        const simStatus = document.getElementById('sim-status');
        const timescaleSlider = document.getElementById('timescale-slider');
        const timescaleDisplay = document.getElementById('timescale-display');
        const lowFxBtn = document.getElementById('lowfx-btn');
        const ringsBtn = document.getElementById('rings-btn');
        const fogBtn = document.getElementById('fog-btn');
        const headlessBtn = document.getElementById('headless-btn');
        const drawDistSlider = document.getElementById('drawdist-slider');
        const drawDistDisplay = document.getElementById('drawdist-display');
        const fpsDisplay = document.getElementById('fps-display');
        const knowledgeDisplay = document.getElementById('knowledge-display');
        const presetToggleBtn = document.getElementById('preset-toggle-btn');
        const presetPanel = document.getElementById('preset-panel');
        const presetText = document.getElementById('preset-text');
        const presetExportBtn = document.getElementById('preset-export-btn');
        const presetImportBtn = document.getElementById('preset-import-btn');
        const presetSaveBtn = document.getElementById('preset-save-btn');
        const winsEvenEl = document.getElementById('wins-even');
        const winsOddEl = document.getElementById('wins-odd');
        const roundEl = document.getElementById('round-display');
        const winBanner = document.getElementById('win-banner');
        const winBannerTitle = document.getElementById('win-banner-title');
        const winBannerSub = document.getElementById('win-banner-sub');
        const aiKeyInput = document.getElementById('ai-key');
        const aiModeEl = document.getElementById('ai-mode');
        const helpBtn = document.getElementById('help-btn');
        const helpOverlay = document.getElementById('help-overlay');
        const helpCloseBtn = document.getElementById('help-close-btn');
        const selectedPanel = document.getElementById('selected-panel');
        const selectedCopyBtn = document.getElementById('selected-copy-btn');
        const selectedValueEl = document.getElementById('selected-value');
        const selectedEffEl = document.getElementById('selected-eff');
        const selectedTeamEl = document.getElementById('selected-team');
        const selectedRoleEl = document.getElementById('selected-role');
        const selectedAgeEl = document.getElementById('selected-age');
        const selectedTraitsEl = document.getElementById('selected-traits');

        const upgEvenWall = document.getElementById('upg-even-wall');
        const upgOddWall = document.getElementById('upg-odd-wall');
        const upgEvenHeal = document.getElementById('upg-even-heal');
        const upgOddHeal = document.getElementById('upg-odd-heal');
        const upgEvenSpawn = document.getElementById('upg-even-spawn');
        const upgOddSpawn = document.getElementById('upg-odd-spawn');
        const upgEvenTurret = document.getElementById('upg-even-turret');
        const upgOddTurret = document.getElementById('upg-odd-turret');
        const BUILD_ID = 'SPAWNDEBUG-2';

        const CONFIG = {
            maxEntities: 2000,
            fixedRadius: 22,
            worldSize: 10000,
            colors: { even: '#06b6d4', odd: '#d946ef', prime: '#4ade80', resistance: '#6366f1', projectile: '#f87171', cyclic: '#fbbf24', supernova: '#ffffff', corpse: '#444444', hazard: '#a855f7' },
            breedChance: 0.8,
            breedCooldown: 100,
            friction: 0.90,
            multipleInterval: 500
        };

        const CYCLIC_NUMS = { "142857": 7n, "0588235294117647": 17n, "052631578947368421": 19n };

        let width, height;
        let entities = [];
        let particles = [];
        let projectiles = [];
        let hazards = [];
        let corpses = [];
        let storms = [];
        let objectives = [];
        let frame = 0;
        let lastTime = performance.now();
        let spawnAccumulator = 0;
        let spawnedTotal = 0;
        let fpsEma = 60;
        let lastOverlayUpdate = 0;
        let nextEntityId = 1;
        let nextSquadId = 1;
        let spawnParityToggle = 'even';
        let controlledUnit = null;
        let popHistory = { even: [], odd: [] };
        const TEAM_KNOWLEDGE = { even: 0n, odd: 0n };
        const TEAM_KNOWLEDGE_MULT = { even: 1.0, odd: 1.0 };
        const TEAMS = { enabled: false }; // default: no teams until explicitly enabled
        const PAGE_TEAMS = (() => {
            try {
                const v = document?.body?.dataset?.teams;
                if (v === '1' || v === 'true') return true;
                if (v === '0' || v === 'false') return false;
            } catch { }
            return false;
        })();
        const PAGE_MODE = (() => {
            try { return String(document?.body?.dataset?.page || ''); } catch { }
            return '';
        })();
        setTeamsEnabled(PAGE_TEAMS);

        const SIM = {
            paused: false,
            stepOnce: false,
            timeScale: 1.0
        };

        const FX = {
            lowFx: true,
            showRings: false,
            drawDist: 1200,
            particleCap: 140,
            fogMinimap: false,
            headless: false,
            projectileCap: 1500,
            showDisaster: false
        };
        if (PAGE_MODE === 'freeplay') FX.showRings = true;

        const TEAM_UPGRADES = {
            even: { wall: 0, heal: 0, spawn: 0, turret: 0 },
            odd: { wall: 0, heal: 0, spawn: 0, turret: 0 }
        };

        const TURRET_STATE = {
            even: { accSmall: 0, accHoming: 0, accBig: 0, accHomingBig: 0, accExplode: 0, turretIdx: 0, angles: [0, 0] },
            odd: { accSmall: 0, accHoming: 0, accBig: 0, accHomingBig: 0, accExplode: 0, turretIdx: 0, angles: [Math.PI, Math.PI] }
        };

        const WALL_STATE = {
            even: { hp: 0n, max: 0n, brokenNotified: false },
            odd: { hp: 0n, max: 0n, brokenNotified: false }
        };

        const BASE_STATE = {
            even: { hp: 0n, max: 0n, destroyedNotified: false },
            odd: { hp: 0n, max: 0n, destroyedNotified: false }
        };

        const ENEMY_CACHE = { even: [], odd: [] };

        function setTeamsEnabled(flag) {
            TEAMS.enabled = !!flag;
            for (const e of entities) {
                if (!e) continue;
                // Team assignment stays as parity (even/odd). TEAMS.enabled only gates base/objective systems.
                const base = e.baseTeam || e.team;
                e.team = base;
            }
        }

        function baseMaxHp() {
            // Big enough to matter, small enough to end rounds.
            return 120_000_000n;
        }

        function syncBaseState({ refill = false } = {}) {
            for (const team of ['even', 'odd']) {
                const st = BASE_STATE[team];
                const max = baseMaxHp();
                const maxChanged = st.max !== max;
                st.max = max;
                if (refill || maxChanged || st.hp <= 0n) st.hp = max;
                if (st.hp > st.max) st.hp = st.max;
                if (st.hp < 0n) st.hp = 0n;
                if (st.hp > 0n) st.destroyedNotified = false;
            }
        }

        function wallMaxHpForLevel(lvl) {
            const L = Math.max(0, Math.min(10, Math.floor(Number(lvl) || 0)));
            if (L <= 0) return 0n;
            // Tuned so a max-level wall can be chewed through, but not instantly.
            return BigInt(2_000_000 + L * 3_000_000);
        }

        function syncWallState(team, { refill = false } = {}) {
            const lvl = TEAM_UPGRADES[team]?.wall || 0;
            const max = wallMaxHpForLevel(lvl);
            const st = WALL_STATE[team];
            if (!st) return;

            if (max <= 0n) {
                st.max = 0n;
                st.hp = 0n;
                st.brokenNotified = false;
                return;
            }

            const maxChanged = st.max !== max;
            st.max = max;
            if (refill || maxChanged || st.hp <= 0n) st.hp = max;
            if (st.hp > st.max) st.hp = st.max;
            if (st.hp < 0n) st.hp = 0n;
            if (st.hp > 0n) st.brokenNotified = false;
        }

        function damageWall(team, dmg, hitX, hitY) {
            const st = WALL_STATE[team];
            if (!st || st.hp <= 0n) return;
            const amount = typeof dmg === 'bigint' ? dmg : BigInt(dmg || 0);
            if (amount <= 0n) return;
            st.hp = st.hp > amount ? (st.hp - amount) : 0n;

            if (!FX.lowFx) {
                for (let i = 0; i < 6; i++) particles.push(new Particle(hitX, hitY, 'rgba(255,255,255,0.6)', 2.2));
                for (let i = 0; i < 4; i++) particles.push(new Particle(hitX, hitY, 'rgba(251,191,36,0.9)', 2.4));
            }

            if (st.hp <= 0n && !st.brokenNotified) {
                st.brokenNotified = true;
                logToAiPanel(`[WALL] ${team.toUpperCase()} wall BROKEN`);
            }
        }

        function tryHitEnemyWall(proj, dmg, { onHit = null } = {}) {
            if (!proj || !proj.team) return false;
            const enemy = proj.team === 'even' ? 'odd' : 'even';
            const st = WALL_STATE[enemy];
            if (!st || st.hp <= 0n) return false;
            const r = baseRect(enemy);
            if (!pointInRect(proj.x, proj.y, r)) return false;
            damageWall(enemy, dmg, proj.x, proj.y);
            if (typeof onHit === 'function') onHit();
            proj.life = 0;
            return true;
        }

        function damageBase(team, dmg, hitX, hitY) {
            const st = BASE_STATE[team];
            if (!st || st.hp <= 0n) return;
            const amount = typeof dmg === 'bigint' ? dmg : BigInt(dmg || 0);
            if (amount <= 0n) return;
            st.hp = st.hp > amount ? (st.hp - amount) : 0n;

            if (!FX.lowFx) {
                for (let i = 0; i < 10; i++) particles.push(new Particle(hitX, hitY, 'rgba(255,255,255,0.55)', 2.1));
                for (let i = 0; i < 8; i++) particles.push(new Particle(hitX, hitY, 'rgba(239,68,68,0.9)', 2.6));
            }

            if (st.hp <= 0n && !st.destroyedNotified) {
                st.destroyedNotified = true;
                logToAiPanel(`[BASE] ${team.toUpperCase()} base DESTROYED`);
            }
        }

        function tryHitEnemyBase(proj, dmg) {
            if (!proj || !proj.team) return false;
            const enemy = proj.team === 'even' ? 'odd' : 'even';
            const st = BASE_STATE[enemy];
            if (!st || st.hp <= 0n) return false;
            const r = baseRect(enemy);
            if (!pointInRect(proj.x, proj.y, r)) return false;
            damageBase(enemy, dmg, proj.x, proj.y);
            proj.life = 0;
            return true;
        }

        const ROUND = {
            round: 1,
            wins: { even: 0, odd: 0 },
            capture: { even: 0, odd: 0 },
            clock: 0 // seconds since round start
        };
        const ROUND_END = { active: false, winner: null, timer: 0 };

        const SQUAD_RETREAT = new Map(); // squadId -> frames left

        // Per-team kill leaderboard by number value (string).
        const KILL_BOARD = {
            even: { byValue: new Map(), top: null },
            odd: { byValue: new Map(), top: null }
        };

        const TEAM_KILLS = { even: 0, odd: 0 };

        // Performance: spatial hash grid for near-neighbor queries (avoids O(n^2) scans).
        const GRID = {
            cellSize: 220,
            map: new Map()
        };
        function gridCoord(v) { return Math.floor(v / GRID.cellSize); }
        function gridKey(cx, cy) { return `${cx},${cy}`; }
        function rebuildEntityGrid() {
            GRID.map.clear();
            for (const e of entities) {
                if (!e || e.dead) continue;
                const cx = gridCoord(e.x);
                const cy = gridCoord(e.y);
                const k = gridKey(cx, cy);
                let bucket = GRID.map.get(k);
                if (!bucket) { bucket = []; GRID.map.set(k, bucket); }
                bucket.push(e);
            }
        }
        function queryEntityGrid(x, y, range) {
            const minX = gridCoord(x - range);
            const maxX = gridCoord(x + range);
            const minY = gridCoord(y - range);
            const maxY = gridCoord(y + range);
            const out = [];
            for (let cx = minX; cx <= maxX; cx++) {
                for (let cy = minY; cy <= maxY; cy++) {
                    const bucket = GRID.map.get(gridKey(cx, cy));
                    if (!bucket) continue;
                    for (const e of bucket) out.push(e);
                }
            }
            return out;
        }

        function rebuildEnemyCacheMaybe() {
            if (frame % 8 !== 0) return;
            ENEMY_CACHE.even.length = 0;
            ENEMY_CACHE.odd.length = 0;
            for (const e of entities) {
                if (!e || e.dead || e.isDummy) continue;
                if (e.team === 'even') ENEMY_CACHE.odd.push(e); // enemies for ODD turrets
                else ENEMY_CACHE.even.push(e); // enemies for EVEN turrets
            }
        }

        function recordTeamKill(team) {
            if (team !== 'even' && team !== 'odd') return;
            TEAM_KILLS[team] = (TEAM_KILLS[team] || 0) + 1;
        }

        function recordKill(killer, victim, killerTeamOverride = null) {
            if (!victim) return;
            const kTeam = killerTeamOverride || killer?.team;
            if (!kTeam) return;
            recordTeamKill(kTeam);
            if (!killer || !killer.value) return;
            if (killer.dead || victim.dead) return;
            const board = KILL_BOARD[kTeam];
            if (!board) return;
            const val = killer.value.toString();
            const next = (board.byValue.get(val) || 0) + 1;
            board.byValue.set(val, next);
            if (!board.top || next > board.top.count) {
                board.top = { value: val, count: next };
            }
        }

        const MEETING_INTERVAL = 1100; // frames
        const MEETING_DURATION = 240; // frames

        const BASE = {
            pad: 140,
            w: 2600,
            h: 3600,
            graveInset: 260
        };

        const BASE_BREED_RATE = 6; // spawns per second per team
        let baseSpawnAccEven = 0;
        let baseSpawnAccOdd = 0;
        let initialBaseBurstDone = false;
        let playerSeeded = false;
        const ENTITY_UPDATES_PER_FRAME = 20;
        let entityUpdateCursor = 0;
        const RENDER = { skip: 0 };

        // Capture/income objective node (define early so spawnObjectives can use it before runtime).
        class ObjectiveNode {
            constructor(x, y) {
                this.x = x;
                this.y = y;
                this.r = 520;
                this.owner = null; // 'even' | 'odd' | null
                this.progress = 0; // -1..1
                this.pulse = Math.random() * Math.PI * 2;
                this.incomeAcc = 0;
            }
            update(dt) {
                this.pulse += dt * 2.0;
                const candidates = queryEntityGrid(this.x, this.y, this.r + 120);
                let ev = 0, od = 0;
                for (const e of candidates) {
                    if (!e || e.dead || e.isDummy) continue;
                    const d = Math.hypot(e.x - this.x, e.y - this.y);
                    if (d > this.r) continue;
                    if (e.team === 'even') ev++;
                    else od++;
                }

                const diff = ev - od;
                if (diff !== 0) {
                    const rate = 0.22; // capture speed
                    this.progress += Math.max(-1, Math.min(1, diff / 18)) * rate * dt;
                } else {
                    // Drift toward current owner slowly (prevents infinite stalemates).
                    const drift = 0.05 * dt;
                    if (this.owner === 'even') this.progress = Math.min(1, this.progress + drift);
                    else if (this.owner === 'odd') this.progress = Math.max(-1, this.progress - drift);
                    else this.progress *= (1 - 0.4 * dt);
                }
                this.progress = Math.max(-1, Math.min(1, this.progress));

                const prevOwner = this.owner;
                if (this.progress >= 1) this.owner = 'even';
                else if (this.progress <= -1) this.owner = 'odd';
                else if (Math.abs(this.progress) < 0.15) this.owner = null;

                if (this.owner !== prevOwner && (this.owner === 'even' || this.owner === 'odd')) {
                    logToAiPanel(`[NODE] captured by ${this.owner.toUpperCase()}`);
                }

                // Passive income for owning a node (feeds upgrades).
                if (this.owner === 'even' || this.owner === 'odd') {
                    const incomePerSec = 4200n;
                    this.incomeAcc += dt;
                    while (this.incomeAcc >= 0.25) {
                        this.incomeAcc -= 0.25;
                        TEAM_KNOWLEDGE[this.owner] += incomePerSec / 4n;
                    }
                }
            }
            draw(ctx) {
                const sx = (this.x - camera.x) * camera.zoom + width / 2;
                const sy = (this.y - camera.y) * camera.zoom + height / 2;
                const rr = this.r * camera.zoom;
                if (sx + rr < -80 || sy + rr < -80 || sx - rr > width + 80 || sy - rr > height + 80) return;

                ctx.save();
                const p = (this.progress + 1) / 2; // 0..1
                const col = this.owner === 'even'
                    ? 'rgba(6,182,212,0.22)'
                    : this.owner === 'odd'
                        ? 'rgba(217,70,239,0.22)'
                        : 'rgba(255,255,255,0.08)';

                ctx.fillStyle = col;
                ctx.beginPath();
                ctx.arc(sx, sy, rr, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = 'rgba(255,255,255,0.30)';
                ctx.lineWidth = 2;
                ctx.setLineDash([10, 10]);
                ctx.beginPath();
                ctx.arc(sx, sy, rr, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);

                // Progress ring
                ctx.strokeStyle = this.owner === 'even'
                    ? 'rgba(6,182,212,0.9)'
                    : this.owner === 'odd'
                        ? 'rgba(217,70,239,0.9)'
                        : 'rgba(251,191,36,0.85)';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(sx, sy, Math.max(0.1, 26 * camera.zoom), -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p);
                ctx.stroke();

                ctx.fillStyle = 'rgba(255,255,255,0.75)';
                ctx.font = `${10 * camera.zoom}px "JetBrains Mono"`;
                ctx.textAlign = 'center';
                ctx.fillText('NODE', sx, sy + 4 * camera.zoom);

                // small pulse sparkle
                const pr = (8 + Math.sin(this.pulse) * 2) * camera.zoom;
                ctx.strokeStyle = 'rgba(255,255,255,0.25)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(sx, sy, Math.max(0.1, pr), 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
        }

        function spawnObjectives() {
            if (!TEAMS.enabled) { objectives = []; return; }
            objectives = [];
            const pad = 1200;
            const mid = CONFIG.worldSize / 2;
            const pts = [
                { x: mid, y: mid },
                { x: pad, y: pad },
                { x: CONFIG.worldSize - pad, y: pad },
                { x: pad, y: CONFIG.worldSize - pad },
                { x: CONFIG.worldSize - pad, y: CONFIG.worldSize - pad }
            ];
            for (const p of pts) objectives.push(new ObjectiveNode(p.x, p.y));
        }

        function baseRect(team) {
            const y = (CONFIG.worldSize - BASE.h) / 2;
            if (team === 'even') return { x: BASE.pad, y, w: BASE.w, h: BASE.h };
            return { x: CONFIG.worldSize - BASE.pad - BASE.w, y, w: BASE.w, h: BASE.h };
        }

        function pointInRect(x, y, r) {
            return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
        }

        function baseCenter(team) {
            const r = baseRect(team);
            return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
        }

        function graveyardPoint(team) {
            const r = baseRect(team);
            const gx = team === 'even' ? (r.x + BASE.graveInset) : (r.x + r.w - BASE.graveInset);
            const gy = r.y + r.h - BASE.graveInset;
            return { x: gx, y: gy };
        }

        function drawBases() {
            if (!TEAMS.enabled) return;
            const drawOne = (team, stroke, fill) => {
                const r = baseRect(team);
                const wallLvl = TEAM_UPGRADES[team]?.wall || 0;
                const wallSt = WALL_STATE[team];
                const baseSt = BASE_STATE[team];
                const z = camera.zoom;
                const sx = (r.x - camera.x) * z + width / 2;
                const sy = (r.y - camera.y) * z + height / 2;
                const sw = r.w * z;
                const sh = r.h * z;
                if (sx + sw < -50 || sy + sh < -50 || sx > width + 50 || sy > height + 50) return;

                ctx.save();
                ctx.fillStyle = fill;
                ctx.strokeStyle = stroke;
                ctx.lineWidth = wallLvl > 0 ? (4 + Math.min(6, wallLvl)) : 2;
                if (wallLvl > 0 && wallSt && wallSt.hp > 0n) ctx.setLineDash([]);
                else ctx.setLineDash([10, 8]);
                ctx.fillRect(sx, sy, sw, sh);
                ctx.strokeRect(sx, sy, sw, sh);
                ctx.setLineDash([]);

                const g = graveyardPoint(team);
                const gx = (g.x - camera.x) * z + width / 2;
                const gy = (g.y - camera.y) * z + height / 2;
                ctx.fillStyle = 'rgba(255,255,255,0.22)';
                ctx.beginPath();
                ctx.arc(gx, gy, 14 * z, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = 'rgba(255,255,255,0.65)';
                ctx.font = `bold ${10 * z}px "JetBrains Mono"`;
                ctx.textAlign = 'left';
                const wallLabel = (wallLvl > 0)
                    ? ` (WALL L${wallLvl}${wallSt?.max ? ` ${Math.round(Number((wallSt.hp * 1000n) / wallSt.max)) / 10}%` : ''})`
                    : '';
                ctx.fillText(team.toUpperCase() + ` BASE${wallLabel}`, sx + 10, sy + 18);
                ctx.font = `${9 * z}px "JetBrains Mono"`;
                ctx.fillText('GRAVEYARD', gx + 10, gy + 4);

                // Turrets (clear, wall-mounted, facing outward)
                const turretLvl = TEAM_UPGRADES[team]?.turret || 0;
                if (turretLvl > 0) {
                    const turrets = getTurretEmplacements(team);
                    const tState = TURRET_STATE[team];
                    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
                    ctx.fillStyle = 'rgba(255,255,255,0.25)';
                    for (let i = 0; i < turrets.length; i++) {
                        const t = turrets[i];
                        const tx = (t.x - camera.x) * z + width / 2;
                        const ty = (t.y - camera.y) * z + height / 2;
                        ctx.beginPath();
                        ctx.arc(tx, ty, 10 * z, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.stroke();
                        // barrel shows last firing direction (defaults outward)
                        const dir = (tState?.angles && Number.isFinite(tState.angles[i])) ? tState.angles[i] : (team === 'even' ? 0 : Math.PI);
                        ctx.beginPath();
                        ctx.moveTo(tx, ty);
                        ctx.lineTo(tx + Math.cos(dir) * 20 * z, ty + Math.sin(dir) * 20 * z);
                        ctx.stroke();
                    }
                    ctx.font = `${9 * z}px "JetBrains Mono"`;
                    ctx.fillStyle = 'rgba(255,255,255,0.6)';
                    ctx.fillText(`TURRET L${turretLvl}`, sx + 10, sy + 34);
                }

                // Wall HP bar (very clear)
                if (wallLvl > 0 && wallSt && wallSt.max > 0n) {
                    const ratio = wallSt.max > 0n ? Number(wallSt.hp) / Number(wallSt.max) : 0;
                    const barW = Math.max(80, Math.min(sw - 20, 180 * z));
                    const barH = Math.max(5, 6 * z);
                    const bx = sx + 10;
                    const by = sy + (sh - 14 * z);
                    ctx.fillStyle = 'rgba(0,0,0,0.55)';
                    ctx.fillRect(bx, by, barW, barH);
                    ctx.fillStyle = wallSt.hp > 0n ? 'rgba(34,197,94,0.85)' : 'rgba(239,68,68,0.9)';
                    ctx.fillRect(bx, by, barW * Math.max(0, Math.min(1, ratio)), barH);
                    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(bx, by, barW, barH);
                }

                // Base HP bar (win condition)
                if (baseSt && baseSt.max > 0n) {
                    const ratio = baseSt.max > 0n ? Number(baseSt.hp) / Number(baseSt.max) : 0;
                    const barW = Math.max(120, Math.min(sw - 20, 260 * z));
                    const barH = Math.max(6, 7 * z);
                    const bx = sx + 10;
                    const by = sy + (sh - 28 * z);
                    ctx.fillStyle = 'rgba(0,0,0,0.6)';
                    ctx.fillRect(bx, by, barW, barH);
                    ctx.fillStyle = baseSt.hp > 0n ? 'rgba(239,68,68,0.85)' : 'rgba(127,29,29,0.9)';
                    ctx.fillRect(bx, by, barW * Math.max(0, Math.min(1, ratio)), barH);
                    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(bx, by, barW, barH);
                    ctx.fillStyle = 'rgba(255,255,255,0.65)';
                    ctx.font = `${8 * z}px "JetBrains Mono"`;
                    ctx.fillText(`BASE HP ${Math.round(ratio * 100)}%`, bx + 2, by - 2 * z);
                }
                ctx.restore();
            };

            drawOne('even', 'rgba(6,182,212,0.95)', 'rgba(6,182,212,0.07)');
            drawOne('odd', 'rgba(217,70,239,0.95)', 'rgba(217,70,239,0.07)');
        }

        function shieldWithShelter(unit) {
            const base = (unit.shieldMult || 1);
            const sheltered = unit.inBase ? 1.35 : 1.0;
            return base * sheltered;
        }

        function applyBaseWallDefense(team) {
            if (!TEAMS.enabled) return;
            const lvl = TEAM_UPGRADES[team]?.wall || 0;
            if (!lvl) return;
            if (!WALL_STATE[team] || WALL_STATE[team].hp <= 0n) return;
            const r = baseRect(team);
            const center = baseCenter(team);
            const range = Math.max(r.w, r.h) / 2 + 400;
            const candidates = queryEntityGrid(center.x, center.y, range);
            for (const u of candidates) {
                if (!u || u.dead || u.isDummy) continue;
                if (u.team === team) continue;
                if (!pointInRect(u.x, u.y, r)) continue;
                // Push intruders out and chip their value.
                const targetX = team === 'even' ? (r.x + r.w + 40) : (r.x - 40);
                u.vx += (targetX - u.x) * 0.02;
                u.vy += (center.y - u.y) * 0.01;
                const dmg = BigInt(200 + lvl * 200);
                u.value -= dmg;
                u.setBigValue(u.value);
            }
        }

        function getTurretEmplacements(team) {
            const r = baseRect(team);
            // Wall-mounted on the OUTSIDE edge, facing the other base.
            const x = team === 'even' ? (r.x + r.w + 30) : (r.x - 30);
            return [
                { x, y: r.y + 260 },
                { x, y: r.y + r.h - 260 }
            ];
        }

        function pickTurretTarget(team, range) {
            // Legacy (kept for compatibility) - prefer the cache-based picker below.
            const list = ENEMY_CACHE[team];
            if (!list || list.length === 0) return null;
            return list[(Math.random() * list.length) | 0] || null;
        }

        function turretUpdate(team, dt) {
            const lvl = TEAM_UPGRADES[team]?.turret || 0;
            if (!lvl) return;
            const state = TURRET_STATE[team];
            const turrets = getTurretEmplacements(team);
            const isMax = lvl >= 9;
            const ownR = baseRect(team);

            // "Infinite range": long life, but still culled eventually for perf.
            const BULLET_LIFE = 2400;
            const HOMING_LIFE = 2600;

            // Fire rates (shots/sec) – ramp up with level.
            const smallRate = isMax ? 20 : (4 + lvl * 1.4);
            const homingRate = isMax ? 20 : (lvl >= 6 ? (2 + (lvl - 6) * 2.5) : 0);
            const bigRate = isMax ? 5 : (lvl >= 5 ? (0.6 + (lvl - 5) * 0.6) : 0);
            const homingBigRate = isMax ? 5 : 0;
            const explodingRate = isMax ? 2 : 0;

            state.accSmall += dt * smallRate;
            state.accHoming += dt * homingRate;
            state.accBig += dt * bigRate;
            state.accHomingBig += dt * homingBigRate;
            state.accExplode += dt * explodingRate;

            // Limit total turret shots per frame for perf.
            let budget = 18;
            if (FX.lowFx) budget = 10;

            const shootFromNextTurret = () => {
                const idx = state.turretIdx % turrets.length;
                const t = turrets[idx];
                state.turretIdx++;
                return { idx, x: t.x, y: t.y };
            };

            const aimAngle = (from, target, { sprayChance = 0.45 } = {}) => {
                let ang;
                if (!target || Math.random() < sprayChance) {
                    ang = Math.random() * Math.PI * 2;
                } else {
                    ang = Math.atan2(target.y - from.y, target.x - from.x);
                }

                // Don't fire into our own base interior (turrets mount on the wall and shoot OUT).
                for (let i = 0; i < 6; i++) {
                    const px = from.x + Math.cos(ang) * 140;
                    const py = from.y + Math.sin(ang) * 140;
                    if (!pointInRect(px, py, ownR)) break;
                    ang = Math.random() * Math.PI * 2;
                }
                return ang;
            };

            while (budget > 0 && (state.accSmall >= 1 || state.accHoming >= 1 || state.accBig >= 1 || state.accHomingBig >= 1 || state.accExplode >= 1)) {
                // Priority at max level: mix types; otherwise mostly small.
                const order = isMax
                    ? ['accSmall', 'accHoming', 'accBig', 'accHomingBig', 'accExplode']
                    : ['accSmall', 'accBig', 'accHoming'];

                let fired = false;
                for (const key of order) {
                    if (state[key] < 1) continue;
                    state[key] -= 1;
                    const from = shootFromNextTurret();
                    const target = pickTurretTarget(team);
                    const ang = aimAngle(from, target);
                    if (state.angles && state.angles.length) state.angles[from.idx % state.angles.length] = ang;

                    if (key === 'accSmall') {
                        // Basic small bullets
                        const shotVal = BigInt(220 + lvl * 140);
                    projectiles.length < FX.projectileCap && projectiles.push(new FactorProjectile(from.x, from.y, shotVal, ang, team, BULLET_LIFE));
                } else if (key === 'accBig') {
                    const shotVal = BigInt(900 + lvl * 520);
                    projectiles.length < FX.projectileCap && projectiles.push(new BigBulletProjectile(from.x, from.y, shotVal, ang, team, BULLET_LIFE));
                } else if (key === 'accExplode') {
                    const shotVal = BigInt(300 + lvl * 140);
                    projectiles.length < FX.projectileCap && projectiles.push(new ExplodingBulletProjectile(from.x, from.y, shotVal, ang, team, BULLET_LIFE));
                } else if (key === 'accHoming') {
                    if (target) {
                        const shotVal = BigInt(200 + lvl * 120);
                        projectiles.length < FX.projectileCap && projectiles.push(new HomingBulletProjectile(from.x, from.y, shotVal, target, team, HOMING_LIFE, 15, 6));
                    }
                } else if (key === 'accHomingBig') {
                    if (target) {
                        const shotVal = BigInt(800 + lvl * 480);
                        projectiles.length < FX.projectileCap && projectiles.push(new HomingBulletProjectile(from.x, from.y, shotVal, target, team, HOMING_LIFE, 12, 12));
                    }
                }

                    fired = true;
                    budget--;
                    break;
                }
                if (!fired) break;
            }
        }

        function tierLabel(tier) {
            if (tier === 'super') return 'superbuffed';
            if (tier === 'mega') return 'mega-buffed';
            if (tier === 'ultra') return 'ultra-buffed';
            return 'normalz';
        }

        function applyBuffTier(unit, tier) {
            if (!unit || unit.dead) return;
            unit.buffTier = tier;
            unit.tier = tierLabel(tier);
            if (!unit.livesMax) unit.livesMax = 1;
            if (!unit.livesLeft) unit.livesLeft = unit.livesMax;
            if (tier === 'super') {
                unit.livesMax = 5;
                unit.livesLeft = unit.livesMax;
                unit.damageMult = (unit.damageMult || 1.0) * 10.0;
                unit.shieldMult = (unit.shieldMult || 1.0) * 2.0;
                unit.speedFactor = (unit.speedFactor || 1.0) * 1.08;
                unit.maxEffVal = bigIntMulFloat(unit.maxEffVal || unit.effVal || 1n, 15.0);
                unit.effVal = unit.maxEffVal;
                unit.evasion = (unit.evasion || 0) + 0.02;
                unit.aoe = { radius: 220, slow: 0.85, push: 0.010, interval: 10, baseDamage: 200n };
            } else if (tier === 'mega') {
                unit.livesMax = 14;
                unit.livesLeft = unit.livesMax;
                unit.damageMult = (unit.damageMult || 1.0) * 15.0;
                unit.shieldMult = (unit.shieldMult || 1.0) * 2.6;
                unit.speedFactor = (unit.speedFactor || 1.0) * 1.14;
                unit.maxEffVal = bigIntMulFloat(unit.maxEffVal || unit.effVal || 1n, 20.0);
                unit.effVal = unit.maxEffVal;
                unit.evasion = (unit.evasion || 0) + 0.05;
                unit.aoe = { radius: 340, slow: 0.70, push: 0.018, interval: 6, baseDamage: 200n };
            } else if (tier === 'ultra') {
                unit.livesMax = 30;
                unit.livesLeft = unit.livesMax;
                unit.damageMult = (unit.damageMult || 1.0) * 25.0;
                unit.shieldMult = (unit.shieldMult || 1.0) * 3.4;
                unit.speedFactor = (unit.speedFactor || 1.0) * 40.0;
                unit.maxEffVal = bigIntMulFloat(unit.maxEffVal || unit.effVal || 1n, 28.0);
                unit.effVal = unit.maxEffVal;
                unit.evasion = (unit.evasion || 0) + 0.12;
                unit.aoe = { radius: 520, slow: 0.45, push: 0.052, interval: 4, baseDamage: 400n };
            } else {
                // normal: 50% 1 life, 50% 2 lives
                unit.livesMax = Math.random() < 0.5 ? 1 : 2;
                unit.livesLeft = unit.livesMax;
                unit.aoe = null;
            }
        }

        function pickWeighted(weights) {
            const entries = Object.entries(weights);
            const total = entries.reduce((a, [, w]) => a + w, 0);
            let r = Math.random() * total;
            for (const [k, w] of entries) {
                r -= w;
                if (r <= 0) return k;
            }
            return entries[0]?.[0];
        }

        function rollBuffTier() {
            // Fixed distribution per request: 50% normal, 10% super, 20% mega, 20% ultra.
            const weights = { normal: 0.50, super: 0.10, mega: 0.20, ultra: 0.20 };
            return pickWeighted(weights);
        }

        function applySpawnUpgradeBias(unit, team, tier) {
            const lvl = TEAM_UPGRADES[team]?.spawn || 0;
            if (!lvl || !unit) return;

            // "More buffed modules": bias module assignments toward attack/defense as spawn upgrades increase.
            const bias = Math.min(6, lvl);
            const module = pickWeighted({
                attack: 1 + bias * 0.8,
                defense: 1 + bias * 0.7,
                support: 1 + bias * 0.4,
                swarm: 1,
                shield: 0.7 + bias * 0.25,
                trans: 0.6 + bias * 0.2
            });
            if (module) { unit.module = module; applyModule(unit); }

            // Small extra buff for super/mega spawned from upgraded bases.
            if (tier === 'super') unit.damageMult *= (1 + bias * 0.03);
            if (tier === 'mega') unit.damageMult *= (1 + bias * 0.04);
            if (tier === 'ultra') unit.damageMult *= (1 + bias * 0.05);
        }

        function applyAoeControl(unit) {
            if (!unit || unit.dead || unit.isDummy) return;
            const aoe = unit.aoe;
            if (!aoe) return;
            if (entities.length > 1200) return;
            if ((frame + unit.id) % aoe.interval !== 0) return;

            const candidates = queryEntityGrid(unit.x, unit.y, aoe.radius + CONFIG.fixedRadius + 40);
            const dmgMultInt = BigInt(Math.max(1, Math.round(unit.damageMult || 1)));
            const dmg = (aoe.baseDamage || 0n) * dmgMultInt;

            for (const e of candidates) {
                if (!e || e.dead || e.isDummy) continue;
                if (e.team === unit.team) continue;
                if (e.invulnTimer && e.invulnTimer > 0) continue;
                const dx = e.x - unit.x;
                const dy = e.y - unit.y;
                const d = Math.hypot(dx, dy);
                if (d <= 0.001 || d > aoe.radius) continue;
                const t = (aoe.radius - d) / aoe.radius;

                // Control: slow + push away.
                e.vx *= aoe.slow;
                e.vy *= aoe.slow;
                e.vx += dx * aoe.push * t;
                e.vy += dy * aoe.push * t;

                // Damage tick (value-based so it matters with eat/collision rules).
                if (dmg > 0n) {
                    e.value -= dmg;
                    e.setBigValue(e.value);
                }
            }
        }

        function isPowerOfTwoBigInt(n) {
            return typeof n === 'bigint' && n > 0n && (n & (n - 1n)) === 0n;
        }

        function spawnPowerOfTwoTreeSplits(parent) {
            if (!parent || parent.dead || parent.isDummy) return;
            if (parent.noPow2Split) return;
            const v = parent.value;
            if (!isPowerOfTwoBigInt(v) || v < 4n) return;

            let room = Math.max(0, CONFIG.maxEntities - entities.length);
            if (room === 0) return;

            // Safety caps: prevents 2^n from exploding the sim for huge exponents.
            const maxLevels = 12; // up to 4096 leaves at most (but also bounded by maxTotalSpawn)
            const maxTotalSpawn = Math.min(room, 260);

            let spawned = 0;
            let level = 0;
            let nodes = [{ value: v / 2n, count: 2 }];
            const baseX = parent.x;
            const baseY = parent.y;

            while (nodes.length > 0 && spawned < maxTotalSpawn && level < maxLevels) {
                const { value: childVal, count } = nodes.shift();
                if (childVal < 2n) continue;

                const nCount = Math.min(count, maxTotalSpawn - spawned);
                for (let i = 0; i < nCount; i++) {
                    const a = (i * 2.399963229728653 + level * 0.7) % (Math.PI * 2); // golden angle
                    const dist = 70 + level * 22 + (Math.random() * 18);
                    const nx = baseX + Math.cos(a) * dist + (Math.random() - 0.5) * 18;
                    const ny = baseY + Math.sin(a) * dist + (Math.random() - 0.5) * 18;
                    const u = new NumberUnit(nx, ny, childVal);
                    u.noPow2Split = true; // tree is fully expanded at root death; don't re-expand.
                    entities.push(u);
                    assignSquad(u);
                    spawned++;
                }

                // Continue splitting until 2s.
                if (childVal > 2n) {
                    nodes.push({ value: childVal / 2n, count: count * 2 });
                }

                level++;
            }

            if (spawned > 0) {
                for (let i = 0; i < Math.min(40, spawned); i++) particles.push(new Particle(baseX, baseY, '#93c5fd', 3));
            }
        }

        function spawnInBase(team, mv) {
            const r = baseRect(team);
            const x = r.x + randSpawn() * r.w;
            const y = r.y + randSpawn() * r.h;

            const randVal = generateSpawnValue(mv, team);
            const u = new NumberUnit(x, y, randVal);
            entities.push(u);
            assignSquad(u);

            const tier = rollBuffTier();
            applyBuffTier(u, tier);
            applySpawnUpgradeBias(u, team, tier);
        }

        const GESTURES = {
            0: 'CLEAR',
            1: 'RALLY',
            2: 'SCATTER',
            3: 'PUSH',
            4: 'HOLD',
            5: 'RING',
            6: 'HUNT',
            7: 'RETREAT',
            8: 'MEETING',
            9: 'DUMMY'
        };

        function isLead(u) {
            return !!u && !u.dead && !u.isDummy && (u.isLeader || u.isCommander);
        }

        function setLeadGesture(lead, gestureKey) {
            if (!isLead(lead)) return;
            const g = Number(gestureKey);
            if (!Number.isFinite(g) || !(g in GESTURES)) return;
            lead.gesture = g;
            lead.gestureFrame = frame;
            const log = document.getElementById('ai-log');
            const content = document.getElementById('ai-log-content');
            if (log && content) {
                log.classList.remove('hidden');
                content.innerText = `[GESTURE ${lead.team.toUpperCase()} SQUAD ${lead.squadId}] ${GESTURES[g]}`;
            }
            if (gestureActive) gestureActive.textContent = `${g} ${GESTURES[g]}`;
        }

        function logToAiPanel(text) {
            const log = document.getElementById('ai-log');
            const content = document.getElementById('ai-log-content');
            if (!log || !content) return;
            log.classList.remove('hidden');
            content.innerText = text;
        }

        function formatBigIntCompact(n) {
            const v = typeof n === 'bigint' ? n : BigInt(n);
            const abs = v < 0n ? -v : v;
            if (abs < 1000n) return v.toString();
            if (abs < 1_000_000n) return `${(Number(v) / 1e3).toFixed(1)}k`;
            if (abs < 1_000_000_000n) return `${(Number(v) / 1e6).toFixed(1)}m`;
            return `${(Number(v) / 1e9).toFixed(1)}b`;
        }

        function syncHud() {
            if (fpsDisplay) fpsDisplay.innerText = `FPS: ${fpsEma.toFixed(0)}`;
            if (knowledgeDisplay) knowledgeDisplay.innerText = `K: ${formatBigIntCompact(TEAM_KNOWLEDGE.even)} / ${formatBigIntCompact(TEAM_KNOWLEDGE.odd)}`;
            if (simStatus) simStatus.innerText = SIM.paused ? 'PAUSE' : 'RUN';
            if (timescaleDisplay) timescaleDisplay.innerText = `${SIM.timeScale.toFixed(1)}x`;
            if (drawDistDisplay) drawDistDisplay.innerText = `${FX.drawDist}`;
            if (lowFxBtn) lowFxBtn.innerText = `LOW FX: ${FX.lowFx ? 'ON' : 'OFF'}`;
            if (ringsBtn) ringsBtn.innerText = `RINGS: ${FX.showRings ? 'ON' : 'OFF'}`;
            if (fogBtn) fogBtn.innerText = `FOG: MINIMAP ${FX.fogMinimap ? 'ON' : 'OFF'}`;
            if (headlessBtn) headlessBtn.innerText = `HEADLESS: ${FX.headless ? 'ON' : 'OFF'}`;
            if (winsEvenEl) winsEvenEl.innerText = `W ${ROUND.wins.even}`;
            if (winsOddEl) winsOddEl.innerText = `W ${ROUND.wins.odd}`;
            if (roundEl) roundEl.innerText = `R ${ROUND.round}`;
            const killsEvenEl = document.getElementById('kills-even');
            const killsOddEl = document.getElementById('kills-odd');
            if (killsEvenEl) killsEvenEl.innerText = TEAM_KILLS.even.toString();
            if (killsOddEl) killsOddEl.innerText = TEAM_KILLS.odd.toString();
            const evenTop = KILL_BOARD.even.top;
            const oddTop = KILL_BOARD.odd.top;
            const evenTxt = evenTop ? `${evenTop.value} (${evenTop.count})` : '--';
            const oddTxt = oddTop ? `${oddTop.value} (${oddTop.count})` : '--';
            const evenEl = document.getElementById('top-even-killer');
            const oddEl = document.getElementById('top-odd-killer');
            if (evenEl) evenEl.innerText = evenTxt;
            if (oddEl) oddEl.innerText = oddTxt;

            if (selectedPanel) {
                if (!controlledUnit || controlledUnit.dead) {
                    selectedPanel.classList.add('hidden');
                } else {
                    selectedPanel.classList.remove('hidden');
                    const u = controlledUnit;
                    if (selectedValueEl) selectedValueEl.textContent = u.value?.toString?.() ?? '—';
                    if (selectedEffEl) selectedEffEl.textContent = (u.effVal !== undefined) ? u.effVal.toString() : '—';
                    if (selectedTeamEl) selectedTeamEl.textContent = TEAMS.enabled ? (u.baseTeam || u.team || '—') : 'free';
                    if (selectedRoleEl) selectedRoleEl.textContent = u.role || (u.isLeader ? 'leader' : (u.isCommander ? 'commander' : 'unit'));
                    if (selectedAgeEl) selectedAgeEl.textContent = String(u.age ?? '—');
                    if (selectedTraitsEl) {
                        const parts = [];
                        if (u.tier || u.buffTier) parts.push(`tier:${u.tier || tierLabel(u.buffTier)}`);
                        if (u.isDummy) parts.push('dummy');
                        if (u.isResistor) parts.push('boss');
                        if (u.isCyclic) parts.push('cyclic');
                        if (u.isPrimeNum) parts.push('prime');
                        if (u.isHappyNum) parts.push('happy');
                        if (u.isMultiplier) parts.push('mult');
                        if (Array.isArray(u.traits)) parts.push(...u.traits.slice(0, 6));
                        if (Array.isArray(u.extraTraits)) parts.push(...u.extraTraits.slice(0, 3));
                        selectedTraitsEl.textContent = parts.length ? parts.join(', ') : '—';
                    }
                }
            }
        }

        function applySelectedOp(op) {
            if (!controlledUnit || controlledUnit.dead) return;
            const u = controlledUnit;
            const v = typeof u.value === 'bigint' ? u.value : BigInt(u.value || 0);
            let next = v;

            if (op === 'inc') next = v + 1n;
            else if (op === 'dec') next = v - 1n;
            else if (op === 'mul2') next = v * 2n;
            else if (op === 'mul10') next = v * 10n;
            else if (op === 'square') next = v * v;
            else if (op === 'rev') {
                const s = (v < 0n ? (-v).toString() : v.toString()).split('').reverse().join('');
                next = BigInt(s || '0');
                if (v < 0n) next = -next;
            } else if (op === 'sum') {
                const s = (v < 0n ? (-v).toString() : v.toString());
                let sum = 0n;
                for (const ch of s) { const d = ch.charCodeAt(0) - 48; if (d >= 0 && d <= 9) sum += BigInt(d); }
                next = sum;
            } else if (op === 'nextp') {
                next = nextPrimeProbable(v + 1n);
            } else {
                return;
            }

            try {
                u.setBigValue(next, u.isDummy ? (u.baseTeam || u.team) : null);
            } catch { }
        }

        function toNumberSafe(x, fallback) {
            const n = Number(x);
            return Number.isFinite(n) ? n : fallback;
        }

        const STORAGE_KEYS = Object.freeze({
            aiKey: 'bif_ai_key',
            spawnSeed: 'bif_spawn_seed',
            spawnDist: 'bif_spawn_dist',
            digitsMin: 'bif_digits_min',
            digitsMax: 'bif_digits_max'
        });

        const SPAWN_CFG = {
            seed: '',
            dist: 'uniform',
            digitsMin: 0,
            digitsMax: 0
        };
        let spawnRng = null;

        function xmur3(str) {
            let h = 1779033703 ^ str.length;
            for (let i = 0; i < str.length; i++) {
                h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
                h = (h << 13) | (h >>> 19);
            }
            return () => {
                h = Math.imul(h ^ (h >>> 16), 2246822507);
                h = Math.imul(h ^ (h >>> 13), 3266489909);
                return (h ^= h >>> 16) >>> 0;
            };
        }

        function mulberry32(a) {
            return () => {
                let t = (a += 0x6D2B79F5);
                t = Math.imul(t ^ (t >>> 15), t | 1);
                t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
                return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
            };
        }

        function setSpawnSeed(seed) {
            const s = String(seed || '').trim();
            SPAWN_CFG.seed = s;
            if (s) {
                const seedFn = xmur3(s);
                spawnRng = mulberry32(seedFn());
            } else {
                spawnRng = null;
            }
        }

        function randSpawn() {
            return spawnRng ? spawnRng() : Math.random();
        }

        function clampInt(x, lo, hi) {
            const n = Number(x);
            if (!Number.isFinite(n)) return lo;
            return Math.min(hi, Math.max(lo, Math.trunc(n)));
        }

        function parseBigIntInput(raw, fallback = 1n) {
            const s0 = String(raw ?? '').trim();
            if (!s0) return fallback;

            const s = s0.replace(/[\s_]/g, '');
            const sign = s.startsWith('-') ? '-' : (s.startsWith('+') ? '+' : '');
            const body = sign ? s.slice(1) : s;
            if (!body) return fallback;

            try {
                if (/^0x[0-9a-f]+$/i.test(body)) return BigInt(sign + body);
                if (/^[0-9]+$/.test(body)) return BigInt(sign + body);
            } catch { }
            return fallback;
        }

        function bigIntBitLength(n) {
            const abs = n < 0n ? -n : n;
            if (abs === 0n) return 0;
            return abs.toString(2).length;
        }

        function nextPrimeProbable(n, maxSteps = 400) {
            let x = n;
            if (x < 2n) x = 2n;
            if (x === 2n) return 2n;
            if (x % 2n === 0n) x += 1n;
            for (let i = 0; i < maxSteps; i++) {
                if (isPrime(x)) return x;
                x += 2n;
            }
            return n;
        }

        function bigIntStats(n) {
            const abs = n < 0n ? -n : n;
            const digits = abs.toString(10).length;
            const bits = bigIntBitLength(abs);
            const mod2 = Number(abs % 2n);
            const mod3 = Number(abs % 3n);
            const mod5 = Number(abs % 5n);
            const mod9 = Number(abs % 9n);
            return { digits, bits, mod2, mod3, mod5, mod9 };
        }

        function updateInputStats() {
            try {
                if (genStatsEl && genValInput) {
                    const mv = parseBigIntInput(genValInput.value, 1n);
                    const st = bigIntStats(mv);
                    genStatsEl.textContent = `digits=${st.digits} bits=${st.bits} mod2=${st.mod2} mod3=${st.mod3} mod5=${st.mod5} mod9=${st.mod9}`;
                }
                if (exactStatsEl && exactValInput) {
                    const v = parseBigIntInput(exactValInput.value, 0n);
                    const st = bigIntStats(v);
                    const prime = v >= 0n ? (isPrime(v) ? 'yes' : 'no') : '—';
                    const happy = v >= 0n ? (isHappy(v) ? 'yes' : 'no') : '—';
                    exactStatsEl.textContent = `digits=${st.digits} bits=${st.bits} mod2=${st.mod2} mod3=${st.mod3} mod5=${st.mod5} mod9=${st.mod9} prime=${prime} happy=${happy}`;
                }
            } catch { }
        }

        function randU32() {
            return (randSpawn() * 0x100000000) >>> 0;
        }

        function randomBigIntBelow(maxExclusive) {
            const max = typeof maxExclusive === 'bigint' ? maxExclusive : BigInt(maxExclusive || 0);
            if (max <= 0n) return 0n;
            const bits = bigIntBitLength(max - 1n);
            const words = Math.max(1, Math.ceil(bits / 32));
            while (true) {
                let x = 0n;
                for (let i = 0; i < words; i++) {
                    x = (x << 32n) | BigInt(randU32());
                }
                const extra = BigInt(words * 32 - bits);
                if (extra > 0n) x >>= extra;
                if (x < max) return x;
            }
        }

        function randomBigIntWithDigits(digits) {
            const d = clampInt(digits, 1, 5000);
            let s = '';
            const first = 1 + Math.floor(randSpawn() * 9);
            s += String(first);
            for (let i = 1; i < d; i++) s += String(Math.floor(randSpawn() * 10));
            return BigInt(s);
        }

        function syncSpawnCfgFromInputs() {
            if (seedInput) setSpawnSeed(seedInput.value);
            if (spawnDistSelect) SPAWN_CFG.dist = String(spawnDistSelect.value || 'uniform');
            if (digitsMinInput) SPAWN_CFG.digitsMin = clampInt(digitsMinInput.value, 0, 5000);
            if (digitsMaxInput) SPAWN_CFG.digitsMax = clampInt(digitsMaxInput.value, 0, 5000);
            if (SPAWN_CFG.digitsMax > 0 && SPAWN_CFG.digitsMin > SPAWN_CFG.digitsMax) {
                const t = SPAWN_CFG.digitsMin;
                SPAWN_CFG.digitsMin = SPAWN_CFG.digitsMax;
                SPAWN_CFG.digitsMax = t;
            }
        }

        function spawnMaxValue() {
            const fallback = 2_000_000n;
            return genValInput ? parseBigIntInput(genValInput.value, fallback) : fallback;
        }

        function generateSpawnValue(maxVal, team) {
            const max = (typeof maxVal === 'bigint') ? maxVal : BigInt(maxVal || 1);
            let v;

            const useDigits = SPAWN_CFG.digitsMin > 0 || SPAWN_CFG.digitsMax > 0;
            if (useDigits) {
                const lo = Math.max(1, SPAWN_CFG.digitsMin || 1);
                const hi = Math.max(lo, SPAWN_CFG.digitsMax || lo);
                const d = lo + Math.floor(randSpawn() * (hi - lo + 1));
                v = randomBigIntWithDigits(d);
            } else if (SPAWN_CFG.dist === 'log') {
                // Bias toward smaller numbers while respecting max.
                const bits = Math.max(1, bigIntBitLength(max));
                const k = 1 + Math.floor(randSpawn() * bits);
                const cap = (1n << BigInt(Math.min(62, k))) - 1n;
                const bounded = cap < max ? cap : max;
                v = randomBigIntBelow(bounded) + 1n;
            } else {
                v = randomBigIntBelow(max) + 1n;
            }

            if (team === 'even' || team === 'odd') {
                v = adjustValueForTeam(v, team);
                if (SPAWN_CFG.dist === 'prime' && team === 'odd') {
                    v = nextPrimeProbable(v);
                }
            }
            return v;
        }

        function exportPreset() {
            return {
                sim: { timeScale: SIM.timeScale },
                fx: { lowFx: FX.lowFx, showRings: FX.showRings, drawDist: FX.drawDist, particleCap: FX.particleCap, fogMinimap: FX.fogMinimap, headless: FX.headless },
                upgrades: TEAM_UPGRADES,
                round: { wins: ROUND.wins, round: ROUND.round },
                spawn: {
                    auto: toNumberSafe(spawnRateSlider?.value, 0),
                    baseRate: BASE_BREED_RATE,
                    seed: SPAWN_CFG.seed,
                    dist: SPAWN_CFG.dist,
                    digitsMin: SPAWN_CFG.digitsMin,
                    digitsMax: SPAWN_CFG.digitsMax,
                    genMax: genValInput ? String(genValInput.value || '') : ''
                }
            };
        }

        function applyPreset(p) {
            if (!p || typeof p !== 'object') return;
            if (p.sim && typeof p.sim.timeScale === 'number') SIM.timeScale = Math.min(2, Math.max(0.1, p.sim.timeScale));
            if (p.fx) {
                if (typeof p.fx.lowFx === 'boolean') FX.lowFx = p.fx.lowFx;
                if (typeof p.fx.showRings === 'boolean') FX.showRings = p.fx.showRings;
                if (typeof p.fx.fogMinimap === 'boolean') FX.fogMinimap = p.fx.fogMinimap;
                if (typeof p.fx.headless === 'boolean') FX.headless = p.fx.headless;
                if (typeof p.fx.drawDist === 'number') FX.drawDist = Math.min(6000, Math.max(600, Math.round(p.fx.drawDist)));
                if (typeof p.fx.particleCap === 'number') FX.particleCap = Math.min(3000, Math.max(100, Math.round(p.fx.particleCap)));
            }
            if (p.upgrades && p.upgrades.even && p.upgrades.odd) {
                for (const team of ['even', 'odd']) {
                    for (const k of ['wall', 'heal', 'spawn', 'turret']) {
                        const v = Number(p.upgrades[team][k] || 0);
                        TEAM_UPGRADES[team][k] = Number.isFinite(v) ? Math.max(0, Math.min(10, Math.floor(v))) : 0;
                    }
                }
            }
            // Wall HP derives from upgrade level.
            syncWallState('even', { refill: true });
            syncWallState('odd', { refill: true });
            syncBaseState({ refill: true });
            if (spawnRateSlider && p.spawn && typeof p.spawn.auto === 'number') {
                spawnRateSlider.value = String(Math.max(0, Math.min(500, Math.round(p.spawn.auto))));
            }
            if (p.spawn) {
                if (typeof p.spawn.seed === 'string') { setSpawnSeed(p.spawn.seed); if (seedInput) seedInput.value = p.spawn.seed; }
                if (typeof p.spawn.dist === 'string') { SPAWN_CFG.dist = p.spawn.dist; if (spawnDistSelect) spawnDistSelect.value = p.spawn.dist; }
                if (typeof p.spawn.digitsMin === 'number') { SPAWN_CFG.digitsMin = clampInt(p.spawn.digitsMin, 0, 5000); if (digitsMinInput) digitsMinInput.value = String(SPAWN_CFG.digitsMin || ''); }
                if (typeof p.spawn.digitsMax === 'number') { SPAWN_CFG.digitsMax = clampInt(p.spawn.digitsMax, 0, 5000); if (digitsMaxInput) digitsMaxInput.value = String(SPAWN_CFG.digitsMax || ''); }
                if (genValInput && typeof p.spawn.genMax === 'string') genValInput.value = p.spawn.genMax;
            }
            updateSpawnRateDisplay();
            if (timescaleSlider) timescaleSlider.value = String(SIM.timeScale);
            if (drawDistSlider) drawDistSlider.value = String(FX.drawDist);
            updateInputStats();
            syncHud();
        }

        function purgeField({ keepKnowledge = true } = {}) {
            entities = [];
            particles = [];
            projectiles = [];
            corpses = [];
            hazards = [];
            storms = [];
            spawnObjectives();
            controlledUnit = null;
            popHistory = { even: [], odd: [] };
            spawnAccumulator = 0;
            baseSpawnAccEven = 0;
            baseSpawnAccOdd = 0;
            initialBaseBurstDone = false;
            ROUND.clock = 0;
            KILL_BOARD.even.byValue.clear(); KILL_BOARD.even.top = null;
            KILL_BOARD.odd.byValue.clear(); KILL_BOARD.odd.top = null;
            TEAM_KILLS.even = 0; TEAM_KILLS.odd = 0;
            syncWallState('even', { refill: true });
            syncWallState('odd', { refill: true });
            syncBaseState({ refill: true });
            playerSeeded = false;
            if (!keepKnowledge) {
                TEAM_KNOWLEDGE.even = 0n;
                TEAM_KNOWLEDGE.odd = 0n;
            }
        }

        function endRound(winner) {
            if (winner !== 'even' && winner !== 'odd') return;
            if (ROUND_END.active) return;
            ROUND_END.active = true;
            ROUND_END.winner = winner;
            ROUND_END.timer = 180; // ~3 seconds
            ROUND.wins[winner] += 1;
            logToAiPanel(`[ROUND ${ROUND.round}] ${winner.toUpperCase()} wins (${ROUND.wins.even}-${ROUND.wins.odd})`);
            if (winBanner && winBannerTitle && winBannerSub) {
                winBanner.classList.remove('hidden');
                winBannerTitle.innerText = `${winner.toUpperCase()} WINS`;
                winBannerSub.innerText = `Next round in ${(ROUND_END.timer / 60).toFixed(1)}s`;
            }
        }

        function forceWinIfStuck() {
            if (!TEAMS.enabled) return;
            if (ROUND_END.active) return;
            if (ROUND.clock < 180) return; // wait 3 minutes of sim time
            const evCount = entities.filter(e => !e.dead && e.team === 'even' && !e.isDummy).length;
            const odCount = entities.filter(e => !e.dead && e.team === 'odd' && !e.isDummy).length;
            const evBase = BASE_STATE.even?.hp ?? 0n;
            const odBase = BASE_STATE.odd?.hp ?? 0n;
            const evBaseMax = BASE_STATE.even?.max ?? 1n;
            const odBaseMax = BASE_STATE.odd?.max ?? 1n;
            const evScore = (Number(evBase) / Number(evBaseMax)) * 3 + evCount * 0.8 + Number(TEAM_KNOWLEDGE.even) * 0.0000005;
            const odScore = (Number(odBase) / Number(odBaseMax)) * 3 + odCount * 0.8 + Number(TEAM_KNOWLEDGE.odd) * 0.0000005;
            let winner = null;
            if (Math.abs(evScore - odScore) > 0.1) winner = evScore > odScore ? 'even' : 'odd';
            else if (evCount !== odCount) winner = evCount > odCount ? 'even' : 'odd';
            else winner = Math.random() < 0.5 ? 'even' : 'odd';
            logToAiPanel(`[ROUND ${ROUND.round}] forced win after stalemate: ${winner.toUpperCase()}`);
            endRound(winner);
        }

        function getSquadLeads() {
            return entities.filter(e => !e.dead && !e.isDummy && (e.isLeader || e.isCommander));
        }

        function findSquadLeadFor(team, x, y) {
            let best = null;
            let bestD = Infinity;
            for (const lead of getSquadLeads()) {
                if (lead.team !== team) continue;
                const d = Math.hypot(lead.x - x, lead.y - y);
                if (d < bestD) { bestD = d; best = lead; }
            }
            // Only assign if there's a nearby lead; otherwise squadless.
            return bestD < 1200 ? best : null;
        }

        function assignSquad(unit) {
            if (!unit || unit.dead || unit.isDummy) return;
            if (unit.isLeader || unit.isCommander) return;
            const lead = findSquadLeadFor(unit.team, unit.x, unit.y);
            if (!lead) { unit.squadId = 0; unit.squadLeadId = null; return; }
            unit.squadId = lead.squadId;
            unit.squadLeadId = lead.id;
        }

        function maybeStartMeeting(lead) {
            if (!lead || lead.dead || lead.isDummy) return;
            if (!(lead.isLeader || lead.isCommander)) return;
            const offset = (lead.squadId * 97) % MEETING_INTERVAL;
            if (frame % MEETING_INTERVAL !== offset) return;
            lead.meetingTimer = MEETING_DURATION;
            lead.gesture = 8;
            lead.meetingPoint = baseCenter(lead.team);
            const log = document.getElementById('ai-log');
            const content = document.getElementById('ai-log-content');
            if (log && content) {
                log.classList.remove('hidden');
                const vocab = ['ksh', 'vra', 'tzk', 'qen', 'zul', 'mnr', 'siv', 'xol'];
                const phrase = Array.from({ length: 10 }, (_, i) => vocab[(lead.squadId + i + frame) % vocab.length]).join('-');
                content.innerText = `[MEETING ${lead.team.toUpperCase()} SQUAD ${lead.squadId}] ${phrase}`;
            }
        }

        function pickSpawnTeam() {
            const ev = entities.filter(e => !e.dead && e.team === 'even' && !e.isDummy).length;
            const od = entities.filter(e => !e.dead && e.team === 'odd' && !e.isDummy).length;
            if (ev < od) return 'even';
            if (od < ev) return 'odd';
            spawnParityToggle = spawnParityToggle === 'even' ? 'odd' : 'even';
            return spawnParityToggle;
        }

        function pickSpawnTeamFromCounts(ev, od) {
            if (ev < od) return 'even';
            if (od < ev) return 'odd';
            spawnParityToggle = spawnParityToggle === 'even' ? 'odd' : 'even';
            return spawnParityToggle;
        }

        function applyMeetingBoost(lead) {
            if (!lead || lead.dead || !(lead.isLeader || lead.isCommander)) return;
            const sid = lead.squadId;
            const boostText = document.getElementById('ai-log-content');
            const boostLog = document.getElementById('ai-log');
            if (boostLog && boostText) {
                boostLog.classList.remove('hidden');
                boostText.innerText = `[TACTICS ${lead.team.toUpperCase()} SQUAD ${sid}] consensus achieved → tactics improved`;
            }

            for (const u of entities) {
                if (u.dead || u.isDummy || u.squadId !== sid) continue;
                u.adaptation = Math.min(10, u.adaptation + 0.15);
                u.damageMult = Math.min(2.0, (u.damageMult || 1.0) * 1.02);
                u.evasion = Math.min(0.25, (u.evasion || 0) + 0.01);
                u.tacticBoostTimer = 900;
            }
        }

        function adjustValueForTeam(val, team) {
            let v = BigInt(val);
            if (v <= 0n) v = 1n;
            if (team === 'even') { if (v % 2n !== 0n) v += 1n; }
            else { if (v % 2n === 0n) v += 1n; }
            return v;
        }

        let camera = { x: CONFIG.worldSize / 2, y: CONFIG.worldSize / 2, zoom: 0.8, isDragging: false, lastMouseX: 0, lastMouseY: 0 };
        const keys = { w: false, a: false, s: false, d: false };
        window.addEventListener('keydown', e => { if (keys.hasOwnProperty(e.key)) keys[e.key] = true; });
        window.addEventListener('keyup', e => { if (keys.hasOwnProperty(e.key)) keys[e.key] = false; });

        async function callGemini(prompt, systemPrompt = "") {
            if (!apiKey) return null;
            const statusEl = document.getElementById('ai-status');
            if (statusEl) statusEl.classList.remove('hidden');
            let retries = 0;
            while (retries < 5) {
                try {
                    const payload = {
                        contents: [{ parts: [{ text: prompt }] }],
                        systemInstruction: { parts: [{ text: systemPrompt }] }
                    };
                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
                    });
                    const data = await response.json();
                    if (statusEl) statusEl.classList.add('hidden');
                    return data.candidates?.[0]?.content?.parts?.[0]?.text;
                } catch (e) { retries++; await new Promise(r => setTimeout(r, Math.pow(2, retries) * 1000)); }
            }
            if (statusEl) statusEl.classList.add('hidden');
            return null;
        }

        async function analyzeBattle() {
            const ev = entities.filter(e => e.team === 'even').length, od = entities.filter(e => e.team === 'odd').length;
            const log = document.getElementById('ai-log');
            const content = document.getElementById('ai-log-content');
            if (log) log.classList.remove('hidden');
            if (content) content.innerText = apiKey ? "Analyzing distraction sub-routines..." : "AI key missing; generating offline summary...";
            const result = await callGemini(`Evens ${ev}, Odds ${od}. Hazards: ${hazards.length}. Dummies are on the field.`, "Describe the tactical confusion caused by teams using dummy decoys to manipulate enemy pathing and targeting.");
            if (result && content) { content.innerText = result; return; }
            const evenTop = KILL_BOARD.even.top;
            const oddTop = KILL_BOARD.odd.top;
            const topTxt = `TopKillers: E=${evenTop ? `${evenTop.value}(${evenTop.count})` : '--'} O=${oddTop ? `${oddTop.value}(${oddTop.count})` : '--'}`;
            const ratio = od === 0 ? '∞' : (ev / od).toFixed(2);
            const offline = `[OFFLINE]\nEvens=${ev} Odds=${od} (E/O=${ratio})\nHazards=${hazards.length} Storms=${storms.length} Nodes=${objectives.length}\nKills: E=${TEAM_KILLS.even} O=${TEAM_KILLS.odd}\n${topTxt}\nTip: add AI key to enable Gemini analysis.`;
            if (content) content.innerText = offline;
        }

        function isPrime(n) {
            if (n <= 1n) return false;
            if (n === 2n || n === 3n) return true;
            if (n % 2n === 0n) return false;

            const smallPrimes = [3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n];
            for (const p of smallPrimes) {
                if (n === p) return true;
                if (n % p === 0n) return false;
            }

            const modPow = (base, exp, mod) => {
                let result = 1n;
                let b = base % mod;
                let e = exp;
                while (e > 0n) {
                    if (e & 1n) result = (result * b) % mod;
                    b = (b * b) % mod;
                    e >>= 1n;
                }
                return result;
            };

            // Miller-Rabin probable prime test (fast for huge BigInt).
            let d = n - 1n;
            let s = 0n;
            while ((d & 1n) === 0n) { d >>= 1n; s++; }

            const isWitness = (a) => {
                if (a % n === 0n) return false;
                let x = modPow(a, d, n);
                if (x === 1n || x === n - 1n) return false;
                for (let i = 1n; i < s; i++) {
                    x = (x * x) % n;
                    if (x === n - 1n) return false;
                }
                return true;
            };

            // Good enough in practice; deterministic for many ranges, probabilistic beyond.
            const bases = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n];
            for (const a of bases) {
                if (a >= n - 1n) continue;
                if (isWitness(a)) return false;
            }
            return true;
        }

        function isHappy(n) {
            let seen = new Set();
            let current = n;
            while (current !== 1n && !seen.has(current)) {
                seen.add(current);
                let sum = 0n;
                let s = current.toString();
                for (let char of s) {
                    if (char < '0' || char > '9') continue;
                    const d = BigInt(char);
                    sum += d * d;
                }
                current = sum;
            }
            return current === 1n;
        }

        function finiteNumberFromBigInt(x) {
            const num = Number(x);
            return Number.isFinite(num) ? num : null;
        }

        function bigIntMulFloat(value, mult) {
            if (typeof mult !== 'number' || !Number.isFinite(mult)) return value;
            if (mult <= 0) return 1n;
            const SCALE = 1000;
            const scaled = Math.max(0, Math.round(mult * SCALE));
            const out = (value * BigInt(scaled)) / BigInt(SCALE);
            return out > 1n ? out : 1n;
        }

        const TRAITS = {
            isFibonacci: (n) => {
                const isSquare = (x) => { 
                    if (x < 0n) return false;
                    const num = finiteNumberFromBigInt(x);
                    if (num === null) return false;
                    let s = BigInt(Math.floor(Math.sqrt(num))); 
                    return s * s === x || (s + 1n) * (s + 1n) === x || (s - 1n) * (s - 1n) === x; 
                };
                let n2 = n * n;
                return isSquare(5n * n2 + 4n) || isSquare(5n * n2 - 4n);
            },
            isPerfect: (n) => {
                if (n < 6n) return false;
                let sum = 1n;
                for (let i = 2n; i * i <= n; i++) {
                    if (n % i === 0n) {
                        sum += i;
                        if (i * i !== n) sum += n / i;
                    }
                }
                return sum === n;
            },
            isSquare: (n) => { const num = finiteNumberFromBigInt(n); if (num === null || num < 0) return false; let s = BigInt(Math.round(Math.sqrt(num))); return s * s === n; },
            isCube: (n) => { const num = finiteNumberFromBigInt(n); if (num === null || num < 0) return false; let s = BigInt(Math.round(Math.pow(num, 1 / 3))); return s * s * s === n; },
            isPalindromic: (n) => { let s = n.toString(); return s === s.split('').reverse().join(''); },
            isHarshad: (n) => {
                const s = (n < 0n ? (-n) : n).toString();
                let sum = 0n;
                for (const c of s) {
                    if (c < '0' || c > '9') continue;
                    sum += BigInt(c);
                }
                return sum > 0n && n % sum === 0n;
            },
            isTriangular: (n) => { let val = 8n * n + 1n; const num = finiteNumberFromBigInt(val); if (num === null || num < 0) return false; let s = BigInt(Math.round(Math.sqrt(num))); return s * s === val; },
            isNarcissistic: (n) => {
                let s = n.toString(); let len = BigInt(s.length); let sum = 0n;
                for (let c of s) sum += BigInt(c) ** len;
                return sum === n;
            },
            isAbundant: (n) => {
                let sum = 1n;
                for (let i = 2n; i * i <= n; i++) {
                    if (n % i === 0n) { sum += i; if (i * i !== n) sum += n / i; }
                }
                return sum > n;
            },
            isDeficient: (n) => {
                let sum = 1n;
                for (let i = 2n; i * i <= n; i++) {
                    if (n % i === 0n) { sum += i; if (i * i !== n) sum += n / i; }
                }
                return sum < n;
            },
            isPowerOfTwo: (n) => n > 0n && (n & (n - 1n)) === 0n,
            isSmith: (n) => {
                const sumDigits = (x) => x.toString().split('').reduce((a, b) => a + Number(b), 0);
                if (isPrime(n)) return false;
                let sumD = sumDigits(n);
                let sumP = 0; let temp = n;
                for (let i = 2n; i * i <= temp; i++) {
                    while (temp % i === 0n) { sumP += sumDigits(i); temp /= i; }
                }
                if (temp > 1n) sumP += sumDigits(temp);
                return sumD === sumP;
            }
        };

        // Some archetype predicates reference helpers directly.
        function isHarshad(n) {
            return TRAITS.isHarshad(n);
        }

        // Adding more pseudo-traits to reach 100+ effectively by combining properties or using modulo ranges
        function getExtraTraits(n) {
            let t = [];
            if (n % 7n === 0n) t.push('Septenary');
            if (n % 11n === 0n) t.push('Repdigit-ish');
            if (n % 13n === 0n) t.push('Lucky-ish');
            if (n % 17n === 0n) t.push('Prime-neighbor');
            if (n % 101n === 0n) t.push('Century');
            // ... programmatic traits
            for (let i = 3; i < 100; i++) {
                if (n % BigInt(i) === 0n) t.push('Factor-' + i);
            }
            return t;
        }

        function bigIntDigitSum(n) {
            let s = 0n;
            const str = (n < 0n ? (-n) : n).toString();
            for (const c of str) {
                if (c < '0' || c > '9') continue;
                s += BigInt(c);
            }
            return s;
        }

        function isKaprekar(n) {
            if (n < 1n) return false;
            const sq = n * n;
            const s = sq.toString();
            for (let i = 1; i < s.length; i++) {
                const left = BigInt(s.slice(0, i));
                const right = BigInt(s.slice(i));
                if (right > 0n && left + right === n) return true;
            }
            return n === 1n;
        }

        function factorOnce(n) {
            const factors = new Set();
            let m = n;
            while (m % 2n === 0n) { factors.add(2n); m /= 2n; }
            let f = 3n;
            while (f * f <= m) {
                while (m % f === 0n) { factors.add(f); m /= f; }
                f += 2n;
            }
            if (m > 1n) factors.add(m);
            return Array.from(factors);
        }

        function isCarmichael(n) {
            if (n < 3n || isPrime(n)) return false;
            const primeFactors = factorOnce(n);
            for (const p of primeFactors) if (n % (p * p) === 0n) return false; // squarefree
            for (const p of primeFactors) {
                if ((n - 1n) % (p - 1n) !== 0n) return false;
            }
            return true;
        }

        function isFermatPrime(n) {
            let k = 0n;
            let candidate = 3n;
            while (candidate <= n && k < 6n) {
                if (candidate === n && isPrime(n)) return true;
                k++;
                candidate = (1n << (1n << k)) + 1n;
            }
            return false;
        }

        function isPowerOfTwo(n) { return n > 0n && (n & (n - 1n)) === 0n; }

        function isMersennePrime(n) {
            if (!isPrime(n)) return false;
            return isPowerOfTwo(n + 1n);
        }

        function isTaxicabSmall(n) {
            if (n > 50000n) return false;
            const limit = 40;
            let ways = 0;
            for (let a = 1; a <= limit; a++) {
                for (let b = a; b <= limit; b++) {
                    const sum = BigInt(a ** 3 + b ** 3);
                    if (sum === n) { ways++; if (ways >= 2) return true; }
                }
            }
            return false;
        }

        function divisorCount(n) {
            let cnt = 1n;
            let m = n;
            let p = 2n;
            while (p * p <= m) {
                let exp = 0n;
                while (m % p === 0n) { m /= p; exp++; }
                if (exp > 0n) cnt *= (exp + 1n);
                p = p === 2n ? 3n : p + 2n;
            }
            if (m > 1n) cnt *= 2n;
            return cnt;
        }

        function sumDivisors(n) {
            let sum = 1n;
            let m = n;
            let p = 2n;
            while (p * p <= m) {
                if (m % p === 0n) {
                    let term = 1n;
                    let pow = 1n;
                    while (m % p === 0n) { m /= p; pow *= p; term += pow; }
                    sum *= term;
                }
                p = p === 2n ? 3n : p + 2n;
            }
            if (m > 1n) sum *= (1n + m);
            return sum;
        }

        function isAutomorphic(n) {
            const s = n.toString();
            const sq = (n * n).toString();
            return sq.endsWith(s);
        }

        const BASE_ARC_PROPS = [
            { name: 'Harshad', abbr: 'HAR', color: '#c084fc', effect: 'drain', pred: isHarshad },
            { name: 'Kaprekar', abbr: 'KAP', color: '#a78bfa', effect: 'digits', pred: isKaprekar },
            { name: 'Carmichael', abbr: 'CAR', color: '#f97316', effect: 'trick', pred: isCarmichael },
            { name: 'FermatPrime', abbr: 'FER', color: '#22c55e', effect: 'shield', pred: isFermatPrime },
            { name: 'MersennePrime', abbr: 'MER', color: '#60a5fa', effect: 'power', pred: isMersennePrime },
            { name: 'SophieGermain', abbr: 'SOP', color: '#f472b6', effect: 'primecharge', pred: (n)=>isPrime(n) && isPrime(2n*n+1n) },
            { name: 'Taxicab', abbr: 'TAX', color: '#fbbf24', effect: 'burst', pred: isTaxicabSmall },
            { name: 'Fibonacci', abbr: 'FIB', color: '#34d399', effect: 'swarm', pred: (n)=>TRAITS.isFibonacci(n) },
            { name: 'Lucas', abbr: 'LUC', color: '#38bdf8', effect: 'support', pred: (n)=>TRAITS.isFibonacci(n+1n) && TRAITS.isFibonacci(n-1n) },
            { name: 'Catalan', abbr: 'CAT', color: '#fb7185', effect: 'barrier', pred: (n)=>{ let k=0n, c=1n; while(c<n && k<20n){k++; c = c*(4n*k-2n)/(k+1n);} return c===n;} },
            { name: 'Pell', abbr: 'PEL', color: '#fcd34d', effect: 'momentum', pred: (n)=>{ let a=1n,b=2n; while(b<n && b<200000n){ [a,b]=[b,2n*b+a]; } return b===n; } },
            { name: 'HighlyComposite', abbr: 'HCN', color: '#22d3ee', effect: 'bulk', pred: (n)=>divisorCount(n) > 100n },
            { name: 'Superabundant', abbr: 'SUP', color: '#06b6d4', effect: 'regen', pred: (n)=> sumDivisors(n) > n*2n },
            { name: 'Perfect', abbr: 'PRF', color: '#f59e0b', effect: 'perfect', pred: TRAITS.isPerfect },
            { name: 'Happy', abbr: 'HAP', color: '#4ade80', effect: 'happy', pred: isHappy },
            { name: 'Palindromic', abbr: 'PAL', color: '#e879f9', effect: 'reflect', pred: (n)=> n>=10n && TRAITS.isPalindromic(n) },
            { name: 'Automorphic', abbr: 'AUT', color: '#67e8f9', effect: 'barrier', pred: isAutomorphic },
            { name: 'Triangular', abbr: 'TRI', color: '#fb7185', effect: 'barrier', pred: TRAITS.isTriangular },
            { name: 'Smith', abbr: 'SMI', color: '#94a3b8', effect: 'factorburn', pred: TRAITS.isSmith },
            { name: 'Abundant', abbr: 'ABU', color: '#34d399', effect: 'regen', pred: TRAITS.isAbundant }
        ];

        function buildMathArchetypes() {
            const arcs = [];
            const buckets = 5;
            BASE_ARC_PROPS.forEach(base => {
                for (let i = 0; i < buckets; i++) {
                    const idx = i;
                    arcs.push({
                        name: `${base.name} Class ${i + 1}`,
                        abbr: `${base.abbr}${i + 1}`,
                        color: base.color,
                        effect: base.effect,
                        predicate: (n) => base.pred(n) && (Number(n % BigInt(buckets)) === idx)
                    });
                }
            });
            const TARGET = 140; // "over 100" number types
            const extraEffects = ['momentum', 'shield', 'power', 'support', 'swarm', 'regen', 'reflect', 'factorburn', 'barrier', 'trick', 'digits'];
            while (arcs.length < TARGET) {
                const i = arcs.length;
                const effect = extraEffects[i % extraEffects.length];
                const hue = (i * 29) % 360;
                arcs.push({
                    name: `Modular-${i}`,
                    abbr: `MOD${i}`,
                    color: `hsl(${hue}deg 70% 65%)`,
                    effect,
                    predicate: (n)=> Number((n + BigInt(i)) % BigInt(7 + (i % 11))) === 0
                });
            }
            return arcs.slice(0, TARGET);
        }

        const MATH_ARCHETYPES = buildMathArchetypes();

        function pickMathArchetype(val) {
            const found = MATH_ARCHETYPES.find(a => a.predicate(val));
            if (found) return found;
            const idx = Number((val % BigInt(MATH_ARCHETYPES.length) + BigInt(MATH_ARCHETYPES.length)) % BigInt(MATH_ARCHETYPES.length));
            return MATH_ARCHETYPES[idx];
        }

        function applyArchetype(unit) {
            unit.damageMult = 1.0;
            unit.speedFactor = 1.0;
            unit.shieldMult = 1.0;
            unit.spawnBoost = 1.0;
            unit.drainDigits = false;
            unit.cyclePhase = 0;
            const arc = unit.archetype;
            if (!arc) return;
            switch (arc.effect) {
                case 'burst':
                    unit.spawnBoost = 1.4; unit.damageMult = 1.1; break;
                case 'digits':
                    unit.drainDigits = true; unit.damageMult = 1.05; break;
                case 'trick':
                    unit.shieldMult = 1.15; unit.evasion = 0.08; break;
                case 'shield':
                    unit.shieldMult = 1.3; break;
                case 'power':
                    unit.damageMult = 1.25; break;
                case 'primecharge':
                    unit.damageMult = 1.15; unit.speedFactor = 1.05; break;
                case 'swarm':
                    unit.spawnBoost = 1.2; unit.speedFactor = 1.08; break;
                case 'support':
                    unit.supportBoost = 1.2; break;
                case 'barrier':
                    unit.shieldMult = 1.2; break;
                case 'momentum':
                    unit.speedFactor = 1.15; break;
                case 'bulk':
                    unit.effValBoost = 1.15; break;
                case 'regen':
                    unit.regenBoost = 0.003; break;
                case 'perfect':
                    unit.damageMult = 1.1; unit.shieldMult = 1.1; break;
                case 'happy':
                    unit.speedFactor = 1.1; break;
                case 'drain':
                    unit.drainDigits = true; break;
                case 'reflect':
                    unit.reflectChance = 0.08; break;
                case 'pair':
                    unit.bondSeeking = true; break;
                case 'evasion':
                    unit.evasion = 0.12; break;
                case 'factorburn':
                    unit.factorBurn = true; unit.damageMult = 1.08; break;
                case 'cycle':
                    unit.cyclePhase = Math.random() * Math.PI * 2; break;
            }
        }

        function applyModule(unit) {
            if (!unit || unit.dead) return;
            const m = unit.module;
            if (m === 'attack') {
                unit.damageMult = (unit.damageMult || 1.0) * 1.18;
            } else if (m === 'defense') {
                unit.shieldMult = (unit.shieldMult || 1.0) * 1.22;
            } else if (m === 'support') {
                unit.supportBoost = (unit.supportBoost || 1.0) * 1.25;
            } else if (m === 'swarm') {
                unit.speedFactor = (unit.speedFactor || 1.0) * 1.08;
            } else if (m === 'shield') {
                unit.shieldMult = (unit.shieldMult || 1.0) * 1.60;
                unit.speedFactor = (unit.speedFactor || 1.0) * 0.92;
            } else if (m === 'trans') {
                unit.speedFactor = (unit.speedFactor || 1.0) * 1.35;
                unit.shieldMult = (unit.shieldMult || 1.0) * 1.05;
            }
        }

        function resetUnitModifiers(unit) {
            unit.damageMult = 1.0;
            unit.speedFactor = 1.0;
            unit.shieldMult = 1.0;
            unit.spawnBoost = 1.0;
            unit.evasion = 0.0;
            unit.regenBoost = 0;
            unit.supportBoost = 1.0;
            unit.effValBoost = 1.0;
            unit.reflectChance = 0.0;
            unit.factorBurn = false;
            unit.bondSeeking = false;
            unit.drainDigits = false;
        }

        function forceRoleChoice(unit, choice) {
            if (!unit || unit.dead) return;
            if (!choice || choice === 'random') return;
            const c = String(choice);
            const isModule = ['attack', 'defense', 'support', 'swarm', 'shield', 'trans'].includes(c);
            const isRole = ['worker', 'leader', 'commander', 'dummy-placer'].includes(c);
            if (!isModule && !isRole) return;

            unit.role = 'worker';
            unit.isLeader = false;
            unit.isCommander = false;
            unit.isDummyPlacer = false;
            unit.squadId = 0;
            unit.squadLeadId = null;
            unit.meetingTimer = 0;
            unit.gesture = 0;
            unit.gestureFrame = 0;

            if (isModule) {
                unit.module = c;
            } else if (c === 'leader') {
                unit.role = 'leader';
                unit.isLeader = true;
            } else if (c === 'commander') {
                unit.role = 'commander';
                unit.isCommander = true;
            } else if (c === 'dummy-placer') {
                unit.role = 'dummy-placer';
                unit.isDummyPlacer = true;
            } else {
                unit.role = 'worker';
            }

            if (unit.isLeader || unit.isCommander) {
                unit.squadId = nextSquadId++;
                unit.meetingTimer = 0;
                unit.gesture = 0;
                unit.gestureFrame = 0;
            }

            resetUnitModifiers(unit);
            const tier = unit.buffTier;
            unit.setBigValue(unit.value, unit.team);
            if (tier) applyBuffTier(unit, tier);
            assignSquad(unit);
        }

        function tryShieldSacrifice(victim) {
            if (!victim || victim.dead) return false;
            if (victim.isDummy) return false;
            if (victim.module === 'shield') return false;
            if (victim.invulnTimer && victim.invulnTimer > 0) return false;

            const protectors = queryEntityGrid(victim.x, victim.y, 260);
            let best = null;
            let bestD = Infinity;
            for (const p of protectors) {
                if (!p || p.dead || p.isDummy) continue;
                if (p.team !== victim.team) continue;
                if (p.module !== 'shield') continue;
                if (p.invulnTimer && p.invulnTimer > 0) continue;
                const d = Math.hypot(p.x - victim.x, p.y - victim.y);
                if (d < bestD) { bestD = d; best = p; }
            }
            if (!best) return false;

            best.die();
            victim.invulnTimer = Math.max(victim.invulnTimer || 0, 45);
            victim.vx += (victim.x - best.x) * 0.03;
            victim.vy += (victim.y - best.y) * 0.03;
            if (!FX.lowFx) {
                for (let i = 0; i < 10; i++) particles.push(new Particle(victim.x, victim.y, 'rgba(255,255,255,0.85)', 2.6));
            }
            return true;
        }

        function updateKnowledgeMultiplier(team) {
            const k = Number(TEAM_KNOWLEDGE[team]);
            const bonus = 1 + Math.min(2.5, Math.log10(k + 10) * 0.08);
            TEAM_KNOWLEDGE_MULT[team] = bonus;
            entities.filter(e => e.team === team && !e.dead).forEach(e => {
                const base = e.baseEffVal || e.effVal;
                e.effVal = bigIntMulFloat(base, bonus);
                e.maxEffVal = e.effVal;
            });
        }

        function resize() {
            width = window.innerWidth; height = window.innerHeight;
            canvas.width = width; canvas.height = height;
            mCanvas.width = 180; mCanvas.height = 180;
            gCanvas.width = 200; gCanvas.height = 80;
        }
        window.addEventListener('resize', resize);
        resize();

        function drawWorldBorder() {
            const z = camera.zoom;
            const x0 = (0 - camera.x) * z + width / 2;
            const y0 = (0 - camera.y) * z + height / 2;
            const x1 = (CONFIG.worldSize - camera.x) * z + width / 2;
            const y1 = (CONFIG.worldSize - camera.y) * z + height / 2;

            // Skip if entirely offscreen
            if (x1 < -100 || y1 < -100 || x0 > width + 100 || y0 > height + 100) return;

            ctx.save();
            ctx.strokeStyle = 'rgba(255,255,255,0.85)';
            ctx.lineWidth = 3;
            ctx.setLineDash([14, 10]);
            ctx.shadowBlur = 12;
            ctx.shadowColor = 'rgba(168,85,247,0.8)';
            ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
            ctx.setLineDash([]);

            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(255,255,255,0.65)';
            ctx.font = '10px \"JetBrains Mono\"';
            ctx.textAlign = 'left';
            ctx.fillText(`WORLD BORDER (${CONFIG.worldSize}×${CONFIG.worldSize})`, x0 + 10, y0 + 18);
            ctx.restore();
        }

        function disasterActive() {
            if (storms.length > 0) return true;
            for (const team of ['even', 'odd']) {
                const st = BASE_STATE[team];
                if (st && st.max > 0n && st.hp * 100n <= st.max * 30n) return true; // base < 30%
            }
            return false;
        }

        function drawDisasterEffect() {
            if (FX.headless || !FX.showDisaster) return;
            if (!disasterActive()) return;
            const stormIntensity = Math.min(0.6, storms.length * 0.12);
            let basePanic = 0;
            for (const team of ['even', 'odd']) {
                const st = BASE_STATE[team];
                if (st && st.max > 0n) {
                    const ratio = Number(st.hp) / Number(st.max);
                    basePanic = Math.max(basePanic, Math.max(0, 0.4 - ratio) * 1.8);
                }
            }
            const alpha = Math.max(0.15, Math.min(0.6, stormIntensity + basePanic));
            ctx.save();
            ctx.fillStyle = `rgba(239,68,68,${alpha * 0.6})`;
            ctx.fillRect(0, 0, width, height);
            ctx.strokeStyle = `rgba(239,68,68,${alpha})`;
            ctx.lineWidth = 6;
            ctx.setLineDash([18, 12]);
            ctx.strokeRect(12, 12, width - 24, height - 24);
            ctx.setLineDash([]);
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.font = 'bold 26px \"JetBrains Mono\"';
            ctx.textAlign = 'center';
            ctx.fillText('DISASTER', width / 2, 46);
            ctx.font = 'bold 12px \"JetBrains Mono\"';
            ctx.fillText('TAKE COVER // BASE IN PERIL', width / 2, 66);
            ctx.restore();
        }

        function showRuntimeError(err) {
            try { console.error(err); } catch { }
            if (!runtimeError) return;
            runtimeError.classList.remove('hidden');
            const msg = (err && (err.stack || err.message)) ? (err.stack || err.message) : String(err);
            runtimeError.textContent = `JS ERROR: ${msg}`.slice(0, 220);
        }
        window.addEventListener('error', (e) => showRuntimeError(e?.error || e?.message || e));
        window.addEventListener('unhandledrejection', (e) => showRuntimeError(e?.reason || e));

        function setDebugOverlay(text) {
            if (!debugOverlay) return;
            debugOverlay.classList.remove('hidden');
            debugOverlay.textContent = text;
        }

        // If you don’t see auto-spawn working, this tells us whether you're loading the expected DOM.
        const missing = [];
        if (!spawnRateSlider) missing.push('spawn-rate-slider');
        if (!rateDisplay) missing.push('rate-display');
        if (!spawnDebug) missing.push('spawn-debug');
        if (!runtimeError) missing.push('runtime-error');
        if (!debugOverlay) missing.push('debug-overlay');
        if (missing.length > 0) showRuntimeError(`Missing DOM: ${missing.join(', ')}`);
        else setDebugOverlay(`BUILD=${BUILD_ID} (loaded)`);

        // Prove JS is running even if the game loop doesn't.
        if (spawnDebug) spawnDebug.innerText = `SPAWN: JS LOADED (${BUILD_ID})`;
        document.title = `Big Int Field (${BUILD_ID})`;

        // Heartbeat: updates regardless of requestAnimationFrame.
        setInterval(() => {
            if (!spawnDebug) return;
            const rate = parseInt(spawnRateSlider?.value || "0", 10) || 0;
            spawnDebug.innerText =
                `SPAWN: rate=${rate}/s spawned=${spawnedTotal} live=${entities.length} acc=${spawnAccumulator.toFixed(2)} frame=${frame} vis=${document.visibilityState}`;
        }, 500);

        // Sim/perf UI wiring
        if (pauseBtn) pauseBtn.onclick = () => { SIM.paused = !SIM.paused; syncHud(); };
        if (stepBtn) stepBtn.onclick = () => { SIM.stepOnce = true; SIM.paused = true; syncHud(); };
        if (centerSelectedBtn) centerSelectedBtn.onclick = () => { if (controlledUnit) { camera.x = controlledUnit.x; camera.y = controlledUnit.y; } };
        if (timescaleSlider) timescaleSlider.oninput = (e) => { SIM.timeScale = Math.min(2, Math.max(0.1, parseFloat(e.target.value) || 1)); syncHud(); };
        if (lowFxBtn) lowFxBtn.onclick = () => { FX.lowFx = !FX.lowFx; FX.particleCap = FX.lowFx ? 350 : 900; syncHud(); };
        if (ringsBtn) ringsBtn.onclick = () => { FX.showRings = !FX.showRings; syncHud(); };
        if (fogBtn) fogBtn.onclick = () => { FX.fogMinimap = !FX.fogMinimap; syncHud(); };
        if (headlessBtn) headlessBtn.onclick = () => { FX.headless = !FX.headless; syncHud(); };
        if (drawDistSlider) drawDistSlider.oninput = (e) => { FX.drawDist = Math.max(600, Math.min(6000, parseInt(e.target.value || '2400', 10) || 2400)); syncHud(); };

        const persist = (k, v) => { try { localStorage.setItem(k, String(v ?? '')); } catch { } };
        const read = (k, fallback = '') => { try { const v = localStorage.getItem(k); return (v === null || v === undefined) ? fallback : v; } catch { return fallback; } };

        function syncAiMode() {
            if (!aiModeEl) return;
            aiModeEl.textContent = apiKey ? 'AI: ONLINE (Gemini)' : 'AI: OFFLINE (no key)';
        }

        if (aiKeyInput) {
            aiKeyInput.value = apiKey || '';
            aiKeyInput.addEventListener('input', () => {
                apiKey = String(aiKeyInput.value || '').trim();
                persist(STORAGE_KEYS.aiKey, apiKey);
                syncAiMode();
            });
        }
        syncAiMode();

        // Spawn settings persistence
        if (seedInput) seedInput.value = read(STORAGE_KEYS.spawnSeed, '');
        if (spawnDistSelect) spawnDistSelect.value = read(STORAGE_KEYS.spawnDist, 'uniform');
        if (digitsMinInput) digitsMinInput.value = read(STORAGE_KEYS.digitsMin, '');
        if (digitsMaxInput) digitsMaxInput.value = read(STORAGE_KEYS.digitsMax, '');
        syncSpawnCfgFromInputs();

        const onSpawnCfgChange = () => {
            syncSpawnCfgFromInputs();
            if (seedInput) persist(STORAGE_KEYS.spawnSeed, seedInput.value);
            if (spawnDistSelect) persist(STORAGE_KEYS.spawnDist, spawnDistSelect.value);
            if (digitsMinInput) persist(STORAGE_KEYS.digitsMin, digitsMinInput.value);
            if (digitsMaxInput) persist(STORAGE_KEYS.digitsMax, digitsMaxInput.value);
        };
        if (seedInput) seedInput.addEventListener('input', onSpawnCfgChange);
        if (spawnDistSelect) spawnDistSelect.addEventListener('change', onSpawnCfgChange);
        if (digitsMinInput) digitsMinInput.addEventListener('input', onSpawnCfgChange);
        if (digitsMaxInput) digitsMaxInput.addEventListener('input', onSpawnCfgChange);

        if (genValInput) genValInput.addEventListener('input', updateInputStats);
        if (exactValInput) exactValInput.addEventListener('input', updateInputStats);
        updateInputStats();

        function setHelpVisible(flag) {
            if (!helpOverlay) return;
            helpOverlay.classList.toggle('hidden', !flag);
        }
        if (helpBtn) helpBtn.onclick = () => setHelpVisible(true);
        if (helpCloseBtn) helpCloseBtn.onclick = () => setHelpVisible(false);
        window.addEventListener('keydown', (e) => {
            if (e.key === '?') { setHelpVisible(helpOverlay?.classList.contains('hidden')); e.preventDefault(); }
            if (e.key === 'Escape') setHelpVisible(false);
        });

        if (selectedPanel) {
            selectedPanel.querySelectorAll('[data-op]').forEach(btn => {
                btn.addEventListener('click', () => applySelectedOp(btn.getAttribute('data-op')));
            });
        }
        if (selectedCopyBtn) {
            selectedCopyBtn.onclick = async () => {
                try {
                    if (!controlledUnit || controlledUnit.dead) return;
                    const txt = controlledUnit.value?.toString?.() || '';
                    if (navigator.clipboard && txt) await navigator.clipboard.writeText(txt);
                } catch { }
            };
        }

        if (presetToggleBtn && presetPanel) presetToggleBtn.onclick = () => presetPanel.classList.toggle('hidden');
        if (presetExportBtn && presetText) presetExportBtn.onclick = () => { presetText.value = JSON.stringify(exportPreset(), null, 2); };
        if (presetImportBtn && presetText) presetImportBtn.onclick = () => {
            try { applyPreset(JSON.parse(presetText.value || '{}')); logToAiPanel('[PRESET] imported'); }
            catch (err) { showRuntimeError(err); }
        };
        if (presetSaveBtn) presetSaveBtn.onclick = () => {
            try { localStorage.setItem('bif_preset', JSON.stringify(exportPreset())); logToAiPanel('[PRESET] saved'); }
            catch (err) { showRuntimeError(err); }
        };

        // Base upgrade UI wiring
        function buyUpgrade(team, kind) {
            const costs = { wall: 50000n, heal: 40000n, spawn: 60000n, turret: 80000n };
            const cost = costs[kind] || 0n;
            if (TEAM_KNOWLEDGE[team] < cost) { logToAiPanel(`[UPGRADE] ${team.toUpperCase()} needs ${formatBigIntCompact(cost)} knowledge`); return; }
            TEAM_KNOWLEDGE[team] -= cost;
            TEAM_UPGRADES[team][kind] = Math.min(10, TEAM_UPGRADES[team][kind] + 1);
            logToAiPanel(`[UPGRADE] ${team.toUpperCase()} ${kind.toUpperCase()} → L${TEAM_UPGRADES[team][kind]}`);
            if (kind === 'wall') syncWallState(team, { refill: true });
            syncHud();
        }
        if (upgEvenWall) upgEvenWall.onclick = () => buyUpgrade('even', 'wall');
        if (upgOddWall) upgOddWall.onclick = () => buyUpgrade('odd', 'wall');
        if (upgEvenHeal) upgEvenHeal.onclick = () => buyUpgrade('even', 'heal');
        if (upgOddHeal) upgOddHeal.onclick = () => buyUpgrade('odd', 'heal');
        if (upgEvenSpawn) upgEvenSpawn.onclick = () => buyUpgrade('even', 'spawn');
        if (upgOddSpawn) upgOddSpawn.onclick = () => buyUpgrade('odd', 'spawn');
        if (upgEvenTurret) upgEvenTurret.onclick = () => buyUpgrade('even', 'turret');
        if (upgOddTurret) upgOddTurret.onclick = () => buyUpgrade('odd', 'turret');

        // Formation UI
        if (formationSelect) {
            formationSelect.onchange = (e) => {
                if (!controlledUnit || !isLead(controlledUnit)) return;
                controlledUnit.formation = String(e.target.value || 'default');
                logToAiPanel(`[FORMATION] squad ${controlledUnit.squadId} → ${controlledUnit.formation.toUpperCase()}`);
            };
        }

        // Minimap controls: click to pan camera, dblclick to center on selected.
        if (mCanvas) {
            mCanvas.addEventListener('click', (e) => {
                const rect = mCanvas.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width;
                const y = (e.clientY - rect.top) / rect.height;
                camera.x = Math.max(0, Math.min(CONFIG.worldSize, x * CONFIG.worldSize));
                camera.y = Math.max(0, Math.min(CONFIG.worldSize, y * CONFIG.worldSize));
            });
            mCanvas.addEventListener('dblclick', () => {
                if (controlledUnit) { camera.x = controlledUnit.x; camera.y = controlledUnit.y; }
            });
        }

        // Load saved preset (optional)
        try {
            const saved = localStorage.getItem('bif_preset');
            if (saved) applyPreset(JSON.parse(saved));
        } catch { }
        syncHud();
        syncWallState('even', { refill: true });
        syncWallState('odd', { refill: true });
        syncBaseState({ refill: true });
        spawnObjectives();

        // Gesture UI wiring
        if (gesturePanel) {
            gesturePanel.querySelectorAll('[data-gesture]').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (!controlledUnit) return;
                    if (!isLead(controlledUnit)) return;
                    setLeadGesture(controlledUnit, btn.getAttribute('data-gesture'));
                });
            });
        }

        window.addEventListener('keydown', (e) => {
            // Cycle leaders/commanders with Tab (much easier to select).
            if (e.key === 'Tab') {
                const leads = entities.filter(u => isLead(u));
                if (leads.length > 0) {
                    const idx = controlledUnit ? leads.findIndex(l => l.id === controlledUnit.id) : -1;
                    controlledUnit = leads[(idx + 1) % leads.length];
                    camera.x = controlledUnit.x;
                    camera.y = controlledUnit.y;
                    e.preventDefault();
                }
                return;
            }
            if (!controlledUnit || !isLead(controlledUnit)) return;
            const k = e.key;
            if (k >= '0' && k <= '9') {
                setLeadGesture(controlledUnit, k);
                e.preventDefault();
            }
        });
        // Expose team toggles for manual start.
        window.enableTeams = () => setTeamsEnabled(true);
        window.disableTeams = () => setTeamsEnabled(false);

        class MultipleHazard {
            constructor(x, y, val, team) {
                this.x = x; this.y = y; this.val = BigInt(val);
                this.team = team;
                this.radius = 18;
                this.life = 1500;
                this.maxLife = 1500;
            }
            update() {
                this.life--;
                const candidates = queryEntityGrid(this.x, this.y, this.radius + CONFIG.fixedRadius + 80);
                for (let e of candidates) {
                    if (e.dead) continue;
                    if (this.team && e.team === this.team) continue; // no friendly fire
                    const d = Math.hypot(this.x - e.x, this.y - e.y);
                    if (d < this.radius + e.radius) {
                        if (e.evasion && Math.random() < e.evasion) continue;
                        let dmg = this.val * 3n;
                        const theirHealth = bigIntMulFloat(e.effVal, shieldWithShelter(e));
                        if (dmg > theirHealth) { if (!tryShieldSacrifice(e)) e.die(); }
                        else {
                            e.value -= dmg;
                            e.setBigValue(e.value);
                            if (Math.random() < 0.1) particles.push(new Particle(this.x, this.y, CONFIG.colors.hazard, 1.5));
                        }
                    }
                }
            }
            draw(ctx) {
                const sx = (this.x - camera.x) * camera.zoom + width / 2, sy = (this.y - camera.y) * camera.zoom + height / 2;
                const rBase = this.radius * camera.zoom;

                // Safety: Culling if offscreen
                if (sx < -rBase * 2 || sx > width + rBase * 2 || sy < -rBase * 2 || sy > height + rBase * 2) return;

                const alpha = Math.min(1, this.life / 300);
                ctx.globalAlpha = alpha;

                // Fix: Ensure the calculated radius is NEVER negative for arc()
                // pulse can be between -3 and +3. rBase must be larger than pulse.
                const pulse = Math.sin(frame * 0.15) * 3 * camera.zoom;
                const finalRadius = Math.max(0.1, rBase + pulse);

                ctx.fillStyle = CONFIG.colors.hazard;
                ctx.shadowBlur = 15 * camera.zoom;
                ctx.shadowColor = CONFIG.colors.hazard;
                ctx.beginPath();
                ctx.arc(sx, sy, finalRadius, 0, Math.PI * 2);
                ctx.fill();

                ctx.shadowBlur = 0;
                ctx.fillStyle = 'white';
                ctx.font = `bold ${9 * camera.zoom}px "JetBrains Mono"`;
                ctx.textAlign = 'center';
                ctx.fillText(this.val.toString(), sx, sy + 3 * camera.zoom);
                ctx.globalAlpha = 1;
            }
        }

        class Corpse {
            constructor(x, y, value, team) {
                this.x = x; this.y = y; this.value = BigInt(value);
                this.maxLife = 1000; this.life = 1000;
                this.team = team; this.radius = CONFIG.fixedRadius * 1.2;
                this.deposited = false;
            }
            update() {
                if (!TEAMS.enabled) { this.life = 0; return; }
                if (!TEAM_KNOWLEDGE.hasOwnProperty(this.team)) { this.life = 0; return; }
                const g = graveyardPoint(this.team);
                const dx = g.x - this.x;
                const dy = g.y - this.y;
                const d = Math.hypot(dx, dy);

                // Travel to base graveyard.
                const speed = 7;
                if (d > 0.001) {
                    this.x += (dx / d) * speed;
                    this.y += (dy / d) * speed;
                }

                // Once in the graveyard, deposit once, then persist as a marker.
                if (d < 60) {
                    if (!this.deposited) {
                        this.deposited = true;
                        TEAM_KNOWLEDGE[this.team] += this.value;
                        updateKnowledgeMultiplier(this.team);
                        particles.push(new Particle(this.x, this.y, '#d9f99d', 3));
                        this.maxLife = 6000;
                        this.life = this.maxLife;
                    }
                    this.life -= 0.05;
                } else {
                    this.life -= 0.3;
                }
            }
            draw(ctx) {
                const sx = (this.x - camera.x) * camera.zoom + width / 2, sy = (this.y - camera.y) * camera.zoom + height / 2;
                const r = this.radius * camera.zoom;
                if (sx < -r || sx > width + r || sy < -r || sy > height + r) return;

                ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
                ctx.strokeStyle = this.deposited ? '#9ca3af' : CONFIG.colors.corpse;
                ctx.setLineDash([5, 5]);
                ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.stroke();
                ctx.setLineDash([]);
                if (this.deposited) {
                    ctx.fillStyle = 'rgba(255,255,255,0.65)';
                    ctx.font = `bold ${10 * camera.zoom}px "JetBrains Mono"`;
                    ctx.textAlign = 'center';
                    ctx.fillText('RIP', sx, sy + 4 * camera.zoom);
                }
                ctx.globalAlpha = 1;
            }
        }

        class Particle {
            constructor(x, y, color, size = 2) {
                this.x = x; this.y = y; this.color = color;
                this.vx = (Math.random() - 0.5) * 6; this.vy = (Math.random() - 0.5) * 6;
                this.life = 1.0; this.decay = Math.random() * 0.02 + 0.01; this.size = size;
            }
            update() { this.x += this.vx; this.y += this.vy; this.life -= this.decay; }
            draw(ctx) {
                const sx = (this.x - camera.x) * camera.zoom + width / 2, sy = (this.y - camera.y) * camera.zoom + height / 2;
                if (sx < 0 || sx > width || sy < 0 || sy > height) return;
                ctx.globalAlpha = Math.max(0, this.life); ctx.fillStyle = this.color;
                ctx.beginPath(); ctx.arc(sx, sy, Math.max(0.1, this.size * camera.zoom), 0, Math.PI * 2); ctx.fill();
                ctx.globalAlpha = 1;
            }
        }

        class Storm {
            constructor(x, y) {
                this.x = x;
                this.y = y;
                this.r = 520 + Math.random() * 380;
                this.life = 1600;
                const a = Math.random() * Math.PI * 2;
                this.vx = Math.cos(a) * 0.8;
                this.vy = Math.sin(a) * 0.8;
            }
            update() {
                this.life--;
                this.x += this.vx;
                this.y += this.vy;
                if (this.x < 0 || this.x > CONFIG.worldSize) this.vx *= -1;
                if (this.y < 0 || this.y > CONFIG.worldSize) this.vy *= -1;

                // Effect: slow + chip damage (reduced in safe lane).
                const safeY0 = CONFIG.worldSize * 0.45;
                const safeY1 = CONFIG.worldSize * 0.55;
                const laneMult = (this.y > safeY0 && this.y < safeY1) ? 0.35 : 1.0;
                const candidates = queryEntityGrid(this.x, this.y, this.r + 120);
                const dmg = BigInt(Math.floor(20 * laneMult));
                for (const e of candidates) {
                    if (!e || e.dead || e.isDummy) continue;
                    const d = Math.hypot(e.x - this.x, e.y - this.y);
                    if (d > this.r) continue;
                    const t = (this.r - d) / this.r;
                    e.vx *= (1 - 0.08 * t * laneMult);
                    e.vy *= (1 - 0.08 * t * laneMult);
                    if (frame % 10 === 0 && dmg > 0n) {
                        e.value -= dmg;
                        e.setBigValue(e.value);
                    }
                }
            }
            draw(ctx) {
                const sx = (this.x - camera.x) * camera.zoom + width / 2;
                const sy = (this.y - camera.y) * camera.zoom + height / 2;
                const rr = this.r * camera.zoom;
                if (sx + rr < -50 || sy + rr < -50 || sx - rr > width + 50 || sy - rr > height + 50) return;
                ctx.save();
                ctx.globalAlpha = Math.min(0.55, this.life / 2400);
                ctx.fillStyle = 'rgba(168,85,247,0.28)';
                ctx.beginPath();
                ctx.arc(sx, sy, rr, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,0.35)';
                ctx.lineWidth = 2;
                ctx.setLineDash([12, 10]);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.restore();
            }
        }

        class MissileProjectile {
            constructor(x, y, target, team, life = 200) {
                this.x = x;
                this.y = y;
                this.team = team;
                this.life = life;
                this.radius = 10;
                this.targetId = target?.id ?? null;
                this.tx = target?.x ?? x;
                this.ty = target?.y ?? y;
                this.speed = 16;
                this.explosionRadius = 520;
                this.baseDamage = 8000n;
            }
            explode() {
                // AOE damage + knockback
                const candidates = queryEntityGrid(this.x, this.y, this.explosionRadius + CONFIG.fixedRadius + 60);
                for (const e of candidates) {
                    if (!e || e.dead || e.isDummy) continue;
                    if (e.team === this.team) continue;
                    if (e.invulnTimer && e.invulnTimer > 0) continue;
                    const dx = e.x - this.x;
                    const dy = e.y - this.y;
                    const d = Math.hypot(dx, dy);
                    if (d > this.explosionRadius) continue;
                    const t = (this.explosionRadius - d) / this.explosionRadius;
                    const dmg = (this.baseDamage * BigInt(Math.max(0, Math.floor(t * 1000)))) / 1000n;
                    if (dmg > 0n) {
                        const prev = e.value;
                        e.value -= dmg;
                        e.setBigValue(e.value);
                        if (e.dead || e.value <= 0n || e.effVal <= 0n) recordKill(this, e, this.team);
                    }
                    if (d > 0.001) {
                        const push = 2.0 * t;
                        e.vx += (dx / d) * push;
                        e.vy += (dy / d) * push;
                    }
                }

                for (let i = 0; i < 90; i++) {
                    particles.push(new Particle(this.x, this.y, '#f97316', 4));
                }
                for (let i = 0; i < 50; i++) {
                    particles.push(new Particle(this.x, this.y, '#ffffff', 2.5));
                }
                this.life = 0;
            }
            update() {
                this.life--;
                if (this.x < -2000 || this.y < -2000 || this.x > CONFIG.worldSize + 2000 || this.y > CONFIG.worldSize + 2000) { this.life = 0; return; }
                if (tryHitEnemyWall(this, 2_500_000n, { onHit: () => this.explode() })) return;
                if (tryHitEnemyBase(this, 5_000_000n)) { this.explode(); return; }
                const target = this.targetId ? entities.find(e => !e.dead && e.id === this.targetId) : null;
                if (target) { this.tx = target.x; this.ty = target.y; }
                const dx = this.tx - this.x;
                const dy = this.ty - this.y;
                const d = Math.hypot(dx, dy);
                if (d < 20) {
                    this.explode();
                    return;
                }
                if (d > 0.001) {
                    const vx = (dx / d) * this.speed;
                    const vy = (dy / d) * this.speed;
                    this.x += vx;
                    this.y += vy;
                }
                if (this.x < -2000 || this.y < -2000 || this.x > CONFIG.worldSize + 2000 || this.y > CONFIG.worldSize + 2000) { this.life = 0; return; }
                if (tryHitEnemyWall(this, 2_500_000n, { onHit: () => this.explode() })) return;
                if (tryHitEnemyBase(this, 5_000_000n)) { this.explode(); return; }
                if (this.life <= 0) this.explode();
            }
            draw(ctx) {
                const sx = (this.x - camera.x) * camera.zoom + width / 2;
                const sy = (this.y - camera.y) * camera.zoom + height / 2;
                const r = this.radius * camera.zoom;
                if (sx < -r || sx > width + r || sy < -r || sy > height + r) return;
                ctx.save();
                ctx.fillStyle = '#fb7185';
                ctx.shadowBlur = 16 * camera.zoom;
                ctx.shadowColor = '#fb7185';
                ctx.beginPath();
                ctx.arc(sx, sy, r, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1 * camera.zoom;
                ctx.beginPath();
                ctx.arc(sx, sy, r * 1.8, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
        }

        class HomingBulletProjectile {
            constructor(x, y, value, target, team, life = 180, speed = 14, radius = 7) {
                this.x = x;
                this.y = y;
                this.value = BigInt(value);
                this.team = team;
                this.life = life;
                this.speed = speed;
                this.radius = radius;
                this.targetId = target?.id ?? null;
            }
            update() {
                this.life--;
                if (this.x < -2000 || this.y < -2000 || this.x > CONFIG.worldSize + 2000 || this.y > CONFIG.worldSize + 2000) { this.life = 0; return; }
                if (tryHitEnemyWall(this, this.value * 7n)) return;
                if (tryHitEnemyBase(this, this.value * 10n)) return;
                const target = this.targetId ? entities.find(e => !e.dead && e.id === this.targetId) : null;
                if (!target) { this.life = 0; return; }
                const dx = target.x - this.x;
                const dy = target.y - this.y;
                const d = Math.hypot(dx, dy);
                if (d < this.radius + target.radius) {
                    let dmg = this.value * 5n;
                    const theirHealth = bigIntMulFloat(target.effVal, shieldWithShelter(target));
                    if (dmg > theirHealth) { target.die(); recordKill(this, target, this.team); }
                    else { target.value -= dmg; target.setBigValue(target.value); }
                    this.life = 0;
                    return;
                }
                if (d > 0.001) {
                    this.x += (dx / d) * this.speed;
                    this.y += (dy / d) * this.speed;
                }
                if (this.x < -2000 || this.y < -2000 || this.x > CONFIG.worldSize + 2000 || this.y > CONFIG.worldSize + 2000) { this.life = 0; return; }
                if (tryHitEnemyWall(this, this.value * 7n)) return;
                if (tryHitEnemyBase(this, this.value * 10n)) return;
                const d2 = Math.hypot(target.x - this.x, target.y - this.y);
                if (d2 < this.radius + target.radius) {
                    let dmg = this.value * 5n;
                    const theirHealth = bigIntMulFloat(target.effVal, shieldWithShelter(target));
                    if (dmg > theirHealth) { target.die(); recordKill(this, target, this.team); }
                    else { target.value -= dmg; target.setBigValue(target.value); }
                    this.life = 0;
                }
            }
            draw(ctx) {
                const sx = (this.x - camera.x) * camera.zoom + width / 2;
                const sy = (this.y - camera.y) * camera.zoom + height / 2;
                const r = this.radius * camera.zoom;
                if (sx < -r || sx > width + r || sy < -r || sy > height + r) return;
                ctx.fillStyle = '#ffffff';
                ctx.beginPath(); ctx.arc(sx, sy, Math.max(0.5, r), 0, Math.PI * 2); ctx.fill();
            }
        }

        class BigBulletProjectile {
            constructor(x, y, value, angle, team, life = 220) {
                this.x = x; this.y = y; this.value = BigInt(value);
                const speed = 7.5;
                this.vx = Math.cos(angle) * speed; this.vy = Math.sin(angle) * speed;
                this.radius = 14; this.life = life; this.team = team;
            }
            update() {
                this.x += this.vx; this.y += this.vy; this.life--;
                if (this.x < -2000 || this.y < -2000 || this.x > CONFIG.worldSize + 2000 || this.y > CONFIG.worldSize + 2000) { this.life = 0; return; }
                if (tryHitEnemyWall(this, this.value * 10n)) return;
                if (tryHitEnemyBase(this, this.value * 18n)) return;
                const candidates = queryEntityGrid(this.x, this.y, this.radius + CONFIG.fixedRadius + 80);
                for (let e of candidates) {
                    if (e.dead) continue;
                    if (e.team === this.team) continue;
                    if (Math.hypot(this.x - e.x, this.y - e.y) < this.radius + e.radius) {
                        if (e.evasion && Math.random() < e.evasion) { this.life = 0; break; }
                        const dmg = this.value * 8n;
                        const theirHealth = bigIntMulFloat(e.effVal, shieldWithShelter(e));
                        if (dmg > theirHealth) {
                            if (!tryShieldSacrifice(e)) { e.die(); recordKill(this, e, this.team); }
                        } else { e.value -= dmg; e.setBigValue(e.value); }
                        this.life = 0; break;
                    }
                }
            }
            draw(ctx) {
                const sx = (this.x - camera.x) * camera.zoom + width / 2, sy = (this.y - camera.y) * camera.zoom + height / 2;
                const r = this.radius * camera.zoom;
                if (sx < -r || sx > width + r || sy < -r || sy > height + r) return;
                ctx.fillStyle = '#fbbf24';
                ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
            }
        }

        class ExplodingBulletProjectile {
            constructor(x, y, value, angle, team, life = 180) {
                this.x = x; this.y = y; this.value = BigInt(value);
                const speed = 11;
                this.vx = Math.cos(angle) * speed; this.vy = Math.sin(angle) * speed;
                this.radius = 7; this.life = life; this.team = team;
            }
            explodeIntoSmall() {
                const count = 14;
                for (let i = 0; i < count; i++) {
                    const a = (i / count) * Math.PI * 2;
                    projectiles.push(new FactorProjectile(this.x, this.y, 120n, a, this.team, 160));
                }
                for (let i = 0; i < 24; i++) particles.push(new Particle(this.x, this.y, '#fb7185', 3));
            }
            update() {
                this.x += this.vx; this.y += this.vy; this.life--;
                if (this.x < -2000 || this.y < -2000 || this.x > CONFIG.worldSize + 2000 || this.y > CONFIG.worldSize + 2000) { this.life = 0; return; }
                if (tryHitEnemyWall(this, this.value * 8n, { onHit: () => this.explodeIntoSmall() })) return;
                if (tryHitEnemyBase(this, this.value * 12n)) { this.explodeIntoSmall(); return; }
                const candidates = queryEntityGrid(this.x, this.y, this.radius + CONFIG.fixedRadius + 60);
                for (let e of candidates) {
                    if (e.dead) continue;
                    if (e.team === this.team) continue;
                    if (Math.hypot(this.x - e.x, this.y - e.y) < this.radius + e.radius) {
                        // On hit: kill, then explode into small bullets
                        if (!tryShieldSacrifice(e)) { e.die(); recordKill(this, e, this.team); }
                        this.explodeIntoSmall();
                        this.life = 0;
                        return;
                    }
                }
                if (this.life <= 0) { this.explodeIntoSmall(); }
            }
            draw(ctx) {
                const sx = (this.x - camera.x) * camera.zoom + width / 2, sy = (this.y - camera.y) * camera.zoom + height / 2;
                const r = this.radius * camera.zoom;
                if (sx < -r || sx > width + r || sy < -r || sy > height + r) return;
                ctx.fillStyle = '#fb7185';
                ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
            }
        }

        class FactorProjectile {
            constructor(x, y, value, angle, team, life = 250) {
                this.x = x; this.y = y; this.value = BigInt(value);
                const speed = 9;
                this.vx = Math.cos(angle) * speed; this.vy = Math.sin(angle) * speed;
                this.radius = 7; this.life = life; this.team = team;
            }
            update() {
                this.x += this.vx; this.y += this.vy; this.life--;
                if (this.x < -2000 || this.y < -2000 || this.x > CONFIG.worldSize + 2000 || this.y > CONFIG.worldSize + 2000) { this.life = 0; return; }
                if (tryHitEnemyWall(this, this.value * 4n)) return;
                if (tryHitEnemyBase(this, this.value * 8n)) return;
                const candidates = queryEntityGrid(this.x, this.y, this.radius + CONFIG.fixedRadius + 60);
                for (let e of candidates) {
                    if (e.dead) continue;
                    if (e.team === this.team) continue;
                    if (Math.hypot(this.x - e.x, this.y - e.y) < this.radius + e.radius) {
                        if (e.evasion && Math.random() < e.evasion) { this.life = 0; break; }
                        let dmg = this.value * 5n;
                        const theirHealth = bigIntMulFloat(e.effVal, shieldWithShelter(e));
                        if (dmg > theirHealth) {
                            if (!tryShieldSacrifice(e)) { e.die(); recordKill(this, e, this.team); }
                        }
                        else { e.value -= dmg; e.setBigValue(e.value); }
                        if (e.reflectChance && Math.random() < e.reflectChance) this.life = 0;
                        this.life = 0; break;
                    }
                }
            }
            draw(ctx) {
                const sx = (this.x - camera.x) * camera.zoom + width / 2, sy = (this.y - camera.y) * camera.zoom + height / 2;
                const r = this.radius * camera.zoom;
                if (sx < -r || sx > width + r || sy < -r || sy > height + r) return;
                ctx.fillStyle = CONFIG.colors.projectile;
                ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
            }
        }

        class NumberUnit {
            constructor(x, y, value, isResistor = false, skipClone = false, isDummy = false, dummyTeam = null) {
                this.x = x; this.y = y; this.vx = 0; this.vy = 0;
                this.id = nextEntityId++;
                const drift = isDummy ? 0.8 : 2.5;
                this.vx = (Math.random() - 0.5) * drift; this.vy = (Math.random() - 0.5) * drift;
                this.radius = CONFIG.fixedRadius; this.dead = false; this.breedTimer = 0;
                this.age = 0; this.isResistor = isResistor; this.skipClone = skipClone;
                this.isDummy = isDummy;
                this.adaptation = 1.0;
                this.reviveTimer = 0;
                this.isReviving = false;
                this.invulnTimer = 0;
                this.temporaryLife = null;
                this.archetype = null;
                this.damageMult = 1.0;
                this.speedFactor = 1.0;
                this.shieldMult = 1.0;
                this.spawnBoost = 1.0;
                this.evasion = 0.0;
                this.regenBoost = 0;
                this.supportBoost = 1.0;
                this.effValBoost = 1.0;
                this.reflectChance = 0.0;
                this.factorBurn = false;
                this.bondSeeking = false;
                this.drainDigits = false;
                this.carryingKnowledge = 0n;
                this.stuckFrames = 0;
                this.livesMax = 1;
                this.livesLeft = 1;
                this.noPow2Split = false;
                this.role = 'worker';
                this.isLeader = false;
                this.isCommander = false;
                this.isDummyPlacer = false;
                this.factorSpewCooldown = 0;
                this.paritySpawnCooldown = 0;
                const roleRoll = Math.random();
                if (!isDummy) {
                    if (roleRoll < 0.03) { this.role = 'leader'; this.isLeader = true; }
                    else if (roleRoll < 0.10) { this.role = 'commander'; this.isCommander = true; }
                    else if (roleRoll < 0.17) { this.role = 'dummy-placer'; this.isDummyPlacer = true; }
                }

                if (this.isLeader || this.isCommander) {
                    this.squadId = nextSquadId++;
                    this.meetingTimer = 0;
                    this.gesture = 0;
                    this.gestureFrame = 0;
                } else {
                    this.squadId = 0;
                    this.squadLeadId = null;
                }

                this.aoe = null;
                
                // Module Assignment
                const r = Math.random();
                if (r < 0.22) this.module = 'attack';
                else if (r < 0.44) this.module = 'defense';
                else if (r < 0.64) this.module = 'support';
                else if (r < 0.82) this.module = 'swarm';
                else if (r < 0.92) this.module = 'shield';
                else this.module = 'trans';

                this.setBigValue(value, dummyTeam);
            }

            setBigValue(val, dummyTeam = null) {
                let next;
                if (typeof val === 'bigint') next = val;
                else if (typeof val === 'number') next = BigInt(Math.trunc(val));
                else next = BigInt(val);

                if (next <= 0n) {
                    this.value = 0n;
                    this.die();
                    return;
                }

                this.value = next;
                this.valString = this.value.toString();
                this.isEven = this.value % 2n === 0n;
                this.isPrimeNum = isPrime(this.value);
                this.isHappyNum = isHappy(this.value);
                this.isCyclic = CYCLIC_NUMS[this.valString] !== undefined;
                
                this.traits = [];
                for (let [trait, check] of Object.entries(TRAITS)) {
                    if (check(this.value)) this.traits.push(trait);
                }
                this.extraTraits = getExtraTraits(this.value);
                
                this.archetype = pickMathArchetype(this.value);
                applyArchetype(this);
                applyModule(this);
                
                this.team = dummyTeam ? dummyTeam : ((this.isEven || this.isCyclic) ? 'even' : 'odd');
                this.baseTeam = this.team;
                this.isMultiplier = this.value >= 2n && this.value < 20n && !this.isDummy;

                if (this.isDummy) this.color = this.team === 'even' ? '#083344' : '#4a044e';
                else if (this.isCyclic) this.color = CONFIG.colors.cyclic;
                else if (this.isResistor) this.color = CONFIG.colors.resistance;
                else if (this.isPrimeNum) this.color = CONFIG.colors.prime;
                else this.color = this.archetype?.color || (this.team === 'even' ? CONFIG.colors.even : CONFIG.colors.odd);

                this.baseEffVal = this.value;
                this.baseEffVal *= 4n;
                this.baseEffVal = bigIntMulFloat(this.baseEffVal, 1.0);

                if (!this.isHappyNum) this.baseEffVal *= 3n; else this.baseEffVal /= 2n;
                if (this.isDummy) this.baseEffVal = 5000n;

                if (this.traits.includes('isPerfect')) this.baseEffVal *= 5n;
                if (this.traits.includes('isFibonacci')) this.adaptation += 0.5;
                if (this.effValBoost !== undefined) this.baseEffVal = bigIntMulFloat(this.baseEffVal, this.effValBoost);

                const knowMult = TEAM_KNOWLEDGE_MULT[this.team] || 1.0;
                this.effVal = bigIntMulFloat(this.baseEffVal, knowMult);
                this.maxEffVal = this.effVal;

                // Leaders/commanders are tankier than workers.
                if (this.isLeader) {
                    this.maxEffVal = bigIntMulFloat(this.maxEffVal, 1.45);
                    this.effVal = this.maxEffVal;
                    this.shieldMult = Math.max(this.shieldMult || 1, 1.35);
                } else if (this.isCommander) {
                    this.maxEffVal = bigIntMulFloat(this.maxEffVal, 1.25);
                    this.effVal = this.maxEffVal;
                    this.shieldMult = Math.max(this.shieldMult || 1, 1.2);
                }
            }

            getFactors() {
                let factors = [];
                let n = this.value;
                for (let i = 1n; i * i <= n && factors.length < 10; i++) {
                    if (n % i === 0n) {
                        factors.push(i);
                        if (i * i !== n) factors.push(n / i);
                    }
                }
                return factors;
            }

            getAllProperFactors() {
                const n = this.value;
                if (n <= 3n) return [];

                // Safety: avoid extremely expensive scans on huge values.
                const num = finiteNumberFromBigInt(n);
                if (num === null || num > 500_000_000) {
                    // Fallback: return a limited set of small factors (still excludes n).
                    const out = [1n];
                    for (let i = 2n; i <= 500n; i++) {
                        if (n % i === 0n) {
                            out.push(i);
                            const q = n / i;
                            if (q !== n && q !== i) out.push(q);
                        }
                        if (out.length >= 120) break;
                    }
                    return out;
                }

                const seen = new Set();
                const out = [];
                const add = (f) => {
                    if (f === n) return;
                    const k = f.toString();
                    if (seen.has(k)) return;
                    seen.add(k);
                    out.push(f);
                };
                add(1n);
                const limit = BigInt(Math.floor(Math.sqrt(num)));
                for (let i = 2n; i <= limit; i++) {
                    if (n % i !== 0n) continue;
                    add(i);
                    add(n / i);
                }
                out.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
                return out;
            }

            getProperFactors() {
                const n = this.value;
                const seen = new Set();
                const out = [];
                for (const f of this.getFactors()) {
                    if (f === n) continue;
                    const k = f.toString();
                    if (seen.has(k)) continue;
                    seen.add(k);
                    out.push(f);
                }
                return out;
            }

            releaseFactors() {
                const factors = this.getProperFactors();
                factors.forEach((f, i) => {
                    projectiles.push(new FactorProjectile(this.x, this.y, f, (i / factors.length) * Math.PI * 2, this.team, 100));
                });
            }

            spewProperFactorsAsUnits() {
                if (this.isDummy) return;
                if (this.isPrimeNum) return;
                const factors = this.getAllProperFactors();
                if (factors.length === 0) return;

                const room = Math.max(0, CONFIG.maxEntities - entities.length);
                const count = Math.min(factors.length, room);
                if (count === 0) return;

                for (let i = 0; i < count; i++) {
                    const f = factors[i];
                    const a = (i / count) * Math.PI * 2 + Math.random() * 0.2;
                    const dist = this.radius * 2 + 10 + Math.random() * 30;
                    const nx = this.x + Math.cos(a) * dist;
                    const ny = this.y + Math.sin(a) * dist;
                    const child = new NumberUnit(nx, ny, f);
                    const burst = 6;
                    child.vx += Math.cos(a) * burst;
                    child.vy += Math.sin(a) * burst;
                    entities.push(child);
                }
            }

            spewEvenFactors() {
                if (this.isDummy) return;
                const factors = this.getProperFactors().filter(f => f % 2n === 0n && f > 0n);
                if (factors.length === 0) return;
                const room = Math.max(0, CONFIG.maxEntities - entities.length);
                const count = Math.min(6, factors.length, room);
                for (let i = 0; i < count; i++) {
                    const f = factors[i];
                    const a = (i / count) * Math.PI * 2;
                    const dist = this.radius * 1.8 + 8 + Math.random() * 20;
                    const nx = this.x + Math.cos(a) * dist;
                    const ny = this.y + Math.sin(a) * dist;
                    const child = new NumberUnit(nx, ny, f, false, false, false, this.team);
                    child.noPow2Split = true;
                    child.invulnTimer = 24;
                    entities.push(child);
                }
            }

            conductMultiples() {
                if (!this.isMultiplier) return;
                if (!this.skipClone && entities.length < CONFIG.maxEntities) {
                    const clone = new NumberUnit(this.x, this.y, this.value, this.isResistor, true);
                    entities.push(clone);
                }
                for (let i = 1; i <= 12; i++) {
                    let multi = Number(this.value) * i;
                    if (multi < 20) {
                        const ang = Math.random() * Math.PI * 2;
                        const dist = 50 + Math.random() * 150;
                        hazards.push(new MultipleHazard(this.x + Math.cos(ang) * dist, this.y + Math.sin(ang) * dist, multi, this.team));
                    }
                }
                for (let i = 0; i < 8; i++) particles.push(new Particle(this.x, this.y, CONFIG.colors.hazard, 3));
            }

            update() {
                if (this.dead) return;
                this.age++;
                if (this.value <= 0n) { this.die(); return; }
                this.inBase = pointInRect(this.x, this.y, baseRect(this.team));
                if (this.temporaryLife !== null) {
                    this.temporaryLife--;
                    if (this.temporaryLife <= 0) { this.die(); return; }
                }
                if (this.regenBoost && this.maxEffVal) {
                    const regen = Math.max(1, Math.floor(Number(this.maxEffVal) * this.regenBoost));
                    this.effVal = BigInt(Math.min(Number(this.maxEffVal), Number(this.effVal) + regen));
                }
                // Shelter regen inside base.
                if (this.inBase && this.maxEffVal) {
                    const healLvl = TEAM_UPGRADES[this.team]?.heal || 0;
                    const mult = 0.003 * (1 + Math.min(6, healLvl) * 0.45);
                    const regen = bigIntMulFloat(this.maxEffVal, mult);
                    this.effVal = this.effVal + regen;
                    if (this.effVal > this.maxEffVal) this.effVal = this.maxEffVal;
                }
                if (this.carryingKnowledge > 0n) {
                    const drop = entities.find(e => !e.dead && e.team === this.team && (e.isLeader || e.isCommander) && Math.hypot(this.x - e.x, this.y - e.y) < 200);
                    if (drop) {
                        TEAM_KNOWLEDGE[this.team] += this.carryingKnowledge;
                        this.carryingKnowledge = 0n;
                        updateKnowledgeMultiplier(this.team);
                        particles.push(new Particle(this.x, this.y, '#d9f99d', 3));
                    }
                }
                if (this.isDummy) return;
                if (this.isLeader || this.isCommander) maybeStartMeeting(this);

                if (this.reviveTimer > 0) {
                    this.reviveTimer--;
                    if (this.reviveTimer === 0) {
                        this.isReviving = false;
                        this.effVal = this.maxEffVal;
                    }
                    return; // Don't move while reviving
                }

                if (this.breedTimer > 0) this.breedTimer--;
                if (this.invulnTimer > 0) this.invulnTimer--;
                if (this.factorSpewCooldown > 0) this.factorSpewCooldown--;
                if (this.paritySpawnCooldown > 0) this.paritySpawnCooldown--;

                applyAoeControl(this);

                // Support counterplay: small shield bubble that clears nearby enemy projectiles.
                if (this.module === 'support' && projectiles.length > 0 && (frame + this.id) % 12 === 0) {
                    const R = 190;
                    const R2 = R * R;
                    let cleared = 0;
                    for (let i = projectiles.length - 1; i >= 0 && cleared < 10; i--) {
                        const p = projectiles[i];
                        if (!p || p.life <= 0) continue;
                        if (p.team === this.team) continue;
                        const dx = p.x - this.x;
                        const dy = p.y - this.y;
                        if ((dx * dx + dy * dy) <= R2) {
                            p.life = 0;
                            cleared++;
                            if (!FX.lowFx) {
                                for (let k = 0; k < 3; k++) particles.push(new Particle(p.x, p.y, 'rgba(34,197,94,0.9)', 2.2));
                            }
                        }
                    }
                }

                const retreat = this.squadId ? (SQUAD_RETREAT.get(this.squadId) || 0) : 0;
                if (retreat > 0) {
                    const c = baseCenter(this.team);
                    this.vx += (c.x - this.x) * 0.01;
                    this.vy += (c.y - this.y) * 0.01;
                }
                
                if (this.age % 600 === 0) {
                    this.adaptation += 0.12; // identical for both teams for fairness
                }

                if (this.isMultiplier && this.age % CONFIG.multipleInterval === 0) {
                    this.conductMultiples();
                }

                // Composite rule: every ~10 seconds, composites spew all proper factors (excluding itself).
                if (!this.isPrimeNum && this.value > 3n && this.factorSpewCooldown <= 0) {
                    if ((frame + this.id) % 600 === 0) {
                        this.spewProperFactorsAsUnits();
                        this.factorSpewCooldown = 90;
                    }
                }

                // Multiplication rule: every ~1 minute, each unit spawns a few same-parity units.
                if (this.paritySpawnCooldown <= 0) {
                    if ((frame + this.id * 7) % 3600 === 0 && entities.length < CONFIG.maxEntities) {
                        const extra = this.buffTier === 'ultra' ? 1 : 0;
                        const count = 1 + ((randSpawn() * 3) | 0) + extra;
                        for (let i = 0; i < count && entities.length < CONFIG.maxEntities; i++) {
                            let childVal = BigInt(Math.floor(randSpawn() * 1000000)) * (this.value > 2n ? this.value : 3n) / 1000000n + 1n;
                            childVal = adjustValueForTeam(childVal, this.team);
                            const a = randSpawn() * Math.PI * 2;
                            const dist = 40 + randSpawn() * 140;
                            const nx = this.x + Math.cos(a) * dist;
                            const ny = this.y + Math.sin(a) * dist;
                            const u = new NumberUnit(nx, ny, childVal);
                            const tier = rollBuffTier();
                            applyBuffTier(u, tier);
                            if (TEAMS.enabled) applySpawnUpgradeBias(u, this.team, tier);
                            entities.push(u);
                            assignSquad(u);
                        }
                        this.paritySpawnCooldown = 180;
                    }
                }

                let speedMult = TEAMS.enabled ? (this.team === 'even' ? 1.9 : 1.85) : 5.5;
                if (this.age % 600 === 0) speedMult *= 1.5; 
                speedMult *= this.speedFactor;
                if (this.carryingKnowledge > 0n) speedMult *= 0.9;
                if (this.isLeader) speedMult *= 1.1;
                if (this.isCommander) speedMult *= 1.05;
                if (this.tacticBoostTimer && this.tacticBoostTimer > 0) {
                    this.tacticBoostTimer--;
                    speedMult *= 1.03;
                }

                // Trans modules: help nearby allies move faster by "towing" along their direction of travel.
                if (this.module === 'trans' && entities.length < 1400 && (frame + this.id) % 12 === 0) {
                    const mag = Math.hypot(this.vx, this.vy);
                    if (mag > 0.5) {
                        const dirx = this.vx / mag;
                        const diry = this.vy / mag;
                        const near = queryEntityGrid(this.x, this.y, 280);
                        for (const a of near) {
                            if (!a || a.dead || a.isDummy) continue;
                            if (a.team !== this.team) continue;
                            if (a === this) continue;
                            a.vx += dirx * 0.22;
                            a.vy += diry * 0.22;
                        }
                    }
                }

                // Meeting behavior: rally to squad lead.
                if (this.squadId && !(this.isLeader || this.isCommander)) {
                    const lead = entities.find(e => !e.dead && e.id === this.squadLeadId);
                    if (lead && lead.meetingTimer > 0) {
                        if (this.module === 'defense') {
                            const a = (this.id * 0.37 + frame * 0.02) % (Math.PI * 2);
                            const targetX = lead.x + Math.cos(a) * 170;
                            const targetY = lead.y + Math.sin(a) * 170;
                            this.vx += (targetX - this.x) * 0.01;
                            this.vy += (targetY - this.y) * 0.01;
                        } else {
                            this.vx += (lead.x - this.x) * 0.008;
                            this.vy += (lead.y - this.y) * 0.008;
                        }
                    }
                }

                // Gesture orders from leader/commander.
                if (this.squadId && !(this.isLeader || this.isCommander)) {
                    const lead = entities.find(e => !e.dead && e.id === this.squadLeadId);
                    if (lead) {
                        const g = Number(lead.gesture || 0);
                        const meet = lead.meetingPoint || baseCenter(this.team);
                        const form = lead.formation || 'default';
                        const baseDir = (Math.hypot(lead.vx, lead.vy) > 0.2)
                            ? Math.atan2(lead.vy, lead.vx)
                            : (this.team === 'even' ? 0 : Math.PI);
                        const cos = Math.cos(baseDir);
                        const sin = Math.sin(baseDir);
                        const idx = (this.id % 25) - 12;
                        const row = Math.floor((this.id % 100) / 10);
                        const applyFormationTowardMeet = (strength) => {
                            let ox = 0, oy = 0;
                            if (form === 'line') {
                                ox = 0;
                                oy = idx * 35;
                            } else if (form === 'wedge') {
                                ox = row * 55;
                                oy = idx * 16;
                            } else if (form === 'box') {
                                const c = (this.id % 10) - 5;
                                const r = Math.floor((this.id % 40) / 10) - 2;
                                ox = r * 55;
                                oy = c * 35;
                            } else if (form === 'escort') {
                                const a = (this.id * 0.31 + frame * 0.01) % (Math.PI * 2);
                                const dist = (this.module === 'defense' ? 220 : 160);
                                ox = Math.cos(a) * dist;
                                oy = Math.sin(a) * dist;
                            }
                            const tx = meet.x + ox * cos - oy * sin;
                            const ty = meet.y + ox * sin + oy * cos;
                            this.vx += (tx - this.x) * strength;
                            this.vy += (ty - this.y) * strength;
                        };
                        if (g === 1) { // RALLY
                            applyFormationTowardMeet(0.007);
                        } else if (g === 2) { // SCATTER
                            this.vx += (this.x - lead.x) * 0.006;
                            this.vy += (this.y - lead.y) * 0.006;
                        } else if (g === 3) { // PUSH (follow leader direction)
                            const mag = Math.hypot(lead.vx, lead.vy);
                            if (mag > 0.1) { this.vx += (lead.vx / mag) * 0.6; this.vy += (lead.vy / mag) * 0.6; }
                        } else if (g === 4) { // HOLD
                            this.vx *= 0.85;
                            this.vy *= 0.85;
                            applyFormationTowardMeet(0.003);
                        } else if (g === 5) { // RING
                            const a = (this.id * 0.19 + frame * 0.01) % (Math.PI * 2);
                            const dist = (this.module === 'defense' ? 220 : 140);
                            const tx = meet.x + Math.cos(a) * dist;
                            const ty = meet.y + Math.sin(a) * dist;
                            this.vx += (tx - this.x) * 0.008;
                            this.vy += (ty - this.y) * 0.008;
                        } else if (g === 6) { // HUNT
                            this.aggression = 1.3;
                        } else if (g === 7) { // RETREAT
                            const nearestEnemy = entities
                                .filter(e => !e.dead && !e.isDummy && e.team !== this.team)
                                .sort((a, b) => Math.hypot(a.x - this.x, a.y - this.y) - Math.hypot(b.x - this.x, b.y - this.y))[0];
                            if (nearestEnemy) {
                                this.vx += (this.x - nearestEnemy.x) * 0.004;
                                this.vy += (this.y - nearestEnemy.y) * 0.004;
                            }
                        } else if (g === 8) { // MEETING
                            applyFormationTowardMeet(0.012);
                        } else if (g === 9) { // DUMMY
                            // dummy-placers already deploy; everyone else just rallies.
                            applyFormationTowardMeet(0.004);
                        } else {
                            this.aggression = 1.0;
                        }
                    }
                }

                if (controlledUnit === this) {
                    const s = (this.isHappyNum ? 1.2 : 0.6) * speedMult;
                    if (keys.w) this.vy -= s; if (keys.s) this.vy += s;
                    if (keys.a) this.vx -= s; if (keys.d) this.vx += s;
                    camera.x += (this.x - camera.x) * 0.1; camera.y += (this.y - camera.y) * 0.1;
                } else {
                    let ax = 0, ay = 0, avx = 0, avy = 0, tm = 0, sx = 0, sy = 0;
                    let bestTarget = null;
                    let maxTargetPriority = -Infinity;
                    
                    let supportTarget = null;
                    let minHealthRatio = 1.0;

                    const senseRange = 1100;
                    const candidates = queryEntityGrid(this.x, this.y, senseRange);
                    for (let e of candidates) {
                        if (e === this || e.dead) continue;
                        const d = Math.hypot(this.x - e.x, this.y - e.y);

                    // Anti-clump: push away when overlapping.
                    if (d > 0 && d < this.radius + e.radius) {
                        const push = (this.radius + e.radius - d) / (this.radius + e.radius);
                        this.vx += (this.x - e.x) * 0.02 * push;
                        this.vy += (this.y - e.y) * 0.02 * push;
                    }

                    if (d < this.radius + e.radius) {
                        // Enemy contact rule:
                        // - Same parity never kills each other.
                        // - Opposite parity: larger numeric value kills the smaller (no absorb/merge).
                        if (this.team !== e.team && !this.isReviving && !e.isReviving) {
                            if ((this.invulnTimer && this.invulnTimer > 0) || (e.invulnTimer && e.invulnTimer > 0)) continue;
                            // Only resolve once per pair.
                            if (this.id < e.id) {
                                // Opposite parity => values can never be equal; bigger always exists.
                                const bigger = this.value > e.value ? this : e;
                                const smaller = bigger === this ? e : this;
                                if (!tryShieldSacrifice(smaller)) {
                                    recordKill(bigger, smaller);
                                    smaller.die();
                                    if (!FX.lowFx) {
                                        for (let i = 0; i < 6; i++) particles.push(new Particle(smaller.x, smaller.y, '#ffffff', 2.5));
                                    }
                                }
                            }
                            if (this.dead) return;
                            continue;
                        }
                    }

                    if (e.team === this.team) {
                        const sepRadius = 140;
                        if (d < sepRadius) {
                            const push = (sepRadius - d) / sepRadius;
                            this.vx += (this.x - e.x) * 0.01 * push;
                            this.vy += (this.y - e.y) * 0.01 * push;
                        }
                        // Squad separation:
                        // - Cohere primarily with your own squad.
                        // - Repel other squads of the same team so commanders can drive sub-teams.
                        const sameSquad = (!this.squadId || this.squadId === 0) ? true : (e.squadId === this.squadId);
                        if (!sameSquad && d < 260) {
                            const push = (260 - d) / 260;
                            this.vx += (this.x - e.x) * 0.02 * push;
                            this.vy += (this.y - e.y) * 0.02 * push;
                        }

                        const squadRange = 520;
                        if (sameSquad && d < squadRange) {
                            ax += e.x; ay += e.y; avx += e.vx; avy += e.vy; tm++;
                            if (d < 70) { sx += (this.x - e.x); sy += (this.y - e.y); }
                        }
                        if (this.module === 'support') {
                            let healthRatio = Number(e.effVal) / Number(e.maxEffVal);
                            if ((healthRatio < 0.3 || e.isReviving) && healthRatio < minHealthRatio) {
                                minHealthRatio = healthRatio;
                                supportTarget = e;
                            }
                        }
                    } else {
                            const aggro = this.aggression || 1.0;
                            let priority = ((Math.log(Number(e.value) + 1) * 200) - d) * aggro;
                            if (e.isDummy) priority += 6000; // dummies are trojan horses: prioritize heavily
                            if (e.isLeader) priority += 5000;
                            else if (e.isCommander) priority += 2000;
                            else if (e.isDummyPlacer) priority += 1200;
                            if (priority > maxTargetPriority) { maxTargetPriority = priority; bestTarget = e; }
                        }
                    }

                    const behaviorMult = 0.02 * this.adaptation; // parity: same steering strength for both teams
                    
                    if (this.module === 'swarm' || this.team === 'even') {
                        if (tm > 0) {
                            // Anti-clump: reduced cohesion, increased separation.
                            this.vx += (ax / tm - this.x) * behaviorMult * 0.6 + (avx / tm) * 0.08 + sx * 0.18;
                            this.vy += (ay / tm - this.y) * behaviorMult * 0.6 + (avy / tm) * 0.08 + sy * 0.18;
                        }
                    } else if (tm > 0) {
                        this.vx += (ax / tm - this.x) * behaviorMult * 0.4 + (avx / tm) * 0.08 + sx * 0.14;
                        this.vy += (ay / tm - this.y) * behaviorMult * 0.4 + (avy / tm) * 0.08 + sy * 0.14;
                    }

                    // Squad anchor: gentle pull toward your squad lead outside of meetings.
                    if (this.squadId && !(this.isLeader || this.isCommander)) {
                        const lead = entities.find(e => !e.dead && e.id === this.squadLeadId);
                        if (lead) {
                            const pull = (lead.meetingTimer && lead.meetingTimer > 0) ? 0.0 : 0.0018;
                            this.vx += (lead.x - this.x) * pull;
                            this.vy += (lead.y - this.y) * pull;
                        }
                    }

                    if (this.module === 'support' && supportTarget) {
                        const a = Math.atan2(supportTarget.y - this.y, supportTarget.x - this.x);
                        this.vx += Math.cos(a) * 0.8; this.vy += Math.sin(a) * 0.8;
                        this.isSupporting = true;
                        this.supportLineTarget = supportTarget;
                        // Defenders defend the support
                        entities.filter(d_e => d_e.team === this.team && d_e.module === 'defense' && Math.hypot(d_e.x - this.x, d_e.y - this.y) < 200).forEach(d_e => {
                            const da = Math.atan2(this.y - d_e.y, this.x - d_e.x);
                            d_e.vx += Math.cos(da) * 0.4; d_e.vy += Math.sin(da) * 0.4;
                        });
                    } else {
                        this.isSupporting = false;
                    }

                    if (bestTarget) {
                        const a = Math.atan2(bestTarget.y - this.y, bestTarget.x - this.x);
                        let huntSpeed = (this.module === 'attack' ? 1.8 : 1.1) * speedMult;
                        huntSpeed *= (TEAMS.enabled ? 2.4 : 3.2);
                        this.vx += Math.cos(a) * huntSpeed;
                        this.vy += Math.sin(a) * huntSpeed;
                    }

                    if (this.module === 'defense' && tm > 0) {
                        const a = Math.atan2(ay / tm - this.y, ax / tm - this.x);
                        this.vx += Math.cos(a) * 0.2; this.vy += Math.sin(a) * 0.2;
                    }
                    
                    if (this.cyclePhase !== 0) {
                        this.vx += Math.cos(this.cyclePhase + frame * 0.05) * 0.2;
                        this.vy += Math.sin(this.cyclePhase + frame * 0.05) * 0.2;
                    }

                    if (this.isLeader && frame % 30 === 0) {
                        entities.filter(a => !a.dead && a.team === this.team && a !== this && Math.hypot(a.x - this.x, a.y - this.y) < 260)
                            .forEach(a => { a.adaptation += 0.05; a.effVal = bigIntMulFloat(a.effVal, 1.02); a.maxEffVal = a.effVal; });
                    }

                    if (this.isCommander && frame % 40 === 0) {
                        entities.filter(a => !a.dead && a.team === this.team && !a.isLeader && !a.isCommander && Math.hypot(a.x - this.x, a.y - this.y) < 220)
                            .forEach(a => {
                                const dx = this.vx * 0.3, dy = this.vy * 0.3;
                                a.vx += dx; a.vy += dy;
                            });
                    }

                    if (this.isDummyPlacer && frame % 240 === 0 && entities.length < CONFIG.maxEntities) {
                        const target = bestTarget || supportTarget || this;
                        const angle = Math.atan2(target.y - this.y, target.x - this.x) + (Math.random() - 0.5);
                        const dist = 180 + Math.random() * 120;
                        const dx = this.x + Math.cos(angle) * dist;
                        const dy = this.y + Math.sin(angle) * dist;
                        entities.push(new NumberUnit(dx, dy, 100n, false, false, true, this.team));
                    }

                    this.vx += (Math.random() - 0.5) * 0.2;
                    this.vy += (Math.random() - 0.5) * 0.2;

                    if (this.value > 1000000n) {
                        this.vx += (Math.random() - 0.5) * 2;
                        this.vy += (Math.random() - 0.5) * 2;
                    }

                    // If velocity ever gets too low, give every module a gentle wander so nothing stays frozen.
                    const speedMag = Math.abs(this.vx) + Math.abs(this.vy);
                    if (speedMag < 0.35) {
                        const a = Math.random() * Math.PI * 2;
                        const nudge = 0.9;
                        this.vx += Math.cos(a) * nudge;
                        this.vy += Math.sin(a) * nudge;
                    }

                    // Anti-freeze: if basically not moving for a while, shove randomly.
                    const moveMag = Math.abs(this.vx) + Math.abs(this.vy);
                    if (moveMag < 0.08) this.stuckFrames++;
                    else this.stuckFrames = 0;
                    if (this.stuckFrames > 18) {
                        const a = Math.random() * Math.PI * 2;
                        const push = 4.5;
                        this.vx += Math.cos(a) * push;
                        this.vy += Math.sin(a) * push;
                        this.stuckFrames = 0;
                    }

                    // Safety: cap velocity to prevent runaway speeds after boosts.
                    const cap = Math.max(12, 10 * speedMult);
                    const mag = Math.hypot(this.vx, this.vy);
                    if (mag > cap) {
                        const s = cap / mag;
                        this.vx *= s;
                        this.vy *= s;
                    }
                }

                this.x += this.vx; this.y += this.vy;
                this.vx *= CONFIG.friction; this.vy *= CONFIG.friction;
                // Post-friction nudge if we still ended up almost stopped.
                const postMag = Math.abs(this.vx) + Math.abs(this.vy);
                if (postMag < 0.08) {
                    const a = Math.random() * Math.PI * 2;
                    const n = 0.7;
                    this.vx += Math.cos(a) * n;
                    this.vy += Math.sin(a) * n;
                }
                if (this.x < 0 || this.x > CONFIG.worldSize) this.vx *= -1;
                if (this.y < 0 || this.y > CONFIG.worldSize) this.vy *= -1;
            }

            die() {
                if (this.dead || this.isReviving) return;
                // Multi-life units: consume a life and respawn at base instead of dying.
                if (!this.isDummy && (this.livesLeft || 1) > 1) {
                    this.livesLeft = Math.max(0, (this.livesLeft || 1) - 1);
                    this.isReviving = true;
                    this.reviveTimer = 90;
                    this.invulnTimer = 120;
                    const c = baseCenter(this.team);
                    this.x = c.x + (Math.random() - 0.5) * 220;
                    this.y = c.y + (Math.random() - 0.5) * 220;
                    this.vx = 0;
                    this.vy = 0;
                    this.effVal = this.maxEffVal;
                    particles.push(new Particle(this.x, this.y, '#ffffff', 5));
                    return;
                }

                this.dead = true;
                if (controlledUnit === this) controlledUnit = null;

                if ((this.isLeader || this.isCommander) && this.squadId) {
                    SQUAD_RETREAT.set(this.squadId, 900);
                }

                // 2^n split tree: on death, release the full binary tree down to 2s.
                spawnPowerOfTwoTreeSplits(this);
                
                if (this.team === 'even' && !this.isDummy) {
                    for (let e of entities) {
                        if (e.dead || e.team === 'even') continue;
                        const d = Math.hypot(this.x - e.x, this.y - e.y);
                        if (d < 200) {
                            e.value -= this.value / 2n;
                            if (e.value <= 0n) e.die();
                            else e.setBigValue(e.value);
                        }
                    }
                    for (let i = 0; i < 30; i++) particles.push(new Particle(this.x, this.y, '#ffffff', 5));
                }

                if (!this.isDummy && !this.isPrimeNum && this.value > 3n) {
                    // Composite death: spew all proper factors (not itself).
                    this.spewProperFactorsAsUnits();
                }

                if (!this.isDummy && !this.isLeader && !this.isCommander) corpses.push(new Corpse(this.x, this.y, this.value, this.team));
                if (this.isPrimeNum && !this.isDummy) {
                    const count = this.isHappyNum ? 12 : 6;
                    for (let i = 0; i < count; i++) projectiles.push(new FactorProjectile(this.x, this.y, this.value, (i / count) * Math.PI * 2, this.team, 400));
                }
                for (let i = 0; i < 15; i++) particles.push(new Particle(this.x, this.y, this.color));
            }

            draw(ctx) {
                const sx = (this.x - camera.x) * camera.zoom + width / 2, sy = (this.y - camera.y) * camera.zoom + height / 2;
                let r = this.radius * camera.zoom;
                if (sx < -r * 2 || sx > width + r * 2 || sy < -r * 2 || sy > height + r * 2) return;
                if (FX.drawDist && Math.hypot(this.x - camera.x, this.y - camera.y) > FX.drawDist) return;

                // Buff rings
                if (FX.showRings && !this.isDummy && this.buffTier && this.buffTier !== 'normal') {
                    // Draw rings only when not too crowded (performance).
                    if (entities.length > 1400) {
                        // skip
                    } else {
                    ctx.save();
                    ctx.lineWidth = 2 * camera.zoom;
                    const baseR = Math.max(0.1, r * 1.2);
                    if (this.buffTier === 'super') {
                        const colors = ['#ef4444', '#22c55e', '#3b82f6']; // red, green, blue
                        for (let i = 0; i < 3; i++) {
                            ctx.strokeStyle = colors[i];
                            ctx.beginPath();
                            ctx.arc(sx, sy, baseR + i * 6 * camera.zoom, 0, Math.PI * 2);
                            ctx.stroke();
                        }
                    } else if (this.buffTier === 'mega') {
                        for (let i = 0; i < 5; i++) {
                            const hue = (frame * 6 + i * 60) % 360;
                            ctx.strokeStyle = `hsl(${hue} 100% 60%)`;
                            ctx.beginPath();
                            ctx.arc(sx, sy, baseR + i * 6 * camera.zoom, 0, Math.PI * 2);
                            ctx.stroke();
                        }
                    } else if (this.buffTier === 'ultra') {
                        for (let i = 0; i < 10; i++) {
                            const hue = (frame * 10 + i * 36) % 360;
                            ctx.strokeStyle = `hsl(${hue} 100% 55%)`;
                            ctx.beginPath();
                            ctx.arc(sx, sy, baseR + i * 5 * camera.zoom, 0, Math.PI * 2);
                            ctx.stroke();
                        }
                        // special spaced curve ring
                        ctx.lineWidth = 3 * camera.zoom;
                        ctx.setLineDash([8 * camera.zoom, 12 * camera.zoom]);
                        ctx.strokeStyle = `hsl(${(frame * 4) % 360} 100% 70%)`;
                        ctx.beginPath();
                        ctx.arc(sx, sy, baseR + 60 * camera.zoom, 0, Math.PI * 2);
                        ctx.stroke();
                        ctx.setLineDash([]);
                    }
                    ctx.restore();
                    }
                }

                if (this.isReviving) {
                    ctx.beginPath();
                    ctx.arc(sx, sy, r * 1.5, 0, Math.PI * 2);
                    ctx.strokeStyle = '#4ade80';
                    ctx.lineWidth = 3 * camera.zoom;
                    ctx.setLineDash([2, 2]);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }

                if (this.isSupporting && this.supportLineTarget && !this.supportLineTarget.dead) {
                    const tx = (this.supportLineTarget.x - camera.x) * camera.zoom + width / 2;
                    const ty = (this.supportLineTarget.y - camera.y) * camera.zoom + height / 2;
                    ctx.beginPath();
                    ctx.moveTo(sx, sy);
                    ctx.lineTo(tx, ty);
                    ctx.strokeStyle = '#4ade80';
                    ctx.lineWidth = 2 * camera.zoom;
                    ctx.setLineDash([5, 5]);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }

                if (this.isMultiplier) {
                    ctx.beginPath(); ctx.arc(sx, sy, Math.max(0.1, r * 1.4), 0, Math.PI * 2);
                    ctx.strokeStyle = CONFIG.colors.hazard; ctx.lineWidth = 1 * camera.zoom;
                    ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
                }

                ctx.fillStyle = '#0a0a0a'; ctx.strokeStyle = this.color; ctx.lineWidth = (controlledUnit === this ? 5 : 2) * camera.zoom;
                ctx.beginPath();
                if (this.team === 'even') ctx.arc(sx, sy, Math.max(0.1, r), 0, Math.PI * 2);
                else {
                    for (let i = 0; i < 3; i++) {
                        const a = (i / 3) * Math.PI * 2;
                        ctx[i === 0 ? 'moveTo' : 'lineTo'](sx + Math.cos(a) * r, sy + Math.sin(a) * r);
                    }
                    ctx.closePath();
                }
                ctx.fill(); ctx.stroke();

                if (this.isDummy) {
                    ctx.setLineDash([2, 2]); ctx.strokeStyle = 'white'; ctx.stroke(); ctx.setLineDash([]);
                }

                // Role glyphs (distinct silhouettes)
                if (this.role && this.role !== 'worker') {
                    ctx.save();
                    ctx.lineWidth = 2 * camera.zoom;
                    if (this.role === 'leader') {
                        ctx.strokeStyle = '#f97316';
                        const outer = r * 1.6, inner = r * 0.8;
                        ctx.beginPath();
                        for (let i = 0; i < 5; i++) {
                            const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
                            const ax = sx + Math.cos(a) * outer;
                            const ay = sy + Math.sin(a) * outer;
                            const b = a + Math.PI / 5;
                            const bx = sx + Math.cos(b) * inner;
                            const by = sy + Math.sin(b) * inner;
                            if (i === 0) ctx.moveTo(ax, ay);
                            else ctx.lineTo(ax, ay);
                            ctx.lineTo(bx, by);
                        }
                        ctx.closePath();
                        ctx.stroke();
                    } else if (this.role === 'commander') {
                        ctx.strokeStyle = '#93c5fd';
                        ctx.beginPath();
                        ctx.moveTo(sx, sy - r * 1.6);
                        ctx.lineTo(sx + r * 1.6, sy);
                        ctx.lineTo(sx, sy + r * 1.6);
                        ctx.lineTo(sx - r * 1.6, sy);
                        ctx.closePath();
                        ctx.stroke();
                    } else if (this.role === 'dummy-placer') {
                        ctx.strokeStyle = '#f472b6';
                        const rr = r * 1.4;
                        ctx.beginPath();
                        ctx.rect(sx - rr, sy - rr, rr * 2, rr * 2);
                        ctx.stroke();
                        ctx.beginPath();
                        ctx.moveTo(sx - rr, sy - rr);
                        ctx.lineTo(sx + rr, sy + rr);
                        ctx.moveTo(sx + rr, sy - rr);
                        ctx.lineTo(sx - rr, sy + rr);
                        ctx.stroke();
                    }
                    ctx.restore();
                }

                // Module glyphs
                if (this.module) {
                    ctx.save();
                    ctx.lineWidth = 2 * camera.zoom;
                    if (this.module === 'attack') {
                        ctx.strokeStyle = '#f97316';
                        for (let i = 0; i < 3; i++) {
                            const a = (i / 3) * Math.PI * 2;
                            const ax = sx + Math.cos(a) * r * 1.2;
                            const ay = sy + Math.sin(a) * r * 1.2;
                            const bx = sx + Math.cos(a + 0.35) * r * 1.7;
                            const by = sy + Math.sin(a + 0.35) * r * 1.7;
                            const cx = sx + Math.cos(a - 0.35) * r * 1.7;
                            const cy = sy + Math.sin(a - 0.35) * r * 1.7;
                            ctx.beginPath();
                            ctx.moveTo(ax, ay);
                            ctx.lineTo(bx, by);
                            ctx.lineTo(cx, cy);
                            ctx.closePath();
                            ctx.stroke();
                        }
                    } else if (this.module === 'defense') {
                        ctx.strokeStyle = '#60a5fa';
                        ctx.beginPath();
                        ctx.arc(sx, sy, r * 1.6, Math.PI * 0.85, Math.PI * 2.15);
                        ctx.stroke();
                    } else if (this.module === 'support') {
                        ctx.strokeStyle = '#4ade80';
                        ctx.beginPath();
                        ctx.moveTo(sx - r * 1.1, sy);
                        ctx.lineTo(sx + r * 1.1, sy);
                        ctx.moveTo(sx, sy - r * 1.1);
                        ctx.lineTo(sx, sy + r * 1.1);
                        ctx.stroke();
                    } else if (this.module === 'swarm') {
                        ctx.fillStyle = '#facc15';
                        for (let i = 0; i < 4; i++) {
                            const a = (i / 4) * Math.PI * 2;
                            const px = sx + Math.cos(a) * r * 1.4;
                            const py = sy + Math.sin(a) * r * 1.4;
                            ctx.beginPath();
                            ctx.arc(px, py, Math.max(1.2, 2.2 * camera.zoom), 0, Math.PI * 2);
                            ctx.fill();
                        }
                    } else if (this.module === 'shield') {
                        ctx.strokeStyle = '#22c55e';
                        ctx.setLineDash([6 * camera.zoom, 4 * camera.zoom]);
                        ctx.beginPath();
                        ctx.arc(sx, sy, r * 1.8, 0, Math.PI * 2);
                        ctx.stroke();
                        ctx.setLineDash([]);
                    } else if (this.module === 'trans') {
                        ctx.strokeStyle = '#c084fc';
                        for (let i = 0; i < 2; i++) {
                            const off = (i * 2 - 1) * r * 0.4;
                            ctx.beginPath();
                            ctx.moveTo(sx - r * 1.0, sy + off - r * 0.4);
                            ctx.lineTo(sx + r * 0.6, sy + off);
                            ctx.lineTo(sx - r * 1.0, sy + off + r * 0.4);
                            ctx.stroke();
                        }
                    }
                    ctx.restore();
                }

                if (this.isLeader || this.isCommander) {
                    ctx.beginPath();
                    ctx.arc(sx, sy, Math.max(0.1, r * 1.5), 0, Math.PI * 2);
                    ctx.strokeStyle = this.isLeader ? '#f97316' : '#93c5fd';
                    ctx.lineWidth = 2 * camera.zoom;
                    ctx.setLineDash([6, 3]);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }

                // Traits indicators
                if (this.traits.length > 0) {
                    ctx.fillStyle = '#facc15';
                    ctx.beginPath();
                    ctx.arc(sx + r, sy - r, 4 * camera.zoom, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Number highlight
                ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = `bold ${12 * camera.zoom}px "JetBrains Mono"`; ctx.textAlign = 'center';
                ctx.lineWidth = 3 * camera.zoom; ctx.strokeStyle = 'rgba(0,0,0,0.6)';
                let txt = this.isDummy ? "DUMMY" : (this.buffTier === 'ultra' ? "🤭" : this.value.toString());
                if (txt.length > 8) txt = txt.substring(0, 6) + '..';
                ctx.strokeText(txt, sx, sy + 3 * camera.zoom);
                ctx.fillText(txt, sx, sy + 3 * camera.zoom);
                
                if (this.archetype) {
                    ctx.font = `${7 * camera.zoom}px "JetBrains Mono"`;
                    ctx.fillStyle = this.color;
                    ctx.fillText(this.archetype.abbr, sx, sy - 10 * camera.zoom);
                }
                
                // Show Module
                ctx.font = `${6 * camera.zoom}px "JetBrains Mono"`;
                ctx.fillText(this.module.toUpperCase(), sx, sy + 12 * camera.zoom);

                if (this.role !== 'worker') {
                    ctx.fillStyle = '#f472b6';
                    ctx.font = `${6 * camera.zoom}px "JetBrains Mono"`;
                    ctx.fillText(this.role.toUpperCase(), sx, sy + 18 * camera.zoom);
                }

                if (!this.isDummy) {
                    ctx.font = `${8 * camera.zoom}px Arial`;
                    ctx.fillText(this.isHappyNum ? '😊' : '☹️', sx, sy - 12 * camera.zoom);
                }

                // Lives display
                if (!this.isDummy && (this.livesLeft || 1) > 1) {
                    ctx.fillStyle = 'rgba(255,255,255,0.75)';
                    ctx.font = `${6 * camera.zoom}px "JetBrains Mono"`;
                    ctx.textAlign = 'center';
                    ctx.fillText(`${this.livesLeft}L`, sx, sy - 20 * camera.zoom);
                }
            }
        }

        // Default player starts on even side with a mega unit (and reseeds if missing).
        function ensurePlayerSeed() {
            if (playerSeeded) return;
            const c = { x: CONFIG.worldSize / 2, y: CONFIG.worldSize / 2 };
            const hero = new NumberUnit(c.x, c.y, 2_000_000n);
            applyBuffTier(hero, 'mega');
            hero.baseTeam = 'even';
            hero.team = 'even';
            controlledUnit = hero;
            camera.x = hero.x;
            camera.y = hero.y;
            entities.push(hero);
            playerSeeded = true;
        }

        function gameLoop() {
            try {
                const now = performance.now();
                const rawDt = Math.min(0.1, (now - lastTime) / 1000);
                lastTime = now;
                if (rawDt > 0) fpsEma = fpsEma * 0.95 + (1 / rawDt) * 0.05;
                const dt = rawDt * SIM.timeScale;
                ROUND.clock += dt;
                if (!playerSeeded) ensurePlayerSeed();

                ctx.fillStyle = '#040404'; ctx.fillRect(0, 0, width, height);
                const drawNow = !FX.headless;
                if (drawNow) {
                    if (!FX.lowFx) drawWorldBorder();
                    if (TEAMS.enabled) {
                        drawBases();
                        for (const o of objectives) o.draw(ctx);
                    }
                } else if (FX.headless) {
                    ctx.save();
                    ctx.fillStyle = 'rgba(255,255,255,0.35)';
                    ctx.font = 'bold 12px "JetBrains Mono"';
                    ctx.fillText('HEADLESS SIM (render minimized)', 24, 28);
                    ctx.restore();
                }

                const doTick = !SIM.paused || SIM.stepOnce;
                if (!doTick) {
                    // Render-only frame.
                    if (drawNow) {
                        for (const c of corpses) c.draw(ctx);
                        for (const h of hazards) h.draw(ctx);
                        for (const s of storms) s.draw(ctx);
                        for (const o of objectives) o.draw(ctx);
                        for (const p of particles) p.draw(ctx);
                        for (const pr of projectiles) pr.draw(ctx);
                        for (const e of entities) e.draw(ctx);
                        drawDisasterEffect();
                    }
                    syncHud();
                    frame++;
                    requestAnimationFrame(gameLoop);
                    return;
                }

                // Rebuild spatial grid once per frame for faster near-neighbor lookups.
                rebuildEntityGrid();
                rebuildEnemyCacheMaybe();

                applyBaseWallDefense('even');
                applyBaseWallDefense('odd');
                turretUpdate('even', dt);
                turretUpdate('odd', dt);

                for (const o of objectives) o.update(dt);
                if (frame % 90 === 0) { updateKnowledgeMultiplier('even'); updateKnowledgeMultiplier('odd'); }

                // Base HP win condition + siege/repair.
                for (const team of ['even', 'odd']) {
                    const baseSt = BASE_STATE[team];
                    if (!baseSt || baseSt.max <= 0n) continue;
                    if (baseSt.hp <= 0n) {
                        endRound(team === 'even' ? 'odd' : 'even');
                        continue;
                    }

                    const r = baseRect(team);
                    const center = baseCenter(team);
                    const range = Math.max(r.w, r.h) / 2 + 200;
                    const candidates = queryEntityGrid(center.x, center.y, range);
                    let enemiesInside = 0;
                    for (const u of candidates) {
                        if (!u || u.dead || u.isDummy) continue;
                        if (u.team === team) continue;
                        if (!pointInRect(u.x, u.y, r)) continue;
                        enemiesInside++;
                    }

                    const wallUp = (WALL_STATE[team]?.hp || 0n) > 0n;
                    if (!wallUp && enemiesInside > 0) {
                        const perSec = 240000n; // base DPS per enemy (tuned for drama)
                        const dmg = (perSec * BigInt(enemiesInside) * BigInt(Math.max(1, Math.round(dt * 1000)))) / 1000n;
                        damageBase(team, dmg, center.x, center.y);
                    } else if (enemiesInside === 0) {
                        const healLvl = TEAM_UPGRADES[team]?.heal || 0;
                        if (healLvl > 0 && baseSt.hp < baseSt.max) {
                            const regenPerSec = BigInt(140000 + healLvl * 120000);
                            const heal = (regenPerSec * BigInt(Math.max(1, Math.round(dt * 1000)))) / 1000n;
                            baseSt.hp = (baseSt.hp + heal) > baseSt.max ? baseSt.max : (baseSt.hp + heal);
                        }
                    }
                }
                forceWinIfStuck();

                if (TEAMS.enabled && frame % 600 === 0 && storms.length < 2) {
                    storms.push(new Storm(Math.random() * CONFIG.worldSize, Math.random() * CONFIG.worldSize));
                }

                const rate = (spawnRateSlider && typeof spawnRateSlider.valueAsNumber === 'number')
                    ? spawnRateSlider.valueAsNumber
                    : (parseInt(spawnRateSlider?.value || "0", 10) || 0);
                const fpsSpawnFactor = Math.max(0.35, Math.min(1, fpsEma / 90));

                // Skip auto-spawn accumulation when over cap.
                if (entities.length >= CONFIG.maxEntities) {
                    spawnAccumulator = 0;
                }

                // Bases are breeding grounds: spawn extra units inside each base (only when teams are on).
                if (TEAMS.enabled && entities.length < CONFIG.maxEntities) {
                    const mv = spawnMaxValue();
                    if (!initialBaseBurstDone) {
                        // Small initial burst so bases don't start empty; scales with spawn upgrade.
                        const burstEven = Math.max(2, 2 + (TEAM_UPGRADES.even.spawn || 0));
                        const burstOdd = Math.max(2, 2 + (TEAM_UPGRADES.odd.spawn || 0));
                        for (let i = 0; i < burstEven && entities.length < CONFIG.maxEntities; i++) { spawnInBase('even', mv); spawnedTotal++; }
                        for (let i = 0; i < burstOdd && entities.length < CONFIG.maxEntities; i++) { spawnInBase('odd', mv); spawnedTotal++; }
                        initialBaseBurstDone = true;
                    }
                    const evenSpawnLvl = Math.min(10, TEAM_UPGRADES.even.spawn || 0);
                    const oddSpawnLvl = Math.min(10, TEAM_UPGRADES.odd.spawn || 0);
                    // No-upgrade spawners trickle: 30% of base rate; upgrades ramp linearly.
                    const evenSpawnMult = 0.30 + evenSpawnLvl * 0.40;
                    const oddSpawnMult = 0.30 + oddSpawnLvl * 0.40;
                    baseSpawnAccEven += dt * BASE_BREED_RATE * evenSpawnMult * fpsSpawnFactor;
                    baseSpawnAccOdd += dt * BASE_BREED_RATE * oddSpawnMult * fpsSpawnFactor;
                    while (baseSpawnAccEven >= 1 && entities.length < CONFIG.maxEntities) {
                        spawnInBase('even', mv);
                        spawnedTotal++;
                        baseSpawnAccEven--;
                    }
                    while (baseSpawnAccOdd >= 1 && entities.length < CONFIG.maxEntities) {
                        spawnInBase('odd', mv);
                        spawnedTotal++;
                        baseSpawnAccOdd--;
                    }
                }

                if (rate > 0 && entities.length < CONFIG.maxEntities) {
                    // Snapshot live counts once per frame to keep spawns balanced.
                    let evenLive = 0;
                    let oddLive = 0;
                    if (TEAMS.enabled) {
                        for (const e of entities) {
                            if (e.dead || e.isDummy) continue;
                            if (e.team === 'even') evenLive++;
                            else if (e.team === 'odd') oddLive++;
                        }
                    }

                    spawnAccumulator += dt * rate * fpsSpawnFactor;
                    while (spawnAccumulator >= 1) {
                        const mv = spawnMaxValue();
                        // Safe random BigInt
                        const team = TEAMS.enabled ? pickSpawnTeamFromCounts(evenLive, oddLive) : null;
                        const randVal = generateSpawnValue(mv, team);
                        const viewW = width / Math.max(0.0001, camera.zoom);
                        const viewH = height / Math.max(0.0001, camera.zoom);
                        const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
                        const spawnX = clamp(camera.x + (randSpawn() - 0.5) * viewW, 0, CONFIG.worldSize);
                        const spawnY = clamp(camera.y + (randSpawn() - 0.5) * viewH, 0, CONFIG.worldSize);
                        const unit = new NumberUnit(spawnX, spawnY, randVal);
                        const tier = rollBuffTier();
                        applyBuffTier(unit, tier);
                        if (team) applySpawnUpgradeBias(unit, team, tier);
                        entities.push(unit);
                        assignSquad(unit);
                        if (team === 'even') evenLive++;
                        else if (team === 'odd') oddLive++;
                        spawnedTotal++;
                        spawnAccumulator--;
                    }
                }

                // drawNow computed earlier in loop.
                const totalEntities = entities.length || 1;
                const batchStart = entityUpdateCursor % totalEntities;
                const batchEnd = batchStart + ENTITY_UPDATES_PER_FRAME;
                const shouldUpdate = (idx) => {
                    if (ENTITY_UPDATES_PER_FRAME >= totalEntities) return true;
                    return (idx >= batchStart && idx < Math.min(batchEnd, totalEntities)) ||
                        (batchEnd > totalEntities && idx < (batchEnd - totalEntities));
                };
                corpses = corpses.filter(c => { c.update(); if (drawNow) c.draw(ctx); return c.life > 0; });
                hazards = hazards.filter(h => { h.update(); if (drawNow) h.draw(ctx); return h.life > 0; });
                storms = storms.filter(s => { s.update(); if (drawNow) s.draw(ctx); return s.life > 0; });
                particles = particles.filter(p => { p.update(); if (drawNow) p.draw(ctx); return p.life > 0; });
                projectiles = projectiles.filter(p => { p.update(); if (drawNow) p.draw(ctx); return p.life > 0; });
                entities = entities.filter((e, idx) => { if (shouldUpdate(idx)) e.update(); if (drawNow) e.draw(ctx); return !e.dead; });
                entityUpdateCursor = (entityUpdateCursor + ENTITY_UPDATES_PER_FRAME) % Math.max(1, entities.length || 1);
                if (particles.length > FX.particleCap) particles.length = FX.particleCap;
                if (projectiles.length > FX.projectileCap) projectiles.splice(0, projectiles.length - FX.projectileCap);
                if (drawNow) drawDisasterEffect();
                // Tick meetings down for leaders/commanders.
                for (const lead of getSquadLeads()) {
                    if (lead.meetingTimer && lead.meetingTimer > 0) {
                        lead.meetingTimer--;
                        if (lead.meetingTimer === 0) applyMeetingBoost(lead);
                    }
                }

                for (const [sid, t] of SQUAD_RETREAT.entries()) {
                    if (t <= 1) SQUAD_RETREAT.delete(sid);
                    else SQUAD_RETREAT.set(sid, t - 1);
                }

                if (ROUND_END.active) {
                    if (!TEAMS.enabled) {
                        ROUND_END.active = false;
                        ROUND_END.winner = null;
                        ROUND_END.timer = 0;
                        if (winBanner) winBanner.classList.add('hidden');
                    } else {
                    ROUND_END.timer--;
                    if (winBannerSub) winBannerSub.innerText = `Next round in ${(Math.max(0, ROUND_END.timer) / 60).toFixed(1)}s`;
                    if (ROUND_END.timer <= 0) {
                        ROUND_END.active = false;
                        ROUND_END.winner = null;
                        ROUND_END.timer = 0;
                        ROUND.round += 1;
                        if (winBanner) winBanner.classList.add('hidden');
                        purgeField({ keepKnowledge: true });
                    }
                    }
                }

                // Keep a per-frame indicator so we can confirm the loop is running.
                if (spawnDebug && frame % 10 === 0) {
                    spawnDebug.dataset.loop = 'running';
                }

                if (frame % 30 === 0) {
                    const ev = entities.filter(e => e.team === 'even' && !e.isDummy).length;
                    const od = entities.filter(e => e.team === 'odd' && !e.isDummy).length;
                    document.getElementById('score-even').innerText = ev; document.getElementById('score-odd').innerText = od;
                    document.getElementById('entity-counter').innerText = entities.length + ' UNITS';
                    if (spawnDebug) spawnDebug.innerText = `SPAWN: rate=${rate}/s total=${spawnedTotal} live=${entities.length}`;

                    if (gesturePanel) {
                        const show = !!controlledUnit && isLead(controlledUnit);
                        gesturePanel.classList.toggle('hidden', !show);
                        if (show && gestureActive) {
                            const g = Number(controlledUnit.gesture || 0);
                            gestureActive.textContent = `${g} ${GESTURES[g] || 'CLEAR'}`;
                        }
                        if (show && formationSelect) {
                            formationSelect.value = controlledUnit.formation || 'default';
                        }
                    }

                    syncHud();

                    if (TEAMS.enabled && !ROUND_END.active) {
                        if (ev === 0 && od > 0) endRound('odd');
                        if (od === 0 && ev > 0) endRound('even');
                    }

                    if (now - lastOverlayUpdate > 250) {
                        lastOverlayUpdate = now;
                        setDebugOverlay(`BUILD=${BUILD_ID} fps=${fpsEma.toFixed(0)} rate=${rate}/s total=${spawnedTotal} live=${entities.length}`);
                        document.title = `Big Int Field (${rate}/s total=${spawnedTotal} live=${entities.length})`;
                    }

                    popHistory.even.push(ev); popHistory.odd.push(od); if (popHistory.even.length > 100) { popHistory.even.shift(); popHistory.odd.shift(); }
                    mCtx.fillStyle = '#000'; mCtx.fillRect(0, 0, 180, 180);
                    const s = 180 / CONFIG.worldSize;
                    hazards.forEach(h => { mCtx.fillStyle = CONFIG.colors.hazard; mCtx.fillRect(h.x * s, h.y * s, 3, 3); });
                    storms.forEach(st => { mCtx.strokeStyle = 'rgba(168,85,247,0.8)'; mCtx.beginPath(); mCtx.arc(st.x * s, st.y * s, Math.max(2, st.r * s), 0, Math.PI * 2); mCtx.stroke(); });
                    // Objectives + bases on minimap (very clear).
                    for (const o of objectives) {
                        mCtx.strokeStyle = o.owner === 'even' ? 'rgba(6,182,212,0.95)' : o.owner === 'odd' ? 'rgba(217,70,239,0.95)' : 'rgba(251,191,36,0.9)';
                        mCtx.beginPath();
                        mCtx.arc(o.x * s, o.y * s, Math.max(2, o.r * s), 0, Math.PI * 2);
                        mCtx.stroke();
                    }
                    for (const team of ['even', 'odd']) {
                        const r = baseRect(team);
                        mCtx.strokeStyle = team === 'even' ? 'rgba(6,182,212,0.9)' : 'rgba(217,70,239,0.9)';
                        mCtx.lineWidth = 1;
                        mCtx.strokeRect(r.x * s, r.y * s, r.w * s, r.h * s);
                    }

                    if (!FX.fogMinimap) {
                        entities.forEach(e => { mCtx.fillStyle = e.color; mCtx.fillRect(e.x * s, e.y * s, 2, 2); });
                    } else {
                        const vision = 900;
                        const viewerTeam = (controlledUnit && controlledUnit.team) ? controlledUnit.team : 'even';
                        const enemyTeam = viewerTeam === 'even' ? 'odd' : 'even';

                        // Friendlies always.
                        for (const e of entities) {
                            if (!e || e.dead) continue;
                            if (e.team !== viewerTeam) continue;
                            mCtx.fillStyle = e.color;
                            mCtx.fillRect(e.x * s, e.y * s, 2, 2);
                        }
                        // Enemies only if seen by any friendly.
                        for (const e of entities) {
                            if (!e || e.dead) continue;
                            if (e.team !== enemyTeam) continue;
                            const near = queryEntityGrid(e.x, e.y, vision);
                            const seen = near.some(n => n && !n.dead && n.team === viewerTeam && Math.hypot(n.x - e.x, n.y - e.y) <= vision);
                            if (seen) {
                                mCtx.fillStyle = e.color;
                                mCtx.fillRect(e.x * s, e.y * s, 2, 2);
                            }
                        }
                    }
                    gCtx.clearRect(0, 0, 200, 80); const m = Math.max(...popHistory.even, ...popHistory.odd, 100);
                    const dl = (h, c) => { gCtx.strokeStyle = c; gCtx.beginPath(); h.forEach((v, i) => gCtx[i === 0 ? 'moveTo' : 'lineTo']((i / 99) * 200, 80 - (v / m) * 70)); gCtx.stroke(); };
                    dl(popHistory.even, CONFIG.colors.even); dl(popHistory.odd, CONFIG.colors.odd);
                }
                SIM.stepOnce = false;
                frame++; requestAnimationFrame(gameLoop);
            } catch (err) {
                showRuntimeError(err);
            }
        }

        canvas.addEventListener('mousedown', (e) => {
            const mx = (e.clientX - width / 2) / camera.zoom + camera.x, my = (e.clientY - height / 2) / camera.zoom + camera.y;
            const hits = entities
                .filter(u => !u.dead && Math.hypot(mx - u.x, my - u.y) < (u.radius || CONFIG.fixedRadius) * 3.2)
                .sort((a, b) => Math.hypot(mx - a.x, my - a.y) - Math.hypot(mx - b.x, my - b.y));
            // Prefer selecting leaders/commanders if they are in range.
            controlledUnit = hits.find(u => isLead(u)) || hits[0] || null;
            if (!controlledUnit) { camera.isDragging = true; camera.lastMouseX = e.clientX; camera.lastMouseY = e.clientY; }
        });
        window.addEventListener('mouseup', () => camera.isDragging = false);
        canvas.addEventListener('mousemove', (e) => {
            if (camera.isDragging && !controlledUnit) { camera.x -= (e.clientX - camera.lastMouseX) / camera.zoom; camera.y -= (e.clientY - camera.lastMouseY) / camera.zoom; camera.lastMouseX = e.clientX; camera.lastMouseY = e.clientY; }
        });
        const handleWheel = (e) => {
            camera.zoom = Math.min(Math.max(camera.zoom - e.deltaY * 0.001, 0.1), 5.0);
            e.preventDefault();
        };
        canvas.addEventListener('wheel', handleWheel, { passive: false });
        window.addEventListener('wheel', handleWheel, { passive: false });

        function toggleMasterPanel() {
            document.getElementById('master-panel').classList.toggle('collapsed');
            document.getElementById('toggle-panel').classList.toggle('rotated');
        }
        // index.html uses an inline onclick handler, so expose this globally.
        window.toggleMasterPanel = toggleMasterPanel;
        window.ToggleMasterPanel = toggleMasterPanel;

        document.getElementById('spawn-exact-btn').onclick = () => {
            const valStr = exactValInput ? (exactValInput.value || "100") : "100";
            const val = parseBigIntInput(valStr, 100n);
            const qty = parseInt(document.getElementById('exact-qty').value || 1);
            const tierSel = document.getElementById('exact-tier');
            const tierChoice = (tierSel && tierSel.value) ? String(tierSel.value) : 'random';
            const pickedTier = (tierChoice === 'random') ? rollBuffTier() : tierChoice;
            const roleSel = document.getElementById('exact-role');
            const roleChoice = (roleSel && roleSel.value) ? String(roleSel.value) : 'random';
            for (let i = 0; i < qty; i++) {
                const u = new NumberUnit(camera.x + (randSpawn() - 0.5) * 100, camera.y + (randSpawn() - 0.5) * 100, val);
                forceRoleChoice(u, roleChoice);
                applyBuffTier(u, pickedTier);
                entities.push(u);
                assignSquad(u);
            }
        };
        document.getElementById('spawn-resistance-btn').onclick = () => { const u = new NumberUnit(camera.x, camera.y, 50000n, true); entities.push(u); assignSquad(u); };
        document.getElementById('spawn-cyclic-btn').onclick = () => { const u = new NumberUnit(camera.x, camera.y, 142857n); entities.push(u); assignSquad(u); };

        function spawnParityUnit(team) {
            const mvString = genValInput ? (genValInput.value || "2000000") : "2000000";
            const mv = parseBigIntInput(mvString, 2000000n);
            let randVal = BigInt(Math.floor(Math.random() * 1000000)) * mv / 1000000n + 1n;
            randVal = adjustValueForTeam(randVal, team);
            const u = new NumberUnit(camera.x + (randSpawn() - 0.5) * 120, camera.y + (randSpawn() - 0.5) * 120, randVal);
            const tier = rollBuffTier();
            applyBuffTier(u, tier);
            if (TEAMS.enabled) applySpawnUpgradeBias(u, team, tier);
            entities.push(u);
            assignSquad(u);
        }

        document.getElementById('dummy-even-btn').onclick = () => {
            if (PAGE_MODE === 'freeplay') { spawnParityUnit('even'); return; }
            for (let i = 0; i < 3; i++) entities.push(new NumberUnit(camera.x + (randSpawn() - 0.5) * 200, camera.y + (randSpawn() - 0.5) * 200, 100n, false, false, true, 'even'));
        };
        document.getElementById('dummy-odd-btn').onclick = () => {
            if (PAGE_MODE === 'freeplay') { spawnParityUnit('odd'); return; }
            for (let i = 0; i < 3; i++) entities.push(new NumberUnit(camera.x + (randSpawn() - 0.5) * 200, camera.y + (randSpawn() - 0.5) * 200, 101n, false, false, true, 'odd'));
        };

        document.getElementById('reset-btn').onclick = () => purgeField({ keepKnowledge: true });
        document.getElementById('ai-analyze-btn').onclick = analyzeBattle;

        function updateSpawnRateDisplay() {
            const v = parseInt(spawnRateSlider?.value || "0", 10) || 0;
            if (rateDisplay) rateDisplay.innerText = v === 0 ? 'OFF' : `${v}/s`;
        }
        if (spawnRateSlider) {
            spawnRateSlider.addEventListener('input', updateSpawnRateDisplay);
            spawnRateSlider.addEventListener('change', updateSpawnRateDisplay);
        }
        updateSpawnRateDisplay();

        gameLoop();
        if (earlyOverlay) earlyOverlay.textContent = `DEBUG: game.js started (${BUILD_ID})`;
    } catch (err) {
        try {
            if (earlyOverlay) earlyOverlay.textContent = `DEBUG: game.js crashed: ${String(err && (err.message || err)).slice(0, 80)}`;
        } catch { }
        throw err;
    }
})();
    
