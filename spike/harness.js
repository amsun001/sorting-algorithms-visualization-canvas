"use strict";
console.log("⚙️ [harness] installed (v4.1)");
const drawLog = [];
let lastSequence = [];
let sawDraw = false;
const nativeSetTimeout = window.setTimeout.bind(window);
const nativeClearTimeout = window.clearTimeout.bind(window);
const nativeRAF = window.requestAnimationFrame.bind(window);
const nativeCancelRAF = window.cancelAnimationFrame.bind(window);
const pending = new Set();
let settleTimer;
function isWipe(c) {
    return c.kind === "clearRect" || c.args[2] >= 50;
}
function lastPaint() {
    let start = -1;
    for (let i = lastSequence.length - 1; i >= 0; i--) {
        if (isWipe(lastSequence[i])) {
            start = i;
            break;
        }
    }
    return lastSequence.slice(start + 1).filter((c) => !isWipe(c));
}
// Fixed detection rule (decided before scoring): rendered height = -(drawn height);
// desync = any element-wise difference at a settled point.
function compare(modelValues) {
    const rendered = lastPaint().map((c) => -c.args[3]);
    const n = Math.max(modelValues.length, rendered.length);
    for (let i = 0; i < n; i++) {
        if (modelValues[i] !== rendered[i])
            return { match: false, firstMismatch: i };
    }
    return { match: true, firstMismatch: -1 };
}
function scheduleSettledCheck() {
    if (settleTimer !== undefined)
        nativeClearTimeout(settleTimer);
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
const kinds = ["fillRect", "rect", "strokeRect", "clearRect"];
const proto = CanvasRenderingContext2D.prototype;
for (const kind of kinds) {
    const native = proto[kind];
    proto[kind] = function (x, y, w, h) {
        sawDraw = true;
        drawLog.push({ kind, args: [x, y, w, h], fillStyle: String(this.fillStyle), t: performance.now() });
        scheduleSettledCheck();
        native.call(this, x, y, w, h);
    };
}
window.setTimeout = ((handler, timeout, ...args) => {
    const id = nativeSetTimeout(() => {
        pending.delete(id);
        if (typeof handler === "function")
            handler(...args);
        scheduleSettledCheck();
    }, timeout);
    pending.add(id);
    return id;
});
// v4.1: cancelled work must leave the pending set, or settled never fires
window.clearTimeout = (id) => {
    if (id !== undefined)
        pending.delete(id);
    nativeClearTimeout(id);
};
window.cancelAnimationFrame = (id) => {
    pending.delete(id);
    nativeCancelRAF(id);
};
window.requestAnimationFrame = (cb) => {
    const id = nativeRAF((t) => {
        pending.delete(id);
        cb(t);
        scheduleSettledCheck();
    });
    pending.add(id);
    return id;
};
window.__harness = {
    get drawLog() { return drawLog; },
    get lastSequence() { return lastSequence; },
    lastPaint,
    compare,
    isIdle: () => pending.size === 0,
};
