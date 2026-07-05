---
name: verify
description: Drive the Dart-Scores app end-to-end in a headless browser to verify UI/gameplay changes
---

# Verifying Dart-Scores

Client-only Vite SPA — verification means driving the real UI in a browser.

## Launch

```bash
npm run dev   # background; read the port from output (5173 may be taken by other projects)
```

## Drive (Playwright)

No Playwright in the project; install it in a scratch dir (`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm i playwright` — chromium is already in `~/Library/Caches/ms-playwright`) and script against `http://localhost:<port>/`.

State is all in `localStorage` — every fresh browser context starts on the Setup screen with no users. Script the whole flow:

1. **Setup**: fill placeholder `New user name` + click `Add`; click a user's name to move it to Players; buttons `501`/`301` are a segmented control; checkbox label `Double out`; `Start Game`.
2. **Board clicks** (BoardFace geometry: viewBox 560, R=190, segment 20 at 12 o'clock, wedges 18° clockwise): get the bbox of `getByRole('img', { name: 'Dartboard' })`, scale = width/560, click at `(cx + r·sin(deg)·scale, cy − r·cos(deg)·scale)`.
   - T20: r = 0.515·190, deg 0. Single 1: r = 0.73·190, deg 18. Bull: center.
3. **Fast game**: 301, Double out OFF → Alice 3×T20 (121), Bob anything, Alice T20 T20 S1 → win → GameOver. **Bust**: from 121, throw 3×T20 (third dart goes negative).
4. **Undo/redo**: ArrowLeft / ArrowRight keys. **Quit/Restart** fire `window.confirm` — register `page.on('dialog')`.
5. **Theme**: TopBar `Settings` → the dropdown's `<select>` (only on Setup/GameOver screens, not Play).
6. **Narrow layout**: `setViewportSize({ width: 800, height: 1100 })` — stacks below 1024px.

## Gotchas

- The score sidebar aligns to the board via a ResizeObserver; screenshot immediately after PlayScreen mounts only after animations settle (~300ms) if you're checking layout.
- Hero score card = first `ul li`; read scores via `allInnerTexts()` on `ul li`.
