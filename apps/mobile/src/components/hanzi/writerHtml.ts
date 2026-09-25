import { HANZI_WRITER_ENGINE_JS } from "./hanziWriterEngine"

/**
 * Static HTML loaded into each glyph's WebView. hanzi-writer draws into real
 * SVG/DOM, which only exists inside the WebView — everything from creating the
 * writer to the quiz/demo lifecycle and the "first stroke" hint overlay for
 * blind quiz mode runs in here. The RN side only sends an `init` (with this
 * glyph's stroke data, looked up on the RN side) and a `start` message, and
 * listens for the handful of events posted back — see HanziStage.tsx.
 */
export const WRITER_HTML = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>
  html, body { margin: 0; padding: 0; background: transparent; overflow: hidden; }
  #guides { position: absolute; inset: 0; pointer-events: none; }
  #target { position: absolute; inset: 0; }
  #hint { position: absolute; inset: 0; pointer-events: none; }

  /*
   * hanzi-writer parses strokeColor as a real colour (it interpolates it during
   * animation), so a paint-server reference can't be passed as an option — it
   * throws "Invalid color". Instead it writes the flat colour into each path's
   * fill *attribute*, and we swap that for the gradient here: a CSS declaration
   * always beats a presentation attribute. Matching on the exact colour keeps
   * this off the grey target glyph underneath. The drop shadow is what gives the
   * finished strokes their raised, 3D look.
   */
  #target path[fill="#22c55e"] {
    fill: url(#strokeGrad) !important;
    filter: drop-shadow(0 2px 2px rgba(6, 78, 59, 0.32));
  }
  #target path[fill="#16a34a"] {
    fill: url(#radicalGrad) !important;
    filter: drop-shadow(0 2px 2px rgba(6, 78, 59, 0.32));
  }

  /*
   * "Placing" a stroke, Skritter-style. The stroke the learner just drew drops
   * the last few pixels into position with a slight overshoot, so it reads as
   * being set down onto the character. Only that one path animates — the strokes
   * already written stay put, which is what keeps this from looking like the
   * whole glyph bouncing.
   *
   * --place-dy is written from JS: CSS transforms on an SVG path work in the
   * character's own 1024-unit space, not CSS pixels, so a fixed value here would
   * scale with the stage size and be nearly invisible at normal sizes.
   */
  @keyframes strokePlace {
    0%   { transform: translateY(calc(var(--place-dy) * -1)) scale(1.03); opacity: 0.72; }
    60%  { transform: translateY(calc(var(--place-dy) * 0.28)) scale(1.004); opacity: 1; }
    100% { transform: translateY(0) scale(1); opacity: 1; }
  }
  #target path.stroke-place {
    transform-box: fill-box;
    transform-origin: 50% 50%;
    animation: strokePlace 330ms cubic-bezier(0.22, 1, 0.36, 1) both;
  }
</style>
</head>
<body>
<svg id="guides"></svg>
<div id="target"></div>
<svg id="hint" style="display:none"><path id="hint-path" fill="#22c55e" fill-opacity="0.32" /></svg>
<svg width="0" height="0" style="position:absolute">
  <defs>
    <!-- Top-lit jade gradient: light crest, saturated body, dark underside. -->
    <linearGradient id="strokeGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#5fe08a" />
      <stop offset="45%" stop-color="#22c55e" />
      <stop offset="100%" stop-color="#12833f" />
    </linearGradient>
    <linearGradient id="radicalGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#4bd97c" />
      <stop offset="45%" stop-color="#16a34a" />
      <stop offset="100%" stop-color="#0d6a32" />
    </linearGradient>
  </defs>
</svg>
<script>${HANZI_WRITER_ENGINE_JS}</script>
<script>
(function () {
  var writer = null;
  var mode = 'demo';
  var hintShown = false;
  // hanzi-writer doesn't expose how far through a quiz you are, so we count
  // correct strokes ourselves to know which one a hint should highlight.
  var strokeIndex = 0;
  // Stage size in CSS px, kept so the stroke-placement nudge can be expressed in
  // the character's own coordinate space (see placeNewestStroke).
  var stageSize = 0;

  /*
   * Misses on one stroke before hanzi-writer highlights it for the learner. It
   * gives no callback for that moment, so the same threshold is used to count
   * misses here and announce it — keep the two in step.
   */
  var HINT_AFTER_MISSES = 3;
  // Whether to leave the finished character painted once a quiz completes.
  var holdOnComplete = false;

  function post(payload) {
    var json = JSON.stringify(payload);
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(json);
    } else if (window.parent && window.parent !== window) {
      // Web fallback: this HTML is running inside a plain <iframe> (no react-native-webview
      // bridge exists there), so post straight to the parent window instead.
      window.parent.postMessage(json, '*');
    }
  }

  /*
   * Animates the stroke that was just completed, and only that one.
   *
   * hanzi-writer paints finished strokes as <path> elements carrying the exact
   * stroke/radical colours configured below, so the newest one is the last such
   * path in the DOM. It's re-tagged on every correct stroke; earlier strokes keep
   * no animation class, so they stay stationary.
   *
   * The displacement is converted from CSS pixels into the character's 1024-unit
   * space, because CSS transforms on an SVG path are applied in user units.
   */
  function placeNewestStroke() {
    var paths = document.querySelectorAll('#target path[fill="#22c55e"], #target path[fill="#16a34a"]');
    if (!paths.length) return;
    var newest = paths[paths.length - 1];

    var NUDGE_PX = 5; // within the 3-6px the effect is legible at, without wobbling
    var unitsPerPx = stageSize > 0 ? 1024 / stageSize : 5;
    newest.style.setProperty('--place-dy', (NUDGE_PX * unitsPerPx).toFixed(2) + 'px');

    // Restart the animation if this element somehow already carries the class.
    newest.classList.remove('stroke-place');
    void newest.getBoundingClientRect();
    newest.classList.add('stroke-place');
  }

  function showHint(size, padding, firstStrokePath) {
    var svg = document.getElementById('hint');
    var path = document.getElementById('hint-path');
    var transform = HanziWriter.getScalingTransform(size, size, padding).transform;
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
    path.setAttribute('transform', transform);
    path.setAttribute('d', firstStrokePath);
    svg.style.display = 'block';
    hintShown = true;
  }

  function hideHint() {
    if (!hintShown) return;
    document.getElementById('hint').style.display = 'none';
    hintShown = false;
  }

  /** Draws the 米字格 practice grid — centre cross plus both diagonals — behind the glyph. */
  function drawGuides(size) {
    var svg = document.getElementById('guides');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
    var mid = size / 2;
    var lines = [
      [0, mid, size, mid],
      [mid, 0, mid, size],
      [0, 0, size, size],
      [size, 0, 0, size],
    ];
    svg.innerHTML = lines
      .map(function (l) {
        return (
          '<line x1="' + l[0] + '" y1="' + l[1] + '" x2="' + l[2] + '" y2="' + l[3] +
          '" stroke="#e2e2dd" stroke-width="1" stroke-dasharray="6 6" />'
        );
      })
      .join('');
  }

  function handleMessage(event) {
    var msg;
    try {
      msg = JSON.parse(event.data);
    } catch (e) {
      return;
    }

    if (msg.type === 'init') {
      mode = msg.mode;
      stageSize = msg.size;
      var speedScale = msg.speed === 'slow' ? 0.5 : 1;
      holdOnComplete = !!msg.holdCharacterOnComplete;
      document.getElementById('target').innerHTML = '';
      hideHint();
      if (msg.showGuides) drawGuides(msg.size);

      writer = HanziWriter.create('target', msg.char, {
        width: msg.size,
        height: msg.size,
        padding: msg.padding,
        charDataLoader: function () {
          return Promise.resolve(msg.strokeData);
        },
        showOutline: msg.showOutline,
        showCharacter: false,
        // Demo playback runs at 70% of what it used to (speed 3.5, 60ms gap):
        // fast enough not to drag, slow enough to actually follow a stroke as
        // it's drawn. The inter-stroke gap is stretched by the same factor so
        // the whole animation slows evenly rather than just the strokes.
        //
        // "Slow" halves that again, and stretches the gap between strokes by
        // more than it slows the strokes themselves — the pause is where you
        // work out where the next stroke starts, which is the part that's too
        // quick when you're trying to copy along by hand.
        strokeAnimationSpeed: (mode === 'demo' ? 2.45 : 1) * speedScale,
        strokeFadeDuration: 200,
        delayBetweenStrokes: Math.round((mode === 'demo' ? 86 : 250) / speedScale),
        // These exact values are the hooks the gradient CSS above matches on —
        // change one and you must change the corresponding selector too.
        strokeColor: '#22c55e',
        radicalColor: '#16a34a',
        outlineColor: '#dedede',
        highlightColor: '#ff6b6b',
        drawingColor: '#0f172a',
        drawingWidth: msg.drawingWidth,
        strokeWidth: msg.strokeWidth,
        outlineWidth: msg.strokeWidth,
        showHintAfterMisses: HINT_AFTER_MISSES,
        // Off deliberately: hanzi-writer flashes the finished character in
        // highlightColor, which is the coral we use for errors — so completing a
        // word looked like it had just been marked wrong.
        highlightOnComplete: false,
        // Grades on general stroke shape and direction rather than precision.
        // hanzi-writer's default is 1; 1.2 was still rejecting strokes that were
        // recognisably the right form.
        leniency: 2.2,
        onLoadCharDataSuccess: function (data) {
          if (msg.showStartHint && data.strokes[0]) {
            showHint(msg.size, msg.padding, data.strokes[0]);
          }
          post({ type: 'loadSuccess' });
        },
        onLoadCharDataError: function () {
          post({ type: 'loadError' });
        },
      });
    } else if (msg.type === 'hint') {
      // Flashes the stroke the learner is currently expected to draw.
      if (writer) writer.highlightStroke(strokeIndex);
    } else if (msg.type === 'reveal') {
      if (writer) writer.showCharacter();
    } else if (msg.type === 'start') {
      if (!writer) return;
      if (mode === 'demo') {
        writer.animateCharacter({
          onComplete: function () {
            /*
             * Same reason as the quiz branch below: hanzi-writer fades the
             * strokes it drew once the animation ends, so a screen that stays
             * on the finished character was left showing the faint grey
             * outline. Opt-in, because the review flashcard wants exactly that
             * fade before it moves on — but the writing guide's whole page is
             * built around the green character being *there*.
             */
            if (holdOnComplete) writer.showCharacter();
            post({ type: 'demoComplete' });
          },
        });
      } else {
        strokeIndex = 0;
        writer.quiz({
          onMistake: function (strokeData) {
            /*
             * Announced on the miss that first trips hanzi-writer's own hint and
             * on every miss after it, so the gong keeps sounding for as long as
             * the learner keeps missing the same stroke. Resets naturally: the
             * count is per-stroke, so moving on starts the tally again.
             */
            if (strokeData.mistakesOnStroke >= HINT_AFTER_MISSES) {
              post({ type: 'strokeHint' });
            }
          },
          onCorrectStroke: function (strokeData) {
            hideHint();
            strokeIndex += 1;
            // Deferred a frame: hanzi-writer appends the finished stroke's path
            // during this callback, so querying synchronously can still find the
            // previous stroke as the last one.
            requestAnimationFrame(placeNewestStroke);
            post({
              type: 'correctStroke',
              strokesRemaining: strokeData.strokesRemaining,
              totalMistakes: strokeData.totalMistakes,
            });
          },
          onComplete: function (summary) {
            /*
             * hanzi-writer fades the drawn strokes back out when a quiz ends,
             * which leaves the learner staring at the faint grey outline the
             * instant they finish — exactly when they want to see what they
             * just wrote. Repainting the character puts it back in the stroke
             * colour and keeps it there.
             */
            if (holdOnComplete) writer.showCharacter();
            post({ type: 'quizComplete', totalMistakes: summary.totalMistakes });
          },
        });
      }
    }
  }

  document.addEventListener('message', handleMessage);
  window.addEventListener('message', handleMessage);

  post({ type: 'ready' });
})();
</script>
</body>
</html>`
