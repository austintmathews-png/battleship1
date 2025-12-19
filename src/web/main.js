import React, { useEffect, useMemo, useRef, useState } from "https://esm.sh/react@18";
import { createRoot } from "https://esm.sh/react-dom@18/client";

import Gameboard from "../models/Gameboard.js";
import Ship from "../models/Ship.js";

const BOARD_SIZE = 10;
const FLEET = [
  {
    key: "carrier",
    length: 5,
    className: "Fleet Carrier",
    usaName: "USS Enterprise (CV-6)",
    japanName: "IJN Akagi",
  },
  {
    key: "battleship",
    length: 4,
    className: "Battleship",
    usaName: "USS Yorktown TF",
    japanName: "IJN Kaga",
  },
  {
    key: "cruiser",
    length: 3,
    className: "Heavy Cruiser",
    usaName: "USS Astoria",
    japanName: "IJN Tone",
  },
  {
    key: "destroyer",
    length: 3,
    className: "Destroyer",
    usaName: "USS Hammann",
    japanName: "IJN Arashi",
  },
  {
    key: "escort",
    length: 2,
    className: "Escort",
    usaName: "Picket Escort",
    japanName: "Escort",
  },
];

function randInt(maxExclusive) {
  return Math.floor(Math.random() * maxExclusive);
}

function canPlaceShip(board, x, y, isVertical, length) {
  if (!board) return false;
  if (typeof length !== "number") return false;
  for (let i = 0; i < length; i += 1) {
    const cx = isVertical ? x : x + i;
    const cy = isVertical ? y + i : y;
    if (!board.inBounds(cx, cy)) return false;
    if (board.grid?.[cy]?.[cx]?.ship) return false;
  }
  return true;
}

const CELL_SIZE = 34;
const CELL_GAP = 6;
const CELL_PITCH = CELL_SIZE + CELL_GAP;

function shipDisplayName(def, team) {
  return team === "japan" ? def.japanName : def.usaName;
}

function shipTopSvg({ def, team, isVertical, radar }) {
  const length = def.length;
  const w = isVertical ? CELL_SIZE : CELL_PITCH * length - CELL_GAP;
  const h = isVertical ? CELL_PITCH * length - CELL_GAP : CELL_SIZE;
  const bowSize = 12;

  const id = `${def.key}-${isVertical ? "v" : "h"}-${length}`;

  const hullDark = radar ? "rgba(16, 185, 129, 0.32)" : "#7e838b";
  const hullMid = radar ? "rgba(34, 197, 94, 0.34)" : "#9aa0a8";
  const hullLight = radar ? "rgba(209, 255, 225, 0.22)" : "#c8ccd2";
  const stroke = "rgba(0,0,0,0.28)";
  const detail = "rgba(0,0,0,0.18)";
  const highlight = radar ? "rgba(209, 255, 225, 0.22)" : "rgba(255,255,255,0.28)";
  const hole = radar ? "rgba(0,0,0,0.65)" : "#0b0f14";
  const holeRim = radar ? "rgba(209, 255, 225, 0.14)" : "rgba(255,255,255,0.12)";

  const viewBox = `0 0 ${w} ${h}`;

  const hullPath = isVertical
    ? `M ${w / 2} 0 L ${w} ${bowSize} L ${w} ${h - 10} Q ${w} ${h} ${w - 10} ${h} L 10 ${h} Q 0 ${h} 0 ${h - 10} L 0 ${bowSize} Z`
    : `M 0 ${h / 2} L ${bowSize} 0 L ${w - 10} 0 Q ${w} 0 ${w} 10 L ${w} ${h - 10} Q ${w} ${h} ${w - 10} ${h} L ${bowSize} ${h} Z`;

  const bevelDefs = React.createElement(
    "defs",
    null,
    React.createElement(
      "linearGradient",
      { id: `hullGrad-${id}`, x1: 0, y1: 0, x2: 0, y2: 1 },
      React.createElement("stop", { offset: "0%", stopColor: hullLight }),
      React.createElement("stop", { offset: "45%", stopColor: hullMid }),
      React.createElement("stop", { offset: "100%", stopColor: hullDark })
    ),
    React.createElement(
      "linearGradient",
      { id: `deckGrad-${id}`, x1: 0, y1: 0, x2: 1, y2: 0 },
      React.createElement("stop", { offset: "0%", stopColor: "rgba(255,255,255,0.10)" }),
      React.createElement("stop", { offset: "100%", stopColor: "rgba(0,0,0,0.08)" })
    )
  );

  const hull = React.createElement("path", {
    d: hullPath,
    fill: `url(#hullGrad-${id})`,
    stroke,
    strokeWidth: 1,
  });

  const deck = (() => {
    if (def.key === "carrier") {
      return React.createElement(
        React.Fragment,
        null,
        React.createElement("rect", {
          x: isVertical ? 5 : bowSize + 5,
          y: isVertical ? bowSize + 5 : 5,
          width: isVertical ? w - 10 : w - bowSize - 10,
          height: isVertical ? h - bowSize - 10 : h - 10,
          rx: 10,
          fill: `url(#deckGrad-${id})`,
          stroke: detail,
        }),
        // simple runway stripe
        React.createElement("rect", {
          x: isVertical ? w / 2 - 1.5 : bowSize + 12,
          y: isVertical ? bowSize + 12 : h / 2 - 1.5,
          width: isVertical ? 3 : Math.max(10, w - bowSize - 24),
          height: isVertical ? Math.max(10, h - bowSize - 24) : 3,
          rx: 2,
          fill: highlight,
          opacity: 0.8,
        })
      );
    }

    // Raised superstructure block
    return React.createElement("rect", {
      x: isVertical ? 10 : bowSize + 12,
      y: isVertical ? bowSize + 12 : 10,
      width: isVertical ? w - 20 : Math.max(10, w - bowSize - 24),
      height: isVertical ? Math.max(10, h - bowSize - 24) : h - 20,
      rx: 10,
      fill: "rgba(255,255,255,0.10)",
      stroke: detail,
    });
  })();

  const portholes = (() => {
    const holes = [];
    const count = Math.max(2, Math.min(5, length + 1));
    for (let i = 0; i < count; i += 1) {
      const t = (i + 1) / (count + 1);
      const cx = isVertical ? w * 0.72 : bowSize + 10 + t * (w - bowSize - 20);
      const cy = isVertical ? bowSize + 10 + t * (h - bowSize - 20) : h * 0.72;
      holes.push(
        React.createElement("circle", {
          key: `h-${i}`,
          cx,
          cy,
          r: 3.2,
          fill: hole,
          stroke: holeRim,
          strokeWidth: 1,
        })
      );
    }
    return React.createElement(React.Fragment, null, ...holes);
  })();

  const raisedDetails = (() => {
    if (def.key === "battleship") {
      const turret1 = React.createElement("rect", {
        x: isVertical ? w / 2 - 5 : bowSize + 18,
        y: isVertical ? bowSize + 16 : h / 2 - 6,
        width: 10,
        height: 12,
        rx: 4,
        fill: "rgba(255,255,255,0.14)",
        stroke: detail,
      });
      const turret2 = React.createElement("rect", {
        x: isVertical ? w / 2 - 5 : bowSize + 40,
        y: isVertical ? bowSize + 16 : h / 2 - 6,
        width: 10,
        height: 12,
        rx: 4,
        fill: "rgba(255,255,255,0.14)",
        stroke: detail,
      });
      return React.createElement(React.Fragment, null, turret1, turret2);
    }

    if (def.key === "destroyer" || def.key === "cruiser") {
      return React.createElement("rect", {
        x: isVertical ? w / 2 - 4 : bowSize + 24,
        y: isVertical ? bowSize + 18 : h / 2 - 5,
        width: 8,
        height: 10,
        rx: 4,
        fill: "rgba(255,255,255,0.12)",
        stroke: detail,
      });
    }

    return null;
  })();

  return React.createElement(
    "svg",
    {
      width: w,
      height: h,
      viewBox,
      "aria-label": `${shipDisplayName(def, team)} top view`,
    },
    bevelDefs,
    hull,
    deck,
    portholes,
    raisedDetails
  );
}

function randomPlaceFleet(board, team) {
  for (const def of FLEET) {
    const ship = new Ship(def.length);
    ship.meta = {
      key: def.key,
      className: def.className,
      name: team === "japan" ? def.japanName : def.usaName,
    };
    let placed = false;

    for (let tries = 0; tries < 2000 && !placed; tries += 1) {
      const isVertical = Math.random() < 0.5;
      const x = randInt(BOARD_SIZE);
      const y = randInt(BOARD_SIZE);
      placed = board.placeShip(ship, x, y, isVertical);
    }

    if (!placed) {
      throw new Error("Failed to place fleet");
    }
  }
}

function setupBoard() {
  const board = new Gameboard(BOARD_SIZE);
  randomPlaceFleet(board, "japan");
  return board;
}

function coordKey(x, y) {
  return `${x},${y}`;
}

function getUnattackedCoords(board) {
  const coords = [];
  for (let y = 0; y < board.size; y += 1) {
    for (let x = 0; x < board.size; x += 1) {
      if (!board.grid[y][x].hit) coords.push({ x, y });
    }
  }
  return coords;
}

function neighbors4(x, y) {
  return [
    { x: x + 1, y },
    { x: x - 1, y },
    { x, y: y + 1 },
    { x, y: y - 1 },
  ];
}

function chooseAiMove({ difficulty, playerBoard, memory }) {
  const inBounds = (x, y) => x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;

  const enqueueTargetsAround = (x, y) => {
    for (const n of neighbors4(x, y)) {
      if (!inBounds(n.x, n.y)) continue;
      if (playerBoard.grid[n.y][n.x].hit) continue;
      const k = coordKey(n.x, n.y);
      if (memory.queued.has(k)) continue;
      memory.targetQueue.push({ x: n.x, y: n.y });
      memory.queued.add(k);
    }
  };

  if (difficulty !== "easy") {
    while (memory.targetQueue.length > 0) {
      const next = memory.targetQueue.shift();
      const k = coordKey(next.x, next.y);
      memory.queued.delete(k);
      if (!playerBoard.grid[next.y][next.x].hit) return next;
    }
  }

  const candidates = getUnattackedCoords(playerBoard);
  if (candidates.length === 0) return null;

  if (difficulty === "hard") {
    const parity = candidates.filter((c) => (c.x + c.y) % 2 === 0);
    const pool = parity.length > 0 ? parity : candidates;
    return pool[randInt(pool.length)];
  }

  return candidates[randInt(candidates.length)];
}

function updateAiMemoryAfterAttack({ difficulty, x, y, result, memory }) {
  if (difficulty === "easy") return;

  if (result === "hit" || result === "sunk") {
    memory.lastHit = { x, y };
    // Queue handled in chooseAiMove via enqueue when we know it's a hit.
  }
  if (result === "sunk") {
    memory.lastHit = null;
  }
}

function Cell({ x, y, cell, disabled, showShips, onAttack, isLastImpact, isSunkFx, isNukeFx }) {
  let text = "";
  let background = "rgba(127, 127, 127, 0.08)";
  let impact = null;
  let marker = null;
  let sunkFx = null;
  let nukeFx = null;

  if (!cell.hit) {
    if (showShips && cell.ship) {
      background = "rgba(245, 158, 11, 0.15)";
    }
  } else if (!cell.ship) {
    background = "rgba(59, 130, 246, 0.25)";
    if (isLastImpact) {
      impact = React.createElement(
        "span",
        { className: "impact" },
        React.createElement(
          "span",
          { className: "splash" },
          React.createElement("span", { className: "splashRing" }),
          React.createElement("span", { className: "splashDrop d1" }),
          React.createElement("span", { className: "splashDrop d2" })
        )
      );
    }
  } else {
    background = "rgba(239, 68, 68, 0.25)";
    marker = React.createElement("span", { className: "fireMarker", "aria-hidden": true }, "🔥");
    if (isLastImpact) {
      impact = React.createElement(
        "span",
        { className: "impact" },
        React.createElement(
          "span",
          { className: "explosion" },
          React.createElement("span", { className: "explosionCore" }),
          React.createElement("span", { className: "explosionShock" })
        )
      );
    }
  }

  if (isNukeFx) {
    nukeFx = React.createElement(
      "span",
      { className: "nukeFx", "aria-hidden": true },
      React.createElement("span", { className: "nukeFlash" }),
      React.createElement("span", { className: "nukeRing" })
    );
  }

  return React.createElement(
    "button",
    {
      className: "cell",
      disabled,
      style: { background },
      onClick: () => onAttack(x, y),
      title: `(${x},${y})`,
    },
    impact,
    sunkFx,
    nukeFx,
    marker,
    text
  );
}

function PlayerCell({
  x,
  y,
  cell,
  grid,
  showShips,
  placingEnabled,
  onDropShip,
  onHoverShip,
  preview,
  isLastImpact,
  isSunkFx,
}) {
  const disabled = false;

  let text = "";
  let background = "rgba(127, 127, 127, 0.08)";
  let shipOverlay = null;
  let impact = null;
  let marker = null;
  let sunkFx = null;

  // ship visual is rendered as a full-SVG overlay per ship, not per-cell

  if (!cell.hit) {
    if (showShips && cell.ship) {
      background = "rgba(245, 158, 11, 0.15)";
    }
  } else if (!cell.ship) {
    background = "rgba(59, 130, 246, 0.25)";
    if (isLastImpact) {
      impact = React.createElement(
        "span",
        { className: "impact" },
        React.createElement(
          "span",
          { className: "splash" },
          React.createElement("span", { className: "splashRing" }),
          React.createElement("span", { className: "splashDrop d1" }),
          React.createElement("span", { className: "splashDrop d2" })
        )
      );
    }
  } else {
    background = "rgba(239, 68, 68, 0.25)";
    marker = React.createElement("span", { className: "fireMarker", "aria-hidden": true }, "🔥");
    if (isLastImpact) {
      impact = React.createElement(
        "span",
        { className: "impact" },
        React.createElement(
          "span",
          { className: "explosion" },
          React.createElement("span", { className: "explosionCore" }),
          React.createElement("span", { className: "explosionShock" })
        )
      );
    }
  }

  const previewKey = `${x},${y}`;
  const isPreview = Boolean(preview) && Array.isArray(preview.keys) && preview.keys.includes(previewKey);
  const previewClass = isPreview ? (preview.valid ? " previewValid" : " previewInvalid") : "";

  return React.createElement(
    "button",
    {
      className: `cell${previewClass}`,
      disabled,
      style: { background },
      title: `(${x},${y})`,
      onDragEnter: placingEnabled
        ? (e) => {
            e.preventDefault();
            if (onHoverShip) onHoverShip(x, y);
          }
        : undefined,
      onDragOver: placingEnabled
        ? (e) => {
            e.preventDefault();
            if (onHoverShip) onHoverShip(x, y);
          }
        : undefined,
      onDrop: placingEnabled
        ? (e) => {
            e.preventDefault();
            onDropShip(x, y);
          }
        : undefined,
      onClick: () => {},
    },
    shipOverlay,
    impact,
    sunkFx,
    marker,
    text
  );
}

function App() {
  const playerBoardRef = useRef(null);
  const aiBoardRef = useRef(null);
  const aiMemoryRef = useRef(null);
  const audioRef = useRef(null);
  const anthemRef = useRef({ nodes: [], stopTimer: null });
  const anthemAudioRef = useRef(null);
  const ttsRef = useRef({ voice: null, voicesLoaded: false });
  const lastHoverRef = useRef(null); // { x, y }

  const [team, setTeam] = useState(null); // usa | japan
  const [difficulty, setDifficulty] = useState(null);
  const [phase, setPhase] = useState("setup"); // setup | placing | playing | over
  const [turn, setTurn] = useState("player"); // player | ai
  const [version, setVersion] = useState(0);
  const [message, setMessage] = useState("Select your fleet for the Battle of Midway.");
  const [setupDifficulty, setSetupDifficulty] = useState(null); // easy | medium | hard
  const [revealAiShips, setRevealAiShips] = useState(false);
  const [isVertical, setIsVertical] = useState(false);
  const [placed, setPlaced] = useState(() => Array(FLEET.length).fill(false));
  const [selectedShipIdx, setSelectedShipIdx] = useState(null);
  const [outcome, setOutcome] = useState(null); // win | lose | null
  const [soundOn, setSoundOn] = useState(true);
  const [lastImpact, setLastImpact] = useState(null); // { board: 'ai'|'player', x, y, result }
  const [sunkFx, setSunkFx] = useState(null); // { board: 'ai'|'player', keys: string[], id: string }
  const [dragHover, setDragHover] = useState(null); // { keys: string[], valid: boolean } | null
  const [draggingShip, setDraggingShip] = useState(false);
  const [torpedoUsed, setTorpedoUsed] = useState(false);
  const [torpedoArmed, setTorpedoArmed] = useState(false);
  const [nukeUsed, setNukeUsed] = useState(false);
  const [nukeArmed, setNukeArmed] = useState(false);
  const [nukeCountdown, setNukeCountdown] = useState(null); // number | null
  const [nukeFx, setNukeFx] = useState(null); // { board: 'ai'|'player', keys: string[], id: string }

  const inventoryItems = useMemo(() => {
    return FLEET.map((def, idx) => ({
      def,
      idx,
      placed: Boolean(placed[idx]),
    }));
  }, [placed]);

  const opponent = team === "usa" ? "japan" : team === "japan" ? "usa" : null;
  const teamLabel = team === "usa" ? "USA" : team === "japan" ? "Japan" : "";
  const opponentLabel = opponent === "usa" ? "USA" : opponent === "japan" ? "Japan" : "";
  const radarOn = phase === "placing" || phase === "playing";

  useEffect(() => {
    const onKeyDown = (e) => {
      if (phase !== "placing") return;
      if (!draggingShip) return;
      const key = e.key || "";
      if (key !== " " && key !== "Spacebar" && key !== "Space") return;

      e.preventDefault();

      const next = !isVertical;
      setIsVertical(next);

      const p = lastHoverRef.current;
      if (!p || !playerBoardRef.current) return;
      if (selectedShipIdx == null) return;
      const def = FLEET[selectedShipIdx];

      const keys = [];
      for (let i = 0; i < def.length; i += 1) {
        const cx = next ? p.x : p.x + i;
        const cy = next ? p.y + i : p.y;
        keys.push(`${cx},${cy}`);
      }
      const valid = canPlaceShip(playerBoardRef.current, p.x, p.y, next, def.length);
      setDragHover({ keys, valid });
    };

    window.addEventListener("keydown", onKeyDown, { passive: false });
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [draggingShip, isVertical, phase, selectedShipIdx]);

  const allPlaced = useMemo(() => placed.every(Boolean), [placed]);

  function getAudio() {
    const AC = typeof window !== "undefined" ? (window.AudioContext || window.webkitAudioContext) : null;
    if (!AC) return null;

    if (!audioRef.current) {
      const ctx = new AC();
      const master = ctx.createGain();
      master.gain.value = 0.45;
      master.connect(ctx.destination);
      audioRef.current = { ctx, master };
    }
    return audioRef.current;
  }

  function playSound(kind) {
    if (!soundOn) return;
    const audio = getAudio();
    if (!audio) return;

    const { ctx, master } = audio;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(master);

    const quickTone = (freq, dur, type = "sine", g = 0.25) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(freq, now);
      const og = ctx.createGain();
      og.gain.setValueAtTime(0.0001, now);
      og.gain.exponentialRampToValueAtTime(g, now + 0.01);
      og.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      o.connect(og);
      og.connect(gain);
      o.start(now);
      o.stop(now + dur + 0.02);
    };

    const noiseBurst = (dur, filterHzStart, filterHzEnd, g = 0.25) => {
      const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i += 1) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(filterHzStart, now);
      filter.frequency.exponentialRampToValueAtTime(Math.max(80, filterHzEnd), now + dur);
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.0001, now);
      ng.gain.exponentialRampToValueAtTime(g, now + 0.01);
      ng.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      src.connect(filter);
      filter.connect(ng);
      ng.connect(gain);
      src.start(now);
      src.stop(now + dur + 0.02);
    };

    const boom = () => {
      // Bass thump + dirty noise tail (bomb-like)
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(90, now);
      o.frequency.exponentialRampToValueAtTime(45, now + 0.22);

      const og = ctx.createGain();
      og.gain.setValueAtTime(0.0001, now);
      og.gain.exponentialRampToValueAtTime(0.55, now + 0.01);
      og.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);

      o.connect(og);
      og.connect(gain);
      o.start(now);
      o.stop(now + 0.36);

      // Add a crack + rumble
      noiseBurst(0.32, 5200, 180, 0.58);
    };

    const splash = () => {
      // High, quick noisy splash + a couple droplet plinks
      noiseBurst(0.14, 7800, 1200, 0.22);
      noiseBurst(0.22, 2400, 700, 0.12);
      quickTone(880, 0.045, "triangle", 0.08);
      window.setTimeout(() => quickTone(660, 0.05, "triangle", 0.06), 60);
    };

    if (kind === "place") {
      quickTone(520, 0.06, "triangle", 0.18);
      quickTone(740, 0.05, "triangle", 0.12);
      return;
    }

    if (kind === "miss") {
      splash();
      return;
    }

    if (kind === "hit") {
      boom();
      return;
    }

    if (kind === "win") {
      quickTone(523.25, 0.09, "triangle", 0.16);
      window.setTimeout(() => playSound("win2"), 90);
      return;
    }
    if (kind === "win2") {
      const audio2 = getAudio();
      if (!audio2) return;
      const t = audio2.ctx.currentTime;
      const g2 = audio2.ctx.createGain();
      g2.connect(audio2.master);
      const o1 = audio2.ctx.createOscillator();
      const o2 = audio2.ctx.createOscillator();
      o1.type = "triangle";
      o2.type = "triangle";
      o1.frequency.setValueAtTime(659.25, t);
      o2.frequency.setValueAtTime(783.99, t);
      g2.gain.setValueAtTime(0.0001, t);
      g2.gain.exponentialRampToValueAtTime(0.22, t + 0.01);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o1.connect(g2);
      o2.connect(g2);
      o1.start(t);
      o2.start(t);
      o1.stop(t + 0.2);
      o2.stop(t + 0.2);
      return;
    }

    if (kind === "lose") {
      noiseBurst(0.22, 1200, 120, 0.20);
      quickTone(164.81, 0.18, "sine", 0.14);
      window.setTimeout(() => quickTone(130.81, 0.2, "sine", 0.12), 120);
    }

    if (kind === "sunk") {
      // Big hit + longer low rumble
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(70, now);
      o.frequency.exponentialRampToValueAtTime(32, now + 0.55);

      const og = ctx.createGain();
      og.gain.setValueAtTime(0.0001, now);
      og.gain.exponentialRampToValueAtTime(0.65, now + 0.02);
      og.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);

      o.connect(og);
      og.connect(gain);
      o.start(now);
      o.stop(now + 0.75);

      noiseBurst(0.55, 5200, 140, 0.65);
      window.setTimeout(() => noiseBurst(0.45, 1400, 120, 0.28), 140);
    }
  }

  function triggerSunkFx(boardKey, coords) {
    if (!coords || !Array.isArray(coords)) return;
    const keys = coords.map((c) => `${c.x},${c.y}`);
    const id = `${boardKey}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setSunkFx({ board: boardKey, keys, id });
    window.setTimeout(() => {
      setSunkFx((cur) => (cur && cur.id === id ? null : cur));
    }, 1100);
  }

  function stopTts() {
    if (typeof window === "undefined") return;
    const synth = window.speechSynthesis;
    if (!synth) return;
    try {
      synth.cancel();
    } catch {
      // ignore
    }
  }

  function speakNerdy(text) {
    if (!soundOn) return;
    if (typeof window === "undefined") return;
    const synth = window.speechSynthesis;
    if (!synth || typeof window.SpeechSynthesisUtterance !== "function") return;

    const pickVoice = () => {
      const voices = synth.getVoices ? synth.getVoices() : [];
      if (!voices || voices.length === 0) return null;

      // Prefer an English voice that tends to sound "character-y"; fallback to any en voice.
      const preferred = voices.find((v) => /en[-_]?US/i.test(v.lang) && /(Fred|Alex|Samantha|Daniel|Google)/i.test(v.name));
      if (preferred) return preferred;
      const en = voices.find((v) => /^en/i.test(v.lang));
      return en || voices[0] || null;
    };

    // Ensure voices are loaded (some browsers populate asynchronously)
    if (!ttsRef.current.voicesLoaded) {
      const v = pickVoice();
      if (v) {
        ttsRef.current.voice = v;
        ttsRef.current.voicesLoaded = true;
      } else {
        try {
          synth.onvoiceschanged = () => {
            const vv = pickVoice();
            if (vv) {
              ttsRef.current.voice = vv;
              ttsRef.current.voicesLoaded = true;
            }
          };
        } catch {
          // ignore
        }
      }
    }

    stopTts();
    const u = new window.SpeechSynthesisUtterance(text);
    if (ttsRef.current.voice) u.voice = ttsRef.current.voice;
    // "Nerdy" vibe: slightly faster + higher pitch
    u.rate = 1.12;
    u.pitch = 1.45;
    u.volume = 1.0;

    try {
      synth.speak(u);
    } catch {
      // ignore
    }
  }

  function stopAnthem() {
    const el = anthemAudioRef.current;
    if (el) {
      try {
        el.pause();
        el.currentTime = 0;
      } catch {
        // ignore
      }
    }

    const a = anthemRef.current;
    if (a.stopTimer) {
      window.clearTimeout(a.stopTimer);
      a.stopTimer = null;
    }
    for (const n of a.nodes) {
      try {
        n.stop?.();
      } catch {
        // ignore
      }
      try {
        n.disconnect?.();
      } catch {
        // ignore
      }
    }
    a.nodes = [];
  }

  function playAnthem(teamKey) {
    if (!soundOn) return;

    // Real audio recording (preferred)
    const ANTHEMS = {
      usa: {
        src: "https://upload.wikimedia.org/wikipedia/commons/6/65/Star_Spangled_Banner_instrumental.ogg",
      },
      japan: {
        src: "https://upload.wikimedia.org/wikipedia/commons/a/a3/Kimi_ga_Yo_instrumental.ogg",
      },
    };

    const chosen = ANTHEMS[teamKey];
    if (typeof window !== "undefined" && chosen?.src) {
      try {
        if (!anthemAudioRef.current) {
          anthemAudioRef.current = new Audio();
          anthemAudioRef.current.preload = "auto";
          anthemAudioRef.current.crossOrigin = "anonymous";
        }
        const el = anthemAudioRef.current;
        if (el.src !== chosen.src) el.src = chosen.src;
        el.loop = true;
        el.volume = 0.45;
        stopAnthem();
        const p = el.play();
        if (p && typeof p.then === "function") {
          p.catch(() => {
            try {
              console.warn("Anthem audio playback failed; falling back to synthesized anthem.");
            } catch {
              // ignore
            }
          });
        }
        return;
      } catch {
        // fall back below
      }
    }

    // Synth fallback
    const audio = getAudio();
    if (!audio) return;

    stopAnthem();

    const { ctx, master } = audio;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime + 0.04;
    const gain = ctx.createGain();
    gain.connect(master);
    gain.gain.value = 0.26;

    const playSeq = (seq, type = "triangle") => {
      let t = now;
      for (const n of seq) {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.setValueAtTime(n.f, t);

        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.22, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.05, n.d * 0.95));

        o.connect(g);
        g.connect(gain);
        o.start(t);
        o.stop(t + n.d + 0.02);

        anthemRef.current.nodes.push(o);
        anthemRef.current.nodes.push(g);

        t += n.d;
      }
      return t;
    };

    const usa = [
      { f: 392.0, d: 0.36 },
      { f: 392.0, d: 0.28 },
      { f: 329.63, d: 0.34 },
      { f: 261.63, d: 0.36 },
      { f: 329.63, d: 0.36 },
      { f: 392.0, d: 0.46 },
      { f: 523.25, d: 0.52 },
      { f: 493.88, d: 0.34 },
      { f: 440.0, d: 0.70 },
    ];

    const japan = [
      { f: 392.0, d: 0.42 },
      { f: 440.0, d: 0.42 },
      { f: 493.88, d: 0.50 },
      { f: 440.0, d: 0.42 },
      { f: 392.0, d: 0.60 },
      { f: 329.63, d: 0.70 },
    ];

    const endAt = teamKey === "usa" ? playSeq(usa, "triangle") : playSeq(japan, "sine");
    anthemRef.current.stopTimer = window.setTimeout(() => stopAnthem(), Math.ceil((endAt - ctx.currentTime) * 1000));
  }

  // Apply theme to document body (no external libs)
  if (typeof document !== "undefined") {
    document.body.classList.toggle("team-usa", team === "usa");
    document.body.classList.toggle("team-japan", team === "japan");
    document.body.classList.toggle("in-game", phase === "placing" || phase === "playing");
  }

  const playerBoard = playerBoardRef.current;
  const aiBoard = aiBoardRef.current;

  const playerIntel = useMemo(() => {
    if (!playerBoard) return null;

    const ships = Array.isArray(playerBoard.ships) ? playerBoard.ships : [];
    const totalTargets = ships.reduce((acc, s) => acc + (s?.length || 0), 0);

    let shotsTaken = 0;
    let hitsLanded = 0;
    for (let y = 0; y < playerBoard.size; y += 1) {
      for (let x = 0; x < playerBoard.size; x += 1) {
        const c = playerBoard.grid[y][x];
        if (!c?.hit) continue;
        shotsTaken += 1;
        if (c.ship) hitsLanded += 1;
      }
    }

    const remainingTargets = Math.max(0, totalTargets - hitsLanded);
    const accuracy = shotsTaken > 0 ? hitsLanded / shotsTaken : 0;

    const byKeyOrder = new Map(FLEET.map((d, idx) => [d.key, idx]));
    const shipRows = ships
      .map((s, idx) => ({
        ship: s,
        idx,
        key: s?.meta?.key || String(idx),
        name: s?.meta?.name || "My Ship",
        hits: s?.hits || 0,
        length: s?.length || 0,
        sunk: Boolean(s?.sunk),
      }))
      .sort((a, b) => {
        const ao = byKeyOrder.has(a.key) ? byKeyOrder.get(a.key) : 999;
        const bo = byKeyOrder.has(b.key) ? byKeyOrder.get(b.key) : 999;
        return ao - bo;
      });

    const sunkCount = shipRows.reduce((acc, s) => acc + (s.sunk ? 1 : 0), 0);

    return {
      ships: shipRows,
      totalTargets,
      remainingTargets,
      shotsTaken,
      hitsLanded,
      accuracy,
      sunkCount,
      totalShips: shipRows.length,
    };
  }, [playerBoard, version]);

  const enemyIntel = useMemo(() => {
    if (!aiBoard) return null;

    const enemyShips = Array.isArray(aiBoard.ships) ? aiBoard.ships : [];

    const totalTargets = enemyShips.reduce((acc, s) => acc + (s?.length || 0), 0);

    let shotsTaken = 0;
    let hitsLanded = 0;
    for (let y = 0; y < aiBoard.size; y += 1) {
      for (let x = 0; x < aiBoard.size; x += 1) {
        const c = aiBoard.grid[y][x];
        if (!c?.hit) continue;
        shotsTaken += 1;
        if (c.ship) hitsLanded += 1;
      }
    }

    const remainingTargets = Math.max(0, totalTargets - hitsLanded);
    const accuracy = shotsTaken > 0 ? hitsLanded / shotsTaken : 0;

    const byKeyOrder = new Map(FLEET.map((d, idx) => [d.key, idx]));
    const ships = enemyShips
      .map((s, idx) => ({
        ship: s,
        idx,
        key: s?.meta?.key || String(idx),
        name: s?.meta?.name || "Enemy Ship",
        className: s?.meta?.className || "",
        hits: s?.hits || 0,
        length: s?.length || 0,
        sunk: Boolean(s?.sunk),
      }))
      .sort((a, b) => {
        const ao = byKeyOrder.has(a.key) ? byKeyOrder.get(a.key) : 999;
        const bo = byKeyOrder.has(b.key) ? byKeyOrder.get(b.key) : 999;
        return ao - bo;
      });

    const sunkCount = ships.reduce((acc, s) => acc + (s.sunk ? 1 : 0), 0);

    return {
      ships,
      totalTargets,
      remainingTargets,
      shotsTaken,
      hitsLanded,
      accuracy,
      sunkCount,
      totalShips: ships.length,
    };
  }, [aiBoard, version]);

  const nukeAvailable =
    phase === "playing" &&
    turn === "player" &&
    Boolean(playerIntel) &&
    playerIntel.remainingTargets === 1 &&
    !nukeUsed;

  const nukeBusy = nukeCountdown != null;

  useEffect(() => {
    if (nukeCountdown == null) return;
    if (nukeCountdown <= 0) {
      setNukeCountdown(null);
      setNukeArmed(true);
      setMessage("NUKE ARMED: click the target board to detonate a 7×7 strike.");
      return;
    }

    const t = window.setTimeout(() => setNukeCountdown((c) => (c == null ? c : c - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [nukeCountdown]);

  const playerGridCells = useMemo(() => {
    return playerBoard ? playerBoard.grid : [];
  }, [playerBoard, version]);

  const aiGridCells = useMemo(() => {
    return aiBoard ? aiBoard.grid : [];
  }, [aiBoard, version]);

  function enterPlacement(nextTeam, nextDifficulty) {
    if (!nextTeam || !nextDifficulty) return;

    stopAnthem();
    stopTts();

    setTeam(nextTeam);
    setDifficulty(nextDifficulty);

    playerBoardRef.current = new Gameboard(BOARD_SIZE);
    aiBoardRef.current = new Gameboard(BOARD_SIZE);
    randomPlaceFleet(aiBoardRef.current, nextTeam === "usa" ? "japan" : "usa");

    aiMemoryRef.current = {
      targetQueue: [],
      queued: new Set(),
      lastHit: null,
    };

    setPlaced(Array(FLEET.length).fill(false));
    setSelectedShipIdx(null);
    setIsVertical(false);
    setTurn("player");
    setRevealAiShips(false);
    setOutcome(null);
    setLastImpact(null);
    setSunkFx(null);
    setTorpedoUsed(false);
    setTorpedoArmed(false);
    setNukeUsed(false);
    setNukeArmed(false);
    setNukeCountdown(null);
    setNukeFx(null);
    setPhase("placing");
    const label = nextTeam === "usa" ? "USA" : "Japan";
    setMessage(`Midway deployment: place your fleet (${label}). Difficulty: ${nextDifficulty}.`);
    setVersion((v) => v + 1);
  }

  function finalizePlacement() {
    setPhase("playing");
    setTurn("player");
    setMessage("All ships placed. Your turn.");
    setVersion((v) => v + 1);
  }

  function resetPlacement() {
    if (phase !== "placing") return;
    playerBoardRef.current = new Gameboard(BOARD_SIZE);
    setPlaced(Array(FLEET.length).fill(false));
    setSelectedShipIdx(null);
    setIsVertical(false);
    setLastImpact(null);
    setSunkFx(null);
    setMessage("Deployment reset. Place your ships.");
    setVersion((v) => v + 1);
  }

  function randomizePlayerFleet() {
    if (phase !== "placing") return;
    if (!team) return;
    const b = new Gameboard(BOARD_SIZE);
    randomPlaceFleet(b, team);
    playerBoardRef.current = b;
    setPlaced(Array(FLEET.length).fill(true));
    setSelectedShipIdx(null);
    setMessage("Fleet randomized. Ready to play.");
    setVersion((v) => v + 1);
    finalizePlacement();
  }

  function reset() {
    stopAnthem();
    stopTts();
    setTeam(null);
    setDifficulty(null);
    setPhase("setup");
    setTurn("player");
    playerBoardRef.current = null;
    aiBoardRef.current = null;
    aiMemoryRef.current = null;
    setRevealAiShips(false);
    setPlaced(Array(FLEET.length).fill(false));
    setSelectedShipIdx(null);
    setIsVertical(false);
    setOutcome(null);
    setSetupDifficulty(null);
    setLastImpact(null);
    setSunkFx(null);
    setTorpedoUsed(false);
    setTorpedoArmed(false);
    setNukeUsed(false);
    setNukeArmed(false);
    setNukeCountdown(null);
    setNukeFx(null);
    setMessage("Select your fleet for the Battle of Midway.");
    setVersion((v) => v + 1);
  }

  function endGame(nextOutcome, text) {
    setOutcome(nextOutcome);
    setPhase("over");
    setRevealAiShips(true);
    setMessage(text);

    setTorpedoArmed(false);
    setNukeArmed(false);
    setNukeCountdown(null);

    stopAnthem();
    if (soundOn) {
      const winner = nextOutcome === "win" ? team : opponent;
      if (winner === "usa" || winner === "japan") {
        window.setTimeout(() => playAnthem(winner), 0);
      }
    }

    if (nextOutcome === "win") playSound("win");
    if (nextOutcome === "lose") playSound("lose");
  }

  function playerAttack(x, y) {
    if (phase !== "playing") return;
    if (turn !== "player") return;
    if (!aiBoardRef.current || !playerBoardRef.current) return;
    if (nukeBusy) return;

    if (nukeArmed && !nukeUsed) {
      const ax = Math.min(Math.max(x - 3, 0), BOARD_SIZE - 7);
      const ay = Math.min(Math.max(y - 3, 0), BOARD_SIZE - 7);

      let anyOk = false;
      let anyHit = false;
      let anyMiss = false;
      const sunkCoordsList = [];
      const fxKeys = [];

      for (let dy = 0; dy < 7; dy += 1) {
        for (let dx = 0; dx < 7; dx += 1) {
          const rx = ax + dx;
          const ry = ay + dy;
          fxKeys.push(`${rx},${ry}`);
          const r = aiBoardRef.current.receiveAttack(rx, ry);
          if (!r.ok) continue;
          anyOk = true;
          if (r.result === "miss") anyMiss = true;
          if (r.result === "hit") anyHit = true;
          if (r.result === "sunk") {
            anyHit = true;
            if (Array.isArray(r.coords)) sunkCoordsList.push(r.coords);
          }
        }
      }

      setNukeArmed(false);
      setNukeUsed(true);

      const id = `ai-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setNukeFx({ board: "ai", keys: fxKeys, id });
      window.setTimeout(() => {
        setNukeFx((cur) => (cur && cur.id === id ? null : cur));
      }, 1500);

      if (!anyOk) {
        setMessage("Nuke strike ineffective (all squares already attacked). AI's turn.");
        setTurn("ai");
        window.setTimeout(() => aiTakeTurn(true), 350);
        return;
      }

      const summary = anyHit ? "hit" : "miss";
      setLastImpact({ board: "ai", x, y, result: summary });

      if (anyHit) playSound("hit");
      else if (anyMiss) playSound("miss");

      for (const coords of sunkCoordsList) {
        triggerSunkFx("ai", coords);
        playSound("sunk");
        speakNerdy("You sunk my battleship!");
      }

      setVersion((v) => v + 1);

      if (aiBoardRef.current.allShipsSunk()) {
        endGame("win", `Victory at Midway! ${teamLabel} forces have sunk the enemy fleet.`);
        return;
      }

      setMessage(`NUCLEAR STRIKE at (${x},${y}). AI's turn.`);
      setTurn("ai");
      window.setTimeout(() => aiTakeTurn(true), 550);
      return;
    }

    if (torpedoArmed && !torpedoUsed) {
      const ax = Math.min(Math.max(x - 1, 0), BOARD_SIZE - 3);
      const ay = Math.min(Math.max(y - 1, 0), BOARD_SIZE - 3);

      let anyOk = false;
      let anyHit = false;
      let anyMiss = false;
      const sunkCoordsList = [];

      for (let dy = 0; dy < 3; dy += 1) {
        for (let dx = 0; dx < 3; dx += 1) {
          const rx = ax + dx;
          const ry = ay + dy;
          const r = aiBoardRef.current.receiveAttack(rx, ry);
          if (!r.ok) continue;
          anyOk = true;
          if (r.result === "miss") anyMiss = true;
          if (r.result === "hit") anyHit = true;
          if (r.result === "sunk") {
            anyHit = true;
            if (Array.isArray(r.coords)) sunkCoordsList.push(r.coords);
          }
        }
      }

      setTorpedoArmed(false);
      setTorpedoUsed(true);

      if (!anyOk) {
        setMessage("Torpedo strike ineffective (all squares already attacked).");
        return;
      }

      const summary = anyHit ? "hit" : "miss";
      setLastImpact({ board: "ai", x, y, result: summary });

      if (anyHit) playSound("hit");
      else if (anyMiss) playSound("miss");

      for (const coords of sunkCoordsList) {
        triggerSunkFx("ai", coords);
        playSound("sunk");
        speakNerdy("You sunk my battleship!");
      }

      setVersion((v) => v + 1);

      if (aiBoardRef.current.allShipsSunk()) {
        endGame("win", `Victory at Midway! ${teamLabel} forces have sunk the enemy fleet.`);
        return;
      }

      setMessage(`Tactical torpedo fired at (${x},${y}). AI's turn.`);
      setTurn("ai");
      window.setTimeout(() => aiTakeTurn(true), 350);
      return;
    }

    const result = aiBoardRef.current.receiveAttack(x, y);
    if (!result.ok) {
      if (result.reason === "already_attacked") setMessage("Already attacked that square.");
      else setMessage("Invalid attack.");
      return;
    }

    if (result.result === "miss") setMessage(`You missed at (${x},${y}). AI's turn.`);
    if (result.result === "hit") setMessage(`You hit at (${x},${y})! AI's turn.`);
    if (result.result === "sunk") setMessage("You sunk an AI ship! AI's turn.");

    setLastImpact({ board: "ai", x, y, result: result.result });

    if (result.result === "miss") playSound("miss");
    if (result.result === "hit") playSound("hit");
    if (result.result === "sunk") {
      playSound("sunk");
      triggerSunkFx("ai", result.coords);
      speakNerdy("You sunk my battleship!");
    }

    setVersion((v) => v + 1);

    if (aiBoardRef.current.allShipsSunk()) {
      endGame("win", `Victory at Midway! ${teamLabel} forces have sunk the enemy fleet.`);
      return;
    }

    setTurn("ai");
    window.setTimeout(() => aiTakeTurn(true), 350);
  }

  function playerPlaceShip(x, y) {
    if (phase !== "placing") return;
    if (!playerBoardRef.current) return;
    if (selectedShipIdx == null) return;
    if (placed[selectedShipIdx]) return;

    const def = FLEET[selectedShipIdx];
    const ship = new Ship(def.length);
    ship.meta = {
      key: def.key,
      className: def.className,
      name: team === "japan" ? def.japanName : def.usaName,
    };

    const ok = playerBoardRef.current.placeShip(ship, x, y, isVertical);
    if (!ok) {
      setMessage(`Can't place ${ship.meta.name} there.`);
      return;
    }

    setDragHover(null);
    setDraggingShip(false);

    playSound("place");

    const nextPlaced = placed.slice();
    nextPlaced[selectedShipIdx] = true;
    setPlaced(nextPlaced);
    setVersion((v) => v + 1);

    if (nextPlaced.every(Boolean)) {
      setSelectedShipIdx(null);
      finalizePlacement();
      return;
    }

    const nextIdx = nextPlaced.findIndex((v) => !v);
    setSelectedShipIdx(nextIdx >= 0 ? nextIdx : null);
    const nextDef = nextIdx >= 0 ? FLEET[nextIdx] : null;
    const nextName = nextDef ? (team === "japan" ? nextDef.japanName : nextDef.usaName) : "";
    setMessage(nextName ? `Placed ${ship.meta.name}. Next: ${nextName}.` : `Placed ${ship.meta.name}.`);
  }

  function onDragStartShip(e, idx) {
    if (phase !== "placing") return;
    if (idx == null) return;
    if (placed[idx]) return;
    const def = FLEET[idx];
    setSelectedShipIdx(idx);
    setDraggingShip(true);
    setDragHover(null);
    try {
      e.dataTransfer.setData("text/plain", String(def.length));
    } catch {
      // ignore
    }
    e.dataTransfer.effectAllowed = "copy";
  }

  function onDragEndCurrentShip() {
    setDraggingShip(false);
    setDragHover(null);
  }

  function onHoverShipCell(x, y) {
    if (!draggingShip) return;
    if (phase !== "placing") return;
    if (!playerBoardRef.current) return;
    if (selectedShipIdx == null) return;
    if (placed[selectedShipIdx]) return;

    lastHoverRef.current = { x, y };

    const def = FLEET[selectedShipIdx];
    const keys = [];
    for (let i = 0; i < def.length; i += 1) {
      const cx = isVertical ? x : x + i;
      const cy = isVertical ? y + i : y;
      keys.push(`${cx},${cy}`);
    }
    const valid = canPlaceShip(playerBoardRef.current, x, y, isVertical, def.length);
    setDragHover({ keys, valid });
  }

  function aiTakeTurn(force = false) {
    if (phase !== "playing") return;
    if (!force && turn !== "ai") return;
    if (!aiMemoryRef.current || !playerBoardRef.current || !difficulty) return;

    const memory = aiMemoryRef.current;
    const pb = playerBoardRef.current;

    const enqueueTargetsAround = (x, y) => {
      for (const n of neighbors4(x, y)) {
        if (!pb.inBounds(n.x, n.y)) continue;
        if (pb.grid[n.y][n.x].hit) continue;
        const k = coordKey(n.x, n.y);
        if (memory.queued.has(k)) continue;
        memory.targetQueue.push({ x: n.x, y: n.y });
        memory.queued.add(k);
      }
    };

    const move = chooseAiMove({ difficulty, playerBoard: pb, memory });
    if (!move) {
      endGame("Game over.");
      return;
    }

    const result = pb.receiveAttack(move.x, move.y);
    if (!result.ok) {
      // Should not happen, but if it does, just try again.
      window.setTimeout(aiTakeTurn, 0);
      return;
    }

    if (result.result === "miss") setMessage(`AI missed at (${move.x},${move.y}). Your turn.`);
    if (result.result === "hit") setMessage(`AI hit you at (${move.x},${move.y})! Your turn.`);
    if (result.result === "sunk") setMessage("AI sunk one of your ships! Your turn.");

    setLastImpact({ board: "player", x: move.x, y: move.y, result: result.result });

    if (result.result === "miss") playSound("miss");
    if (result.result === "hit") playSound("hit");
    if (result.result === "sunk") {
      playSound("sunk");
      triggerSunkFx("player", result.coords);
    }

    if (difficulty !== "easy" && (result.result === "hit" || result.result === "sunk")) {
      enqueueTargetsAround(move.x, move.y);
    }

    updateAiMemoryAfterAttack({
      difficulty,
      x: move.x,
      y: move.y,
      result: result.result,
      memory,
    });

    setVersion((v) => v + 1);

    if (pb.allShipsSunk()) {
      endGame("lose", `Defeat at Midway. ${opponentLabel} forces have sunk your fleet.`);
      return;
    }

    setTurn("player");
  }

  return React.createElement(
    "div",
    { className: "container" },
    phase === "setup"
      ? React.createElement(
          "div",
          {
            className: "startupOverlay",
            role: "dialog",
            "aria-modal": true,
          },
          React.createElement(
            "div",
            { className: "startupCard" },
            React.createElement("div", { className: "startupTitle" }, "Battle of Midway"),
            React.createElement(
              "div",
              { className: "startupText" },
              "Choose your fleet and operational difficulty. Then deploy your ships."
            ),
            React.createElement(
              "div",
              { className: "subtle", style: { marginTop: 8, fontSize: 12 } },
              "Anthem audio: USA instrumental and Japan instrumental via Wikimedia Commons."
            ),
            React.createElement(
              "div",
              { className: "startupSection" },
              React.createElement("div", { className: "startupSectionTitle" }, "Choose Fleet"),
              React.createElement(
                "div",
                { className: "choiceRow" },
                React.createElement(
                  "button",
                  {
                    className: `teamPill selectableButton${team === "usa" ? " selected" : ""}`,
                    onClick: () => {
                      stopAnthem();
                      setTeam("usa");
                      setMessage("USA fleet selected.");
                      playAnthem("usa");
                    },
                  },
                  React.createElement("span", {
                    className: "teamDot",
                    style: { background: "rgba(59, 130, 246, 0.95)" },
                  }),
                  "USA"
                ),
                React.createElement(
                  "button",
                  {
                    className: `teamPill selectableButton${team === "japan" ? " selected" : ""}`,
                    onClick: () => {
                      stopAnthem();
                      setTeam("japan");
                      setMessage("Japan fleet selected.");
                      playAnthem("japan");
                    },
                  },
                  React.createElement("span", {
                    className: "teamDot",
                    style: { background: "rgba(239, 68, 68, 0.95)" },
                  }),
                  "Japan"
                )
              )
            ),
            React.createElement(
              "div",
              { className: "startupSection" },
              React.createElement("div", { className: "startupSectionTitle" }, "Choose Difficulty"),
              React.createElement(
                "div",
                { className: "choiceRow" },
                React.createElement(
                  "button",
                  {
                    className: `selectableButton${setupDifficulty === "easy" ? " selected" : ""}`,
                    onClick: () => setSetupDifficulty("easy"),
                    disabled: !team,
                  },
                  "Easy"
                ),
                React.createElement(
                  "button",
                  {
                    className: `selectableButton${setupDifficulty === "medium" ? " selected" : ""}`,
                    onClick: () => setSetupDifficulty("medium"),
                    disabled: !team,
                  },
                  "Medium"
                ),
                React.createElement(
                  "button",
                  {
                    className: `selectableButton${setupDifficulty === "hard" ? " selected" : ""}`,
                    onClick: () => setSetupDifficulty("hard"),
                    disabled: !team,
                  },
                  "Hard"
                )
              )
            ),
            React.createElement(
              "div",
              { className: "endActions" },
              React.createElement(
                "button",
                {
                  onClick: () => enterPlacement(team, setupDifficulty),
                  disabled: !team || !setupDifficulty,
                },
                "Begin Deployment"
              )
            )
          )
        )
      : null,
    phase === "over"
      ? React.createElement(
          "div",
          {
            className: `endOverlay ${outcome || ""}`,
            role: "dialog",
            "aria-modal": true,
          },
          React.createElement(
            "div",
            { className: "endCard" },
            outcome === "win"
              ? React.createElement(
                  "div",
                  { className: "confetti", "aria-hidden": true },
                  Array.from({ length: 18 }).map((_, i) =>
                    React.createElement("span", {
                      key: i,
                      style: {
                        left: `${(i * 100) / 18}%`,
                        background:
                          ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#a855f7"][i % 5],
                        animationDelay: `${60 + i * 35}ms`,
                      },
                    })
                  )
                )
              : null,
            React.createElement(
              "div",
              { className: "endTitle" },
              outcome === "win" ? "Victory!" : "Defeat"
            ),
            React.createElement(
              "div",
              { className: "endText" },
              outcome === "win"
                ? `Congratulations, Commander. ${teamLabel} has prevailed in the Battle of Midway.`
                : `Condolences, Commander. ${teamLabel} has suffered a hard loss at Midway. Regroup and return.`
            ),
            React.createElement(
              "div",
              { className: "endActions" },
              React.createElement(
                "button",
                {
                  onClick: reset,
                },
                "Play again"
              )
            )
          )
        )
      : null,
    React.createElement(
      "div",
      { className: "topbar" },
      React.createElement(
        "div",
        null,
        React.createElement("div", { className: "title" }, "Battle of Midway"),
        React.createElement(
          "div",
          { className: "subtitle" },
          team ? `Fleet: ${teamLabel} • Opponent: ${opponentLabel}` : "Select your fleet and difficulty"
        )
      ),
      React.createElement(
        "div",
        { className: "actions" },
        React.createElement(
          "button",
          {
            onClick: () => {
              const next = !soundOn;
              setSoundOn(next);
              if (!next) stopAnthem();
              if (next) window.setTimeout(() => playSound("place"), 0);
            },
          },
          soundOn ? "Sound: On" : "Sound: Off"
        ),
        React.createElement(
          "button",
          { onClick: reset },
          "Reset"
        ),
        React.createElement(
          "button",
          { onClick: () => setRevealAiShips((s) => !s), disabled: phase === "setup" },
          revealAiShips ? "Hide AI ships" : "Reveal AI ships"
        )
      )
    ),
    React.createElement(
      "div",
      { className: "panel" },
      React.createElement("div", null, message),
      phase === "placing"
        ? React.createElement(
            "div",
            { className: "choiceRow" },
            React.createElement(
              "button",
              { onClick: () => setIsVertical((v) => !v) },
              isVertical ? "Vertical" : "Horizontal"
            ),
            React.createElement(
              "button",
              { onClick: resetPlacement },
              "Reset placement"
            ),
            React.createElement(
              "button",
              { onClick: randomizePlayerFleet },
              "Randomize"
            )
          )
        : null,
      phase === "placing"
        ? React.createElement(
            "div",
            { className: "inventory" },
            React.createElement("div", { className: "inventoryTitle" }, "Your Fleet"),
            React.createElement(
              "div",
              { className: "inventoryList" },
              inventoryItems.map((it) =>
                React.createElement(
                  "div",
                  {
                    key: `${it.def.key}-${it.idx}`,
                    className: `shipTag${it.placed ? " placed" : ""}${it.idx === selectedShipIdx ? " active" : ""}`,
                    title: it.placed ? "Placed" : "Not placed",
                    onClick: it.placed ? undefined : () => setSelectedShipIdx(it.idx),
                  },
                  React.createElement(
                    "div",
                    {
                      className: `shipPiece${it.placed ? " disabled" : ""}${isVertical ? " vertical" : ""}`,
                      draggable: !it.placed,
                      onDragStart: !it.placed ? (e) => onDragStartShip(e, it.idx) : undefined,
                      onDragEnd: !it.placed ? onDragEndCurrentShip : undefined,
                      title:
                        !it.placed ? "Drag onto the grid to place" : "Placed",
                    },
                    shipTopSvg({ def: it.def, team, isVertical, radar: radarOn })
                  ),
                  React.createElement(
                    "span",
                    null,
                    it.placed
                      ? `✓ ${team === "japan" ? it.def.japanName : it.def.usaName}`
                      : `${team === "japan" ? it.def.japanName : it.def.usaName}`
                  )
                )
              )
            )
          )
        : null,
      phase !== "setup"
        ? React.createElement(
            "div",
            { className: "subtle", style: { marginTop: 10 } },
            `Turn: ${turn}${difficulty ? ` • Difficulty: ${difficulty}` : ""}`
          )
        : null,
      React.createElement(
        "div",
        { className: "boards" },
        React.createElement(
          "div",
          null,
          React.createElement(
            "div",
            { className: "boardHeader" },
            React.createElement("div", { className: "boardTitle" }, "My Ships"),
            React.createElement(
              "div",
              { className: "subtle" },
              phase === "placing"
                ? `Deploy: ${selectedShipIdx != null ? (team === "japan" ? FLEET[selectedShipIdx].japanName : FLEET[selectedShipIdx].usaName) : allPlaced ? "done" : "select a ship"}`
                : "Enemy attacks here"
            )
          ),
          React.createElement(
            "div",
            { className: "gridWrap" },
            playerBoardRef.current?.ships
              ?.filter((s) => s?.placement && s?.meta)
              .map((s) => {
                const def = FLEET.find((d) => d.key === s.meta.key) || null;
                if (!def) return null;
                const left = s.placement.x * CELL_PITCH;
                const top = s.placement.y * CELL_PITCH;
                const isVerticalShip = Boolean(s.placement.isVertical);
                return React.createElement(
                  "div",
                  {
                    key: `svg-${s.meta.key}-${s.placement.x}-${s.placement.y}`,
                    className: "shipSvgOverlay",
                    style: { left: `${left}px`, top: `${top}px` },
                  },
                  shipTopSvg({ def, team, isVertical: isVerticalShip, radar: radarOn })
                );
              }),
            React.createElement(
              "div",
              { className: "grid" },
              playerGridCells.flatMap((row, y) =>
                row.map((cell, x) =>
                  React.createElement(PlayerCell, {
                    key: `p-${x}-${y}-${version}`,
                    x,
                    y,
                    cell,
                    grid: playerGridCells,
                    showShips: true,
                    placingEnabled: phase === "placing" && selectedShipIdx != null && !placed[selectedShipIdx],
                    onDropShip: playerPlaceShip,
                    onHoverShip: onHoverShipCell,
                    preview: dragHover,
                    isLastImpact:
                      Boolean(lastImpact) && lastImpact.board === "player" && lastImpact.x === x && lastImpact.y === y,
                    isSunkFx:
                      Boolean(sunkFx) && sunkFx.board === "player" && sunkFx.keys.includes(`${x},${y}`),
                  })
                )
              )
            )
          ),
          playerIntel
            ? React.createElement(
                "div",
                { className: "intelPanel" },
                React.createElement(
                  "div",
                  { className: "intelSummary" },
                  React.createElement(
                    "div",
                    { className: "intelTitle" },
                    "My Fleet Status"
                  ),
                  React.createElement(
                    "div",
                    { className: "intelCounters" },
                    React.createElement(
                      "span",
                      null,
                      `Sunk: ${playerIntel.sunkCount}/${playerIntel.totalShips}`
                    ),
                    React.createElement(
                      "span",
                      null,
                      `Targets remaining: ${playerIntel.remainingTargets}/${playerIntel.totalTargets}`
                    ),
                    React.createElement(
                      "span",
                      null,
                      `Enemy shots: ${playerIntel.shotsTaken} • Enemy hits: ${playerIntel.hitsLanded} • Accuracy: ${Math.round(
                        playerIntel.accuracy * 100
                      )}%`
                    )
                  )
                ),
                React.createElement(
                  "div",
                  { className: "intelShips" },
                  playerIntel.ships.map((s) =>
                    React.createElement(
                      "div",
                      {
                        key: `pintel-${s.key}`,
                        className: `intelRow${s.sunk ? " sunk" : ""}`,
                      },
                      React.createElement(
                        "div",
                        { className: "intelShipName" },
                        s.name
                      ),
                      React.createElement(
                        "div",
                        { className: "intelShipState" },
                        s.sunk ? "SUNK" : `${s.hits}/${s.length}`
                      ),
                      React.createElement(
                        "div",
                        { className: "intelBar" },
                        React.createElement("div", {
                          className: "intelBarFill",
                          style: {
                            width: `${s.length > 0 ? Math.min(100, (s.hits / s.length) * 100) : 0}%`,
                          },
                        })
                      )
                    )
                  )
                )
              )
            : null
        ),
        React.createElement(
          "div",
          null,
          React.createElement(
            "div",
            { className: "boardHeader" },
            React.createElement("div", { className: "boardTitle" }, "Target Board"),
            React.createElement(
              "div",
              { className: "subtle" },
              "Click to fire"
            )
          ),
          React.createElement(
            "div",
            { className: "grid" },
            aiGridCells.flatMap((row, y) =>
              row.map((cell, x) =>
                React.createElement(Cell, {
                  key: `a-${x}-${y}-${version}`,
                  x,
                  y,
                  cell,
                  showShips: revealAiShips,
                  disabled: phase !== "playing" || turn !== "player" || cell.hit || nukeBusy,
                  onAttack: playerAttack,
                  isLastImpact:
                    Boolean(lastImpact) && lastImpact.board === "ai" && lastImpact.x === x && lastImpact.y === y,
                  isSunkFx:
                    Boolean(sunkFx) && sunkFx.board === "ai" && sunkFx.keys.includes(`${x},${y}`),
                  isNukeFx:
                    Boolean(nukeFx) && nukeFx.board === "ai" && nukeFx.keys.includes(`${x},${y}`),
                })
              )
            )
          ),
          React.createElement(
            "div",
            { className: "torpedoPanel" },
            React.createElement("span", {
              className: `torpedoLight${torpedoArmed ? " armed" : ""}${torpedoUsed ? " used" : ""}`,
              "aria-hidden": true,
            }),
            React.createElement(
              "button",
              {
                className: "torpedoBtn",
                onClick: () => {
                  if (phase !== "playing") return;
                  if (turn !== "player") return;
                  if (torpedoUsed) return;
                  const next = !torpedoArmed;
                  setTorpedoArmed(next);
                  setMessage(
                    next
                      ? "Tactical torpedo armed: click a 3×3 area on the target board."
                      : "Tactical torpedo disarmed."
                  );
                },
                disabled: phase !== "playing" || turn !== "player" || torpedoUsed,
              },
              torpedoUsed ? "Torpedo: Used" : torpedoArmed ? "Torpedo: Armed" : "Tactical Torpedo"
            )
          ),
          React.createElement(
            "div",
            { className: "torpedoPanel" },
            React.createElement("span", {
              className: `nukeLight${nukeArmed || nukeCountdown != null ? " armed" : ""}${nukeUsed ? " used" : ""}`,
              "aria-hidden": true,
            }),
            React.createElement(
              "button",
              {
                className: "nukeBtn",
                onClick: () => {
                  if (phase !== "playing") return;
                  if (turn !== "player") return;
                  if (nukeUsed) return;
                  if (!nukeAvailable) return;
                  if (nukeArmed) return;
                  if (nukeCountdown != null) return;
                  setTorpedoArmed(false);
                  setNukeCountdown(3);
                  setMessage("TACTICAL COUNTDOWN: Nuke strike in T-3...");
                },
                disabled: phase !== "playing" || turn !== "player" || nukeUsed || !nukeAvailable || nukeArmed || nukeCountdown != null,
              },
              nukeUsed
                ? "Nuke: Used"
                : nukeArmed
                  ? "NUKE: ARMED"
                  : nukeCountdown != null
                    ? `Nuke in: ${nukeCountdown}`
                    : nukeAvailable
                      ? "Deploy Nuke"
                      : "Nuke: Locked"
            )
          ),
          enemyIntel
            ? React.createElement(
                "div",
                { className: "intelPanel" },
                React.createElement(
                  "div",
                  { className: "intelSummary" },
                  React.createElement(
                    "div",
                    { className: "intelTitle" },
                    "Enemy Fleet Status"
                  ),
                  React.createElement(
                    "div",
                    { className: "intelCounters" },
                    React.createElement(
                      "span",
                      null,
                      `Sunk: ${enemyIntel.sunkCount}/${enemyIntel.totalShips}`
                    ),
                    React.createElement(
                      "span",
                      null,
                      `Targets remaining: ${enemyIntel.remainingTargets}/${enemyIntel.totalTargets}`
                    ),
                    React.createElement(
                      "span",
                      null,
                      `Shots: ${enemyIntel.shotsTaken} • Hits: ${enemyIntel.hitsLanded} • Accuracy: ${Math.round(
                        enemyIntel.accuracy * 100
                      )}%`
                    )
                  )
                ),
                React.createElement(
                  "div",
                  { className: "intelShips" },
                  enemyIntel.ships.map((s) =>
                    React.createElement(
                      "div",
                      {
                        key: `intel-${s.key}`,
                        className: `intelRow${s.sunk ? " sunk" : ""}`,
                      },
                      React.createElement(
                        "div",
                        { className: "intelShipName" },
                        s.name
                      ),
                      React.createElement(
                        "div",
                        { className: "intelShipState" },
                        s.sunk ? "SUNK" : `${s.hits}/${s.length}`
                      ),
                      React.createElement(
                        "div",
                        { className: "intelBar" },
                        React.createElement("div", {
                          className: "intelBarFill",
                          style: {
                            width: `${s.length > 0 ? Math.min(100, (s.hits / s.length) * 100) : 0}%`,
                          },
                        })
                      )
                    )
                  )
                )
              )
            : null
        )
      ),
      React.createElement(
        "div",
        { className: "legend" },
        React.createElement(
          "div",
          { className: "chip" },
          React.createElement("span", { className: "dot unknown" }),
          React.createElement("span", null, "Unknown")
        ),
        React.createElement(
          "div",
          { className: "chip" },
          React.createElement("span", { className: "dot miss" }),
          React.createElement("span", null, "Miss")
        ),
        React.createElement(
          "div",
          { className: "chip" },
          React.createElement("span", { className: "dot hit" }),
          React.createElement("span", null, "Hit")
        ),
        React.createElement(
          "div",
          { className: "chip" },
          React.createElement("span", { className: "dot ship" }),
          React.createElement("span", null, "Ship (when revealed)")
        )
      )
    )
  );
}

createRoot(document.getElementById("root")).render(React.createElement(App));
