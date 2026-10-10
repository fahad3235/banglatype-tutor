# BanglaType Tutor

A free, fully offline bilingual typing tutor for **Bangla (বাংলা)** and **English**.
Ten progressive lessons per language — from isolated letters to full paragraphs —
with real-time WPM and accuracy, per-character feedback, timed tests, and
progress saved in your browser.

## 1. Problem being solved

Bangladeshi students and professionals constantly switch between Bangla and
English keyboards, yet most typing tutors are English-only. Bangla typing —
with its vowels, 39 consonants, and conjunct characters (যুক্তাক্ষর like ক্ষ, জ্ঞ)
— is a genuine skill gap. BanglaType Tutor fills it with a focused, zero-setup
tool: open the page, pick a lesson, and type. No account, no server, no tracking.

## 2. Implemented features

- **20 lessons** — 10 Bangla + 10 English, progressive (letters → words →
  sentences → paragraphs → numbers/punctuation).
- **Real-time WPM + accuracy** — net WPM = (correct chars ÷ 5) ÷ minutes.
- **Per-character highlighting** — correct (green), wrong (red), live caret.
  Grapheme-aware comparison via `Intl.Segmenter`, so Bangla conjuncts
  (ক্ষ = ক + ্ + ষ) are judged as the single glyph the typist sees.
- **Timed tests** — 1, 3, or 5 minutes, with a results summary (WPM, accuracy,
  correct/wrong counts, lesson, duration).
- **Progress persistence** — best WPM per lesson and a test history (last 50),
  stored in `localStorage`; shown as ★ badges on lessons and in the History table.
- **Bangla/English UI toggle** — the entire interface switches language.
- **Responsive** — mobile and desktop layouts; `16px` input font prevents iOS zoom.
- **States** — empty history message, click-to-start prompt, localStorage-unavailable
  warning, `noscript` fallback.

## 3. Technology stack

- **HTML5 + CSS3 + vanilla JavaScript** — no frameworks, no build step, no backend.
- `Intl.Segmenter` for grapheme-cluster-aware typing comparison.
- `localStorage` for progress persistence.
- Tested with headless Chromium (Playwright headless shell).

## 4. Prerequisites

A modern browser (Chrome, Edge, Firefox, Safari). Nothing to install.

## 5. Installation instructions

No installation. Either:

- **Open directly**: double-click `index.html`, or
- **Serve locally** (recommended, avoids `file://` quirks):
  ```bash
  cd banglatype-tutor
  python3 -m http.server 8080
  # then open http://localhost:8080
  ```

## 6. Local development commands

There is no build step. Edit the files and reload the page.

| File | Purpose |
|---|---|
| `index.html` | Page shell and layout |
| `css/style.css` | All styling (light theme, responsive) |
| `js/lessons.js` | Lesson content (10 BN + 10 EN) |
| `js/i18n.js` | UI strings (English + Bangla) |
| `js/app.js` | Typing engine, timer, stats, persistence |

## 7. Environment variable setup

None. The app uses no environment variables, no API keys, and no backend.

## 8. Testing instructions

Automated browser tests (headless Chromium via Playwright):

```bash
# one-time: install the test driver + browser (already done on the build VM)
npm i playwright-core
npx playwright install --only-shell chromium   # or: npx playwright install chromium

# serve the app, then in another terminal:
node /tmp/btt-test/test.js
```

The suite (`/tmp/btt-test/test.js`, kept outside the repo) covers:

1. Page loads with **zero console errors**.
2. Correct typing updates WPM/accuracy and highlights characters.
3. Wrong keystrokes lower accuracy and show red highlighting.
4. Backspace reverts characters correctly.
5. Lesson switching (Bangla ↔ English tabs, lesson cards).
6. UI language toggle (বাং/EN) rewrites all labels.
7. Timed test completes via `?t=5s` and the results modal appears.
8. `localStorage` persists best WPM + history across reload.
9. Restart button resets the test mid-run.

**Test override:** append `?t=<seconds>` (e.g. `?t=5s`, `?t=90`) to shorten the
timer. This exists only for automated testing; the UI offers 1/3/5 minutes.

## 9. Deployment instructions

GitHub Pages compatible — it is a static site:

1. Push this folder's contents to a GitHub repository.
2. Settings → Pages → Deploy from branch → `main` → `/ (root)`.
3. Done — no build command, no environment variables.

Any static host works the same way (Netlify Drop, Vercel, Cloudflare Pages).

## 10. Known limitations

- **Bangla conjunct input on mobile**: the app compares by grapheme cluster, but
  some mobile keyboards commit conjuncts (e.g. ক্ষ) as a sequence that may not
  match the expected single cluster keystroke-for-keystroke. A physical keyboard
  with a Bangla layout (e.g. Probhat/Avro) gives the intended experience.
- **WPM counts net correct characters only** — a deliberate choice, documented in
  the code; speed-typists comparing against gross-WPM tools will see lower numbers.
- **Progress lives in one browser** — `localStorage` is per-device; there is no
  account or sync (by design, for privacy).
- **No sound, no custom texts** — kept out to stay focused and offline.

## 11. Current project status

`BUILT_AND_VERIFIED` — all 9 automated browser checks pass (see §8),
zero console errors, responsive layout verified at 390px and 1280px widths.
Not yet published to GitHub or deployed (handled separately).

## 12. License / IP

MIT License — see `LICENSE` if added at publication time. (Not included in this
build; the publisher chooses the license on release.)
