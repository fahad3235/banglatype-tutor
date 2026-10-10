/* BanglaType Tutor — engine.
   - Grapheme-aware comparison via Intl.Segmenter (correct for Bangla conjuncts
     like ক্ষ = ক + ্ + ষ, which render as one glyph).
   - WPM = (correct chars / 5) / minutes elapsed (net WPM).
   - Test override for QA: ?t=5s or ?t=90 shortens the timer (documented in README).
*/
'use strict';

(function () {
  const $ = (id) => document.getElementById(id);

  /* ---------- storage (guarded: private mode etc.) ---------- */
  const store = {
    ok: true,
    get(k, fb) {
      try {
        const v = localStorage.getItem(k);
        return v === null ? fb : JSON.parse(v);
      } catch (e) { this.ok = false; return fb; }
    },
    set(k, v) {
      try { localStorage.setItem(k, JSON.stringify(v)); }
      catch (e) { this.ok = false; }
    },
    del(k) { try { localStorage.removeItem(k); } catch (e) { this.ok = false; } },
  };

  /* ---------- graphemes ---------- */
  let segmenter = null;
  try {
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    }
  } catch (e) { segmenter = null; }
  function graphemes(s) {
    if (segmenter) {
      const out = [];
      for (const seg of segmenter.segment(s)) out.push(seg.segment);
      return out;
    }
    return Array.from(s);
  }

  /* ---------- state ---------- */
  const state = {
    ui: store.get('btt.ui', 'en'),
    lessonLang: 'bn',
    lessonIdx: 0,
    duration: 60,
    target: [],
    started: false,
    finished: false,
    startTime: 0,
    tickId: null,
    correct: 0,
    typed: 0,
  };

  function lessons() {
    return state.lessonLang === 'bn' ? LESSONS_BN : LESSONS_EN;
  }
  function lesson() {
    return lessons()[state.lessonIdx];
  }
  function T(key) {
    return (UI_STRINGS[state.ui] && UI_STRINGS[state.ui][key]) || UI_STRINGS.en[key] || key;
  }

  /* ---------- i18n ---------- */
  function applyI18n() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = T(el.getAttribute('data-i18n'));
    });
    document.documentElement.lang = state.ui === 'bn' ? 'bn' : 'en';
    $('uiBn').classList.toggle('active', state.ui === 'bn');
    $('uiEn').classList.toggle('active', state.ui === 'en');
    renderHistory();
  }

  /* ---------- lesson grid ---------- */
  function renderGrid() {
    const grid = $('lessonGrid');
    grid.innerHTML = '';
    lessons().forEach((l, i) => {
      const best = store.get('btt.best.' + l.id, null);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'lesson-card' + (i === state.lessonIdx ? ' active' : '');
      const title = document.createElement('span');
      title.className = 'lesson-title';
      title.textContent = (state.ui === 'bn' ? l.title.bn : l.title.en);
      btn.appendChild(title);
      const meta = document.createElement('span');
      meta.className = 'lesson-meta';
      meta.textContent = 'Lv ' + l.level + (best ? ' · ★ ' + best.wpm + ' ' + T('wpm') : '');
      btn.appendChild(meta);
      btn.addEventListener('click', () => selectLesson(i));
      grid.appendChild(btn);
    });
  }

  /* ---------- typing surface ---------- */
  function selectLesson(i) {
    state.lessonIdx = i;
    state.target = graphemes(lesson().text);
    state.started = false;
    state.finished = false;
    state.correct = 0;
    state.typed = 0;
    clearInterval(state.tickId);
    $('typeInput').value = '';
    $('typeInput').disabled = false;
    $('typeEmpty').classList.remove('hidden');
    renderTarget([]);
    renderGrid();
    $('statLesson').textContent = state.ui === 'bn' ? lesson().title.bn : lesson().title.en;
    updateStats(0, 0);
    $('statTime').textContent = fmtTime(state.duration);
    hideModal();
  }

  function renderTarget(typedG) {
    const box = $('typeText');
    box.innerHTML = '';
    const frag = document.createDocumentFragment();
    state.target.forEach((g, i) => {
      const s = document.createElement('span');
      s.className = 'ch';
      s.textContent = g;
      if (i < typedG.length) {
        s.classList.add(typedG[i] === g ? 'ok' : 'bad');
      } else if (i === typedG.length && !state.finished) {
        s.classList.add('cur');
      }
      frag.appendChild(s);
    });
    box.appendChild(frag);
  }

  function onInput() {
    if (state.finished) return;
    const input = $('typeInput');
    let val = input.value;
    // Normalize: cap at target length (grapheme-aware), drop newlines.
    let g = graphemes(val.replace(/[\r\n]+/g, ''));
    if (g.length > state.target.length) {
      g = g.slice(0, state.target.length);
      input.value = g.join('');
    }
    if (!state.started && g.length > 0) startTimer();
    if (g.length === 0 && state.started && !state.finished) {
      // user cleared the field: reset the clock
      resetClock();
    }
    let correct = 0;
    for (let i = 0; i < g.length; i++) {
      if (g[i] === state.target[i]) correct++;
    }
    state.correct = correct;
    state.typed = g.length;
    $('typeEmpty').classList.add('hidden');
    renderTarget(g);
    updateStats(correct, g.length);
    if (g.length >= state.target.length) finish(true);
  }

  function updateStats(correct, typedCount) {
    const mins = state.started ? Math.max((Date.now() - state.startTime) / 60000, 1 / 3600) : 0;
    const wpm = mins > 0 ? Math.round((correct / 5) / mins) : 0;
    const acc = typedCount > 0 ? (correct / typedCount) * 100 : 100;
    $('statWpm').textContent = String(wpm);
    $('statAcc').textContent = acc.toFixed(1).replace(/\.0$/, '') + '%';
    state._wpm = wpm;
    state._acc = acc;
  }

  function fmtTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m + ':' + String(s).padStart(2, '0');
  }

  function startTimer() {
    state.started = true;
    state.startTime = Date.now();
    state.tickId = setInterval(() => {
      const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
      const left = Math.max(state.duration - elapsed, 0);
      $('statTime').textContent = fmtTime(left);
      if (left <= 0) finish(false);
    }, 250);
  }

  function resetClock() {
    clearInterval(state.tickId);
    state.started = false;
    updateStats(0, 0);
    $('statTime').textContent = fmtTime(state.duration);
  }

  function finish(completedText) {
    if (state.finished) return;
    state.finished = true;
    clearInterval(state.tickId);
    $('typeInput').disabled = true;
    $('statTime').textContent = fmtTime(0);
    renderTarget(graphemes($('typeInput').value));
    showResults(completedText);
  }

  /* ---------- results + persistence ---------- */
  function showResults() {
    const wpm = state._wpm || 0;
    const acc = state._acc || 0;
    $('resWpm').textContent = String(wpm);
    $('resAcc').textContent = acc.toFixed(1).replace(/\.0$/, '') + '%';
    $('resGood').textContent = String(state.correct);
    $('resBad').textContent = String(state.typed - state.correct);
    const name = (state.ui === 'bn' ? lesson().title.bn : lesson().title.en);
    $('resLesson').textContent = name + ' · ' + fmtTime(state.duration) + ' · ' + T('testComplete');

    let isBest = false;
    if (store.ok) {
      const key = 'btt.best.' + lesson().id;
      const prev = store.get(key, null);
      if (!prev || wpm > prev.wpm) {
        store.set(key, { wpm, acc: Math.round(acc * 10) / 10, d: new Date().toISOString() });
        isBest = wpm > 0;
      }
      const hist = store.get('btt.history', []);
      hist.push({ d: new Date().toISOString(), lesson: lesson().id, title: name,
                  dur: state.duration, wpm, acc: Math.round(acc * 10) / 10 });
      store.set('btt.history', hist.slice(-50));
    }
    $('bestBadge').classList.toggle('hidden', !isBest);
    $('modal').classList.remove('hidden');
    renderGrid();
    renderHistory();
  }

  function hideModal() {
    $('modal').classList.add('hidden');
  }

  function renderHistory() {
    const hist = store.get('btt.history', []);
    const wrap = $('historyWrap');
    const empty = $('historyEmpty');
    if (!hist.length) {
      wrap.classList.add('hidden');
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    wrap.classList.remove('hidden');
    const body = $('historyBody');
    body.innerHTML = '';
    hist.slice(-12).reverse().forEach((h) => {
      const tr = document.createElement('tr');
      const dt = new Date(h.d);
      const cells = [
        dt.toLocaleDateString(state.ui === 'bn' ? 'bn-BD' : 'en-GB',
                              { day: '2-digit', month: 'short' }),
        h.title,
        fmtTime(h.dur),
        String(h.wpm),
        h.acc + '%',
      ];
      cells.forEach((c) => {
        const td = document.createElement('td');
        td.textContent = c;
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
  }

  /* ---------- events ---------- */
  function init() {
    // Test hook: ?t=5s or ?t=90 shortens the timer (documented in README).
    const m = /[?&]t=(\d+)(s?)/.exec(location.search);
    if (m) state.duration = parseInt(m[1], 10);

    document.querySelectorAll('.dur').forEach((b) => {
      b.addEventListener('click', () => {
        document.querySelectorAll('.dur').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
        state.duration = parseInt(b.getAttribute('data-dur'), 10);
        if (!state.started) $('statTime').textContent = fmtTime(state.duration);
      });
    });

    $('tabBn').addEventListener('click', () => setLessonLang('bn'));
    $('tabEn').addEventListener('click', () => setLessonLang('en'));
    $('uiBn').addEventListener('click', () => setUi('bn'));
    $('uiEn').addEventListener('click', () => setUi('en'));

    function setLessonLang(l) {
      state.lessonLang = l;
      state.lessonIdx = 0;
      $('tabBn').classList.toggle('active', l === 'bn');
      $('tabEn').classList.toggle('active', l === 'en');
      selectLesson(0);
    }
    function setUi(l) {
      state.ui = l;
      store.set('btt.ui', l);
      applyI18n();
      renderGrid();
      $('statLesson').textContent = state.ui === 'bn' ? lesson().title.bn : lesson().title.en;
    }

    const card = $('typeCard');
    const input = $('typeInput');
    card.addEventListener('click', () => { if (!state.finished) input.focus(); });
    // Keep focus inside while typing; some mobile keyboards blur on suggestion taps.
    input.addEventListener('blur', () => {
      if (!state.finished && state.started) {
        setTimeout(() => { if (!state.finished) input.focus(); }, 0);
      }
    });
    input.addEventListener('input', onInput);

    $('btnRestart').addEventListener('click', () => {
      selectLesson(state.lessonIdx);
      input.focus();
    });
    $('btnRetry').addEventListener('click', () => {
      selectLesson(state.lessonIdx);
      input.focus();
    });
    $('btnNext').addEventListener('click', () => {
      selectLesson((state.lessonIdx + 1) % lessons().length);
      input.focus();
    });
    $('btnClose').addEventListener('click', hideModal);
    $('modal').addEventListener('click', (e) => {
      if (e.target === $('modal')) hideModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hideModal();
    });

    $('btnClearHist').addEventListener('click', () => {
      if (!window.confirm(T('confirmClear'))) return;
      store.set('btt.history', []);
      [...LESSONS_BN, ...LESSONS_EN].forEach((l) => store.del('btt.best.' + l.id));
      renderHistory();
      renderGrid();
    });

    if (!store.ok) {
      const w = $('storageWarn');
      w.textContent = T('storageWarn');
      w.classList.remove('hidden');
    }

    applyI18n();
    selectLesson(0);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
