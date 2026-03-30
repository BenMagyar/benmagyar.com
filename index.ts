import {
  layoutNextLine,
  prepareWithSegments,
  type LayoutCursor,
  type PreparedTextWithSegments
} from "@chenglou/pretext";

const canvas = document.querySelector<HTMLCanvasElement>("#visualizer");
const fixedLinks = document.querySelector<HTMLElement>("#fixed-links");
const fixedLinkGithub = document.querySelector<HTMLElement>("#fixed-link-github");
const fixedLinkEmail = document.querySelector<HTMLElement>("#fixed-link-email");
const name = document.querySelector<HTMLElement>(".name");
const role = document.querySelector<HTMLElement>(".role");
const audioProfileScript = document.querySelector<HTMLScriptElement>(
  "#visualizer-audio-profile"
);

if (canvas === null) {
  throw new Error("Expected #visualizer canvas to exist.");
}

if (
  fixedLinks === null ||
  fixedLinkGithub === null ||
  fixedLinkEmail === null ||
  name === null ||
  role === null ||
  audioProfileScript === null
) {
  throw new Error("Expected intro text, fixed links, and audio profile nodes to exist.");
}

const shell = canvas.parentElement;
const landing = shell?.parentElement;
const intro = document.querySelector<HTMLElement>(".intro");

if (!(shell instanceof HTMLElement)) {
  throw new Error("Expected visualizer container to exist.");
}

if (!(landing instanceof HTMLElement)) {
  throw new Error("Expected landing container to exist.");
}

if (intro === null) {
  throw new Error("Expected intro block to exist.");
}

const ctx = canvas.getContext("2d");

if (ctx === null) {
  throw new Error("Expected 2D canvas context to be available.");
}

const glyphs = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LINES_ABOVE_NAME = 9;
const LINES_BELOW_NAME = 11;
const VISUALIZER_CENTER_INDEX = LINES_ABOVE_NAME;
const VISUALIZER_LINES = LINES_ABOVE_NAME + 1 + LINES_BELOW_NAME;
const VISUALIZER_PLAYBACK_RATE = 0.25;

type VisualizerAudioProfile = {
  frameRate: number;
  frameCount: number;
  rowCount: number;
  durationMs: number;
  encoded: string;
};

function parseAudioProfile(script: HTMLScriptElement): VisualizerAudioProfile {
  let parsed: unknown;

  try {
    parsed = JSON.parse(script.textContent ?? "");
  } catch {
    throw new Error("Expected inline visualizer audio profile JSON to be valid.");
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as { frameRate?: unknown }).frameRate !== "number" ||
    typeof (parsed as { frameCount?: unknown }).frameCount !== "number" ||
    typeof (parsed as { rowCount?: unknown }).rowCount !== "number" ||
    typeof (parsed as { durationMs?: unknown }).durationMs !== "number" ||
    typeof (parsed as { encoded?: unknown }).encoded !== "string"
  ) {
    throw new Error("Expected inline visualizer audio profile JSON to have the right shape.");
  }

  return parsed as VisualizerAudioProfile;
}

const visualizerAudioProfile = parseAudioProfile(audioProfileScript);
const AUDIO_ROW_ORDER = Array.from(
  { length: VISUALIZER_LINES },
  (_, index) => index
).sort(
  (left, right) =>
    Math.abs(left - VISUALIZER_CENTER_INDEX) -
      Math.abs(right - VISUALIZER_CENTER_INDEX) || left - right
);
const AUDIO_BAND_BY_ROW = Array.from({ length: VISUALIZER_LINES }, () => 0);

AUDIO_ROW_ORDER.forEach((rowIndex, bandIndex) => {
  AUDIO_BAND_BY_ROW[rowIndex] = bandIndex;
});

if (visualizerAudioProfile.rowCount !== VISUALIZER_LINES) {
  throw new Error("Derived visualizer audio data does not match the row count.");
}

function makeSeed() {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return buffer[0]!;
}

function mulberry32(seed: number) {
  let state = seed >>> 0;

  return function nextRandom() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], random: () => number) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const temp = copy[index]!;
    copy[index] = copy[swapIndex]!;
    copy[swapIndex] = temp;
  }

  return copy;
}

const landingSeed = makeSeed();
const seededRandom = mulberry32(landingSeed);
const FIXED_LINK_ROW_CHOICES = shuffle(
  [
    VISUALIZER_CENTER_INDEX - 1,
    VISUALIZER_CENTER_INDEX,
    VISUALIZER_CENTER_INDEX + 1
  ],
  seededRandom
);
const GITHUB_ROW_INDEX = FIXED_LINK_ROW_CHOICES[0]!;
const EMAIL_ROW_INDEX = FIXED_LINK_ROW_CHOICES[1]!;
const GITHUB_SEGMENT_COUNT = 1 + Math.floor(seededRandom() * 3);
const EMAIL_SEGMENT_COUNT = 1 + Math.floor(seededRandom() * 3);
const audioEnergyBytes = decodeBase64(visualizerAudioProfile.encoded);

if (
  audioEnergyBytes.length !==
  visualizerAudioProfile.rowCount * visualizerAudioProfile.frameCount
) {
  throw new Error("Derived visualizer audio data length was invalid.");
}

const state = {
  width: 0,
  height: 0,
  dpr: 1,
  font: "",
  fontSize: 0,
  lineHeight: 12,
  prepared: null as PreparedTextWithSegments | null,
  obstacles: [] as Array<{ top: number; right: number; bottom: number }>,
  baseMinX: 0,
  minX: 0,
  fixedLinksGap: 0,
  startY: 0,
  targetLineCount: 0,
  rows: [] as Array<{
    index: number;
    y: number;
    segments: Array<{
      text: string;
      x: number;
      width: number;
      animated: boolean;
    }>;
  }>,
  fixedLinks: {
    github: { prefix: "", width: 0, linkWidth: 0, x: 0, y: 0 },
    email: { prefix: "", width: 0, linkWidth: 0, x: 0, y: 0 }
  },
  rafId: 0,
  lastPaintAt: 0,
  animationStartedAt: 0,
  elapsedBeforePause: 0
};

const tokenRandom = mulberry32(landingSeed ^ 0x9e3779b9);
const fixedPrefixRandom = mulberry32(landingSeed ^ 0xc2b2ae35);

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function decodeBase64(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function makeToken(random: () => number) {
  const length = 2 + Math.floor(random() * 8);
  let token = "";

  for (let index = 0; index < length; index += 1) {
    token += glyphs[Math.floor(random() * glyphs.length)];
  }

  return token;
}

const tokenPool = Array.from({ length: 4096 }, () => makeToken(tokenRandom));

function buildParagraph(minimumCharacters: number) {
  const parts: string[] = [];
  let total = 0;
  let tokenIndex = 0;

  while (total < minimumCharacters) {
    const token = tokenPool[tokenIndex % tokenPool.length]!;
    parts.push(token);
    total += token.length + 1;
    tokenIndex += 1;
  }

  return parts.join(" ");
}

function measureTextObstacles(
  nodes: HTMLElement[],
  shellBounds: DOMRect
): Array<{ top: number; right: number; bottom: number }> {
  const gap = 2;

  return nodes.flatMap(node => {
    const range = document.createRange();
    range.selectNodeContents(node);

    const rects = Array.from(range.getClientRects())
      .filter(rect => rect.width > 0 && rect.height > 0)
      .map(rect => ({
        top: rect.top - shellBounds.top,
        right: rect.right - shellBounds.left + gap,
        bottom: rect.bottom - shellBounds.top
      }));

    if (rects.length > 0) {
      return rects;
    }

    const bounds = node.getBoundingClientRect();
    return [
      {
        top: bounds.top - shellBounds.top,
        right: bounds.right - shellBounds.left + gap,
        bottom: bounds.bottom - shellBounds.top
      }
    ];
  });
}

function buildFixedPrefix(segmentCount: number) {
  return `${Array.from(
    { length: segmentCount },
    () => makeToken(fixedPrefixRandom)
  ).join(" ")} `;
}

function getRowStartX(index: number) {
  const y = state.startY + index * state.lineHeight;
  const bandTop = y - state.lineHeight * 0.5;
  const bandBottom = y + state.lineHeight * 0.5;
  const overlappingObstacle = state.obstacles.reduce((right, obstacle) => {
    if (bandBottom >= obstacle.top && bandTop <= obstacle.bottom) {
      return Math.max(right, obstacle.right);
    }
    return right;
  }, 0);

  return overlappingObstacle > 0
    ? Math.min(state.width - 140, overlappingObstacle)
    : state.baseMinX;
}

function rebuildLines() {
  if (state.width === 0 || state.height === 0) {
    return;
  }

  const shellBounds = shell.getBoundingClientRect();
  state.obstacles = measureTextObstacles([name, role], shellBounds);

  state.lineHeight = Math.max(10, Math.floor(state.height / VISUALIZER_LINES));
  state.fontSize = Math.max(8, Math.round(state.lineHeight * 0.74));
  state.font = `400 ${state.fontSize}px "Xanh Mono"`;
  state.fixedLinksGap = Math.max(4, Math.round(state.fontSize * 0.35));

  state.targetLineCount = VISUALIZER_LINES;
  state.startY = state.lineHeight * 0.5;
  state.baseMinX = 0;

  const approximateColumns = Math.ceil(state.width / (state.fontSize * 0.58));
  const characterBudget = state.targetLineCount * approximateColumns * 5;

  // Follow the demo pattern: prepare once, then do cheap line routing in the hot path.
  state.prepared = prepareWithSegments(buildParagraph(characterBudget), state.font);

  positionFixedLinks();
  state.rows = buildRows();
}

function buildRows() {
  if (state.prepared === null) {
    return [] as Array<{
      index: number;
      y: number;
      segments: Array<{
        text: string;
        x: number;
        width: number;
        animated: boolean;
      }>;
    }>;
  }

  const rows: Array<{
    index: number;
    y: number;
    segments: Array<{
      text: string;
      x: number;
      width: number;
      animated: boolean;
    }>;
  }> = [];
  let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };

  for (let index = 0; index < state.targetLineCount; index += 1) {
    const y = state.startY + index * state.lineHeight;
    const rowStartX = getRowStartX(index);
    const fixedLink =
      index === GITHUB_ROW_INDEX
        ? state.fixedLinks.github
        : index === EMAIL_ROW_INDEX
          ? state.fixedLinks.email
          : null;
    const segments: Array<{
      text: string;
      x: number;
      width: number;
      animated: boolean;
    }> = [];
    
    if (fixedLink !== null) {
      segments.push({
        text: fixedLink.prefix,
        x: fixedLink.x - fixedLink.width,
        width: fixedLink.width,
        animated: false
      });

      const postLinkStartX = fixedLink.x + fixedLink.linkWidth + state.fixedLinksGap;
      const rightRoom = Math.max(120, state.width - postLinkStartX);
      const postLinkLine = layoutNextLine(state.prepared, cursor, rightRoom);

      if (postLinkLine === null) {
        break;
      }

      segments.push({
        text: postLinkLine.text,
        x: postLinkStartX,
        width: postLinkLine.width,
        animated: true
      });
      cursor = postLinkLine.end;
      rows.push({ index, y, segments });
      continue;
    }

    const rightRoom = Math.max(120, state.width - rowStartX);
    const line = layoutNextLine(state.prepared, cursor, rightRoom);

    if (line === null) {
      break;
    }

    segments.push({
      text: line.text,
      x: rowStartX,
      width: line.width,
      animated: true
    });
    cursor = line.end;
    rows.push({ index, y, segments });
  }

  return rows;
}

function positionFixedLinks() {
  if (state.prepared === null) {
    return;
  }

  ctx.font = state.font;
  fixedLinks.style.font = state.font;
  fixedLinks.style.lineHeight = `${state.lineHeight}px`;
  fixedLinkGithub.style.font = state.font;
  fixedLinkGithub.style.lineHeight = `${state.lineHeight}px`;
  fixedLinkEmail.style.font = state.font;
  fixedLinkEmail.style.lineHeight = `${state.lineHeight}px`;

  if (state.fixedLinks.github.prefix === "") {
    state.fixedLinks.github.prefix = buildFixedPrefix(GITHUB_SEGMENT_COUNT);
  }
  if (state.fixedLinks.email.prefix === "") {
    state.fixedLinks.email.prefix = buildFixedPrefix(EMAIL_SEGMENT_COUNT);
  }

  state.fixedLinks.github.width = ctx.measureText(
    state.fixedLinks.github.prefix
  ).width;
  state.fixedLinks.email.width = ctx.measureText(
    state.fixedLinks.email.prefix
  ).width;
  state.fixedLinks.github.x =
    getRowStartX(GITHUB_ROW_INDEX) + state.fixedLinks.github.width;
  state.fixedLinks.github.y = state.startY + GITHUB_ROW_INDEX * state.lineHeight;
  state.fixedLinks.email.x =
    getRowStartX(EMAIL_ROW_INDEX) + state.fixedLinks.email.width;
  state.fixedLinks.email.y = state.startY + EMAIL_ROW_INDEX * state.lineHeight;
  state.minX = Math.max(state.fixedLinks.github.x, state.fixedLinks.email.x);

  fixedLinkGithub.style.left = `${state.fixedLinks.github.x}px`;
  fixedLinkGithub.style.top = `${state.fixedLinks.github.y}px`;
  fixedLinkGithub.style.transform = "translateY(-50%)";
  fixedLinkEmail.style.left = `${state.fixedLinks.email.x}px`;
  fixedLinkEmail.style.top = `${state.fixedLinks.email.y}px`;
  fixedLinkEmail.style.transform = "translateY(-50%)";
  state.fixedLinks.github.linkWidth = Math.ceil(
    fixedLinkGithub.getBoundingClientRect().width
  );
  state.fixedLinks.email.linkWidth = Math.ceil(
    fixedLinkEmail.getBoundingClientRect().width
  );
  fixedLinks.classList.add("is-ready");
}

function resizeCanvas(force = false) {
  const landingBounds = landing.getBoundingClientRect();
  const introBounds = intro.getBoundingClientRect();
  const lineHeight = Math.round(clamp(introBounds.height / 7, 10, 16));
  const desiredHeight = VISUALIZER_LINES * lineHeight;
  const introCenter =
    introBounds.top - landingBounds.top + introBounds.height * 0.5;
  const top = Math.round(introCenter - desiredHeight * 0.5);

  shell.style.top = `${top}px`;
  shell.style.height = `${desiredHeight}px`;
  shell.style.bottom = "auto";

  const bounds = shell.getBoundingClientRect();
  const width = Math.round(bounds.width);
  const height = Math.round(bounds.height);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  if (
    !force &&
    width === state.width &&
    height === state.height &&
    dpr === state.dpr &&
    lineHeight === state.lineHeight
  ) {
    return;
  }

  state.width = width;
  state.height = height;
  state.dpr = dpr;
  state.lineHeight = lineHeight;

  canvas.width = Math.max(1, Math.round(state.width * state.dpr));
  canvas.height = Math.max(1, Math.round(state.height * state.dpr));

  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  rebuildLines();
}

function getRowEnergy(rowIndex: number, elapsedMs: number) {
  const bandIndex = AUDIO_BAND_BY_ROW[rowIndex] ?? 0;
  const slowedElapsedMs = elapsedMs * VISUALIZER_PLAYBACK_RATE;
  const framePosition =
    ((slowedElapsedMs % visualizerAudioProfile.durationMs) / 1000) *
    visualizerAudioProfile.frameRate;
  const frameIndex = Math.floor(framePosition) % visualizerAudioProfile.frameCount;
  const nextFrameIndex = (frameIndex + 1) % visualizerAudioProfile.frameCount;
  const mix = framePosition - frameIndex;
  const bandOffset = bandIndex * visualizerAudioProfile.frameCount;
  const current = (audioEnergyBytes[bandOffset + frameIndex] ?? 0) / 255;
  const next = (audioEnergyBytes[bandOffset + nextFrameIndex] ?? 0) / 255;

  return current + (next - current) * mix;
}

function draw(now: number) {
  state.rafId = requestAnimationFrame(draw);

  if (now - state.lastPaintAt < 32) {
    return;
  }

  state.lastPaintAt = now;

  ctx.clearRect(0, 0, state.width, state.height);
  ctx.font = state.font;
  ctx.textBaseline = "middle";
  const elapsedMs = state.elapsedBeforePause + (now - state.animationStartedAt);

  for (let index = 0; index < state.rows.length; index += 1) {
    const row = state.rows[index]!;
    const bandEnergy = getRowEnergy(row.index, elapsedMs);
    const energy = clamp(0.12 + bandEnergy * 0.88, 0.12, 1);
    const shade = Math.round(148 + bandEnergy * 26);
    const alpha = 0.28 + bandEnergy * 0.5;

    ctx.fillStyle = `rgba(${shade}, ${shade}, ${shade}, ${alpha})`;

    for (let segmentIndex = 0; segmentIndex < row.segments.length; segmentIndex += 1) {
      const segment = row.segments[segmentIndex]!;
      const visibleWidth = segment.animated
        ? Math.max(0, segment.width * energy)
        : segment.width;

      if (visibleWidth <= 0) {
        continue;
      }

      ctx.save();
      ctx.beginPath();
      ctx.rect(
        segment.x,
        row.y - state.lineHeight * 0.6,
        visibleWidth,
        state.lineHeight * 1.2
      );
      ctx.clip();
      ctx.fillText(segment.text, segment.x, row.y);
      ctx.restore();
    }
  }
}

function setAnimationRunning(shouldRun: boolean) {
  if (shouldRun) {
    if (state.rafId === 0) {
      state.animationStartedAt = performance.now();
      state.lastPaintAt = 0;
      state.rafId = requestAnimationFrame(draw);
    }
    return;
  }

  if (state.rafId !== 0) {
    state.elapsedBeforePause += performance.now() - state.animationStartedAt;
    state.animationStartedAt = 0;
    cancelAnimationFrame(state.rafId);
    state.rafId = 0;
  }
}

async function start() {
  await Promise.all([
    document.fonts.ready,
    document.fonts.load('400 24px "Xanh Mono"')
  ]);

  resizeCanvas(true);

  const observer = new ResizeObserver(() => resizeCanvas(true));
  observer.observe(shell);
  observer.observe(intro);
  observer.observe(name);
  observer.observe(role);

  document.addEventListener("visibilitychange", () => {
    setAnimationRunning(document.visibilityState === "visible");
  });
  setAnimationRunning(document.visibilityState === "visible");
}

start();
