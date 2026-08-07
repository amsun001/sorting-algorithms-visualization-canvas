# Log: What Didn't Work

Standing record (supervisor mandate A.4): breakages and dead ends, dated as they
happen. Research/measurement only — tooling setup noise is not recorded.

---

**[date] · v1 idle check fired 3,542 false "settled" events.**
Detecting settled as "pending set empty" broke: in a `draw; await delay` loop,
`pending` is genuinely 0 between every step (next timer is scheduled a microtask
later). → Debounced: settled = 200 ms with no draws and no pending work
(200 ms > longest inter-step gap, 100 ms). *Lesson: "nothing pending now" ≠
"finished"; idle needs a silence window.*

**[date] · The harness wiped its own evidence.**
Render side read empty after settling; model read fine. Cause: the settle
handler ran `drawLog.length = 0` before the comparison could read it. →
Snapshot `lastSequence = drawLog.slice()` before clearing; expose via getters.
*Lesson: an instrument must not destroy its evidence at the measurement point.*

**[date] · Bars aren't drawn with `fillRect` — wrong API coverage.**
`lastPaint()` returned `[]`; the tail showed only full-screen wipes, no bars.
The app draws bars via `rect()` with a **negative height**; coverage had been
assumed, not derived. → v4 wraps all geometry (`fillRect/rect/strokeRect/
clearRect`); fixed rules: bar = width < 50, wipe = `clearRect` or width ≥ 50,
value = −(drawn height). 60 bars captured, exact match under sign flip.
*Lesson: coverage and normalization must come from the app's real render path.*

**[date] · No positive control — sensitivity unproven.**
Only clean code tested (`match:true`); an always-"match" instrument would have
passed identically. → Added positive control: perturb one model value →
`match:false, firstMismatch:0`. Also wrapped `clearTimeout/cancelAnimationFrame`
(preventive; the cancellation fault would otherwise break idle detection
silently). *Lesson: a match-only demo proves nothing; ship both controls.*

**[date] · "Settled" as implemented is global idle, not the seed's per-step definition.**
The 200 ms detector finds only the animation's end (2 events/run). The seed
defines settled *per step* and rejects "screen stops moving"; per-step points
are unreachable by silence detection here (gaps 3–100 ms < 200 ms). So transient
desyncs (e.g. heapSort's red→white lag) are invisible at global idle — the same
blind spot as the visual baseline. Also: the seed's own suggested mechanism
(wrap rAF/setTimeout) can't produce its own per-step definition in a setTimeout
app; reconciling needs a `paintItems` wrap. → Recorded as the next spike /
September agenda item; Criterion 1 as shown covers geometry at global idle only.
*Lesson: global idle is a weaker property than per-step settled — not an
"approximation."*

**[date] · Positive control is Way A, not Way B.**
It perturbed the model *after* capture and compared against the real captured
render — proving the comparator, paint extraction, and sign flip fail at the
right index. It does **not** prove the harness catches a fault the *app*
produced through the full pipeline (Way B). → Claim Way A only; Way B arrives by
construction at the first seeded desync in 3.2.

**[date] · Criterion 1 as demonstrated covers geometry, not colour.**
The comparator checks heights only. The app's transient disagreement is in
colour (red→white lag), which is *intended* highlighting — a colour comparator
without a fixed per-boundary rule would flag clean code. Colour also has no
public getter. → Geometry-only, stated plainly; colour deferred until its
semantic rule is fixed before scoring.

---
Note: colour is not decorative here — red/blue/white are the app's primary teaching signals (which items are being compared vs. settled), so deferring colour is a known limitation to revisit, not a closed decision. It is deferred only because correct scoring needs a fixed per-boundary semantic rule (the app resets colour after its final paint of a step, so model and render legitimately disagree on colour at the sampling instant); it is not dropped.

## Carried forward to Phase 1.2 (notes, not failures)
- Separate sets for `setTimeout` vs `requestAnimationFrame` ids — shared id
  space isn't guaranteed; collision corrupts idle detection.
- `lastSequence` holds the whole run (~52–60k calls); bound memory for larger
  inputs.
- 200 ms and width < 50 are app-derived constants — document as such.
- `__manager` hook lives on the spike branch; every Axis 2 fault branch forks
  from `v-clean-reference` without it — re-apply per branch (script it).
- Per-step model capture: choose (a) `paintItems` wrapper snapshotting a *copy*
  of values, or (b) harness-driven step-forward control — decide before
  building; that choice, not the trigger, is the hard part.
