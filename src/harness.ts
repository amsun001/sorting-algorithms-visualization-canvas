console.log("⚙️ [harness] installed (v4.1)");

interface DrawCall {
  readonly kind: "fillRect" | "rect" | "strokeRect" | "clearRect";
  readonly args: readonly number[];
  readonly fillStyle?: string;
  readonly t: number;
}

const drawLog: DrawCall[] = [];
let lastSequence: DrawCall[] = [];
let sawDraw = false;

const nativeSetTimeout = window.setTimeout.bind(window);
const nativeClearTimeout = window.clearTimeout.bind(window);
const nativeRAF = window.requestAnimationFrame.bind(window);
const nativeCancelRAF = window.cancelAnimationFrame.bind(window);
const pending = new Set<number>();
let settleTimer: number | undefined;

function isWipe(c: DrawCall): boolean {
  return c.kind === "clearRect" || c.args[2] >= 50;
}

function lastPaint(): DrawCall[] {
  let start = -1;
  for (let i = lastSequence.length - 1; i >= 0; i--) {
    if (isWipe(lastSequence[i])) { start = i; break; }
  }
  return lastSequence.slice(start + 1).filter((c) => !isWipe(c));
}

// Fixed detection rule (decided before scoring): rendered height = -(drawn height);
// desync = any element-wise difference at a settled point.
function compare(modelValues: readonly number[]): { match: boolean; firstMismatch: number } {
  const rendered = lastPaint().map((c) => -c.args[3]);
  const n = Math.max(modelValues.length, rendered.length);
  for (let i = 0; i < n; i++) {
    if (modelValues[i] !== rendered[i]) return { match: false, firstMismatch: i };
  }
  return { match: true, firstMismatch: -1 };
}

function scheduleSettledCheck(): void {
  if (settleTimer !== undefined) nativeClearTimeout(settleTimer);
  settleTimer = nativeSetTimeout(() => {
    if (pending.size === 0 && sawDraw) {
      lastSequence = drawLog.slice();
      console.log("[harness] ✅ TRULY SETTLED; draw calls in sequence:", lastSequence.length);
      sawDraw = false;
      drawLog.length = 0;
    }
    settleTimer = undefined;
  }, 200);
}

type Ctx2D = CanvasRenderingContext2D;
const kinds = ["fillRect", "rect", "strokeRect", "clearRect"] as const;
const proto = CanvasRenderingContext2D.prototype as unknown as Record<
  (typeof kinds)[number],
  (x: number, y: number, w: number, h: number) => void
>;
for (const kind of kinds) {
  const native = proto[kind];
  proto[kind] = function (this: Ctx2D, x: number, y: number, w: number, h: number): void {
    sawDraw = true;
    drawLog.push({ kind, args: [x, y, w, h], fillStyle: String(this.fillStyle), t: performance.now() });
    scheduleSettledCheck();
    native.call(this, x, y, w, h);
  };
}

window.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]): number => {
  const id = nativeSetTimeout(() => {
    pending.delete(id);
    if (typeof handler === "function") (handler as (...a: unknown[]) => void)(...args);
    scheduleSettledCheck();
  }, timeout);
  pending.add(id);
  return id;
}) as typeof window.setTimeout;

// v4.1: cancelled work must leave the pending set, or settled never fires
window.clearTimeout = (id?: number): void => {
  if (id !== undefined) pending.delete(id);
  nativeClearTimeout(id);
};

window.cancelAnimationFrame = (id: number): void => {
  pending.delete(id);
  nativeCancelRAF(id);
};

window.requestAnimationFrame = (cb: FrameRequestCallback): number => {
  const id = nativeRAF((t: number) => {
    pending.delete(id);
    cb(t);
    scheduleSettledCheck();
  });
  pending.add(id);
  return id;
};

(window as unknown as { __harness?: unknown }).__harness = {
  get drawLog() { return drawLog; },
  get lastSequence() { return lastSequence; },
  lastPaint,
  compare,
  isIdle: () => pending.size === 0,
};