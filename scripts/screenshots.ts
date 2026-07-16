// Generates the three README screenshots (docs/screenshots/) against fixture data built from the
// real X01/tournament engine (see screenshotFixtures.ts), so what's on screen is exactly as valid
// as a real played game - never a hand-faked DOM state. Boots a scratch Vite dev server, seeds
// localStorage via addInitScript before the app's own JS runs, drives headless Chromium via
// Playwright, and only overwrites a committed PNG when the capture differs meaningfully from it.
//
// Usage: npm run screenshots
import { execSync, spawn, type ChildProcess } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'
import { chromium, type Page as PlaywrightPage } from 'playwright'
import { CURRENT_SCHEMA_VERSION, STORAGE_KEY, type PersistedEnvelope, type PersistedRoot } from '../src/storage/schema'
import { gamePersistedRoot, setupPersistedRoot, tournamentPersistedRoot } from './screenshotFixtures'

const VITE_PORT = 5183
const VIEWPORT = { width: 1440, height: 900 } // matches the committed PNGs at 2x (2880x1800)

// A capture only overwrites the committed PNG once more than this many pixels differ beyond the
// per-pixel color threshold - trivial anti-aliasing jitter between runs shouldn't produce a commit.
// The dartboard's curved SVG paths alone account for several thousand such pixels run-to-run (a
// screen with no board, e.g. Setup, reproduces at 0px diff every time) - well short of the
// hundreds of thousands a genuinely different capture produces.
const DIFF_PIXEL_THRESHOLD = 8_000
const COLOR_THRESHOLD = 0.1

const dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(dirname, '..')
const outDir = path.resolve(repoRoot, 'docs/screenshots')

interface Page {
  slug: string
  file: string
  theme: 'light' | 'dark'
  root: PersistedRoot
  /** Extra UI interaction needed after boot, beyond what localStorage seeding alone renders. */
  interact?: (pw: PlaywrightPage) => Promise<void>
}

function buildPages(now: number): Page[] {
  return [
    { slug: 'game', file: 'Game.png', theme: 'light', root: gamePersistedRoot(now) },
    {
      slug: 'setup', file: 'Setup.png', theme: 'light', root: setupPersistedRoot(),
      interact: async (pw) => {
        // Move three saved users into "Players", leaving the rest in "Users".
        for (const id of ['erik', 'anna', 'daniel']) {
          await pw.locator(`[data-roster-id="${id}"]`).click()
        }
        // Switch to Cricket so its default-settings picker is what's shown.
        await pw.getByRole('button', { name: 'Cricket', exact: true }).click()
      },
    },
    { slug: 'tournament', file: 'Tournament_Results.png', theme: 'dark', root: tournamentPersistedRoot(now) },
  ]
}

function freePort(port: number): void {
  try {
    const pids = execSync(`lsof -ti tcp:${port} -sTCP:LISTEN`, { encoding: 'utf8' })
      .split('\n').map((line) => line.trim()).filter(Boolean)
    for (const pid of pids) process.kill(Number(pid), 'SIGTERM')
  } catch {
    // Nothing listening - fine.
  }
}

function waitForHttp(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs
  return new Promise((resolve, reject) => {
    const attempt = () => {
      fetch(url).then(() => resolve()).catch(() => {
        if (Date.now() > deadline) reject(new Error(`Timed out waiting for ${url}`))
        else setTimeout(attempt, 200)
      })
    }
    attempt()
  })
}

/** Only overwrites the committed PNG when the new capture differs meaningfully from it - keeps a
 * regenerate-and-commit loop quiet when the pixels are effectively unchanged. */
function saveIfChanged(buf: Buffer, outFile: string): boolean {
  const next = PNG.sync.read(buf)
  if (existsSync(outFile)) {
    let prev: PNG | null = null
    try {
      prev = PNG.sync.read(readFileSync(outFile))
    } catch {
      prev = null
    }
    if (prev && prev.width === next.width && prev.height === next.height) {
      const changed = pixelmatch(prev.data, next.data, undefined, next.width, next.height, {
        threshold: COLOR_THRESHOLD, includeAA: false,
      })
      if (changed <= DIFF_PIXEL_THRESHOLD) {
        console.log(`  ${changed} px changed (<= ${DIFF_PIXEL_THRESHOLD}), keeping the committed image`)
        return false
      }
      console.log(`  ${changed} px changed, updating`)
    }
  }
  writeFileSync(outFile, buf)
  return true
}

async function capturePage(browser: Awaited<ReturnType<typeof chromium.launch>>, page: Page): Promise<void> {
  const envelope: PersistedEnvelope<PersistedRoot> = { schemaVersion: CURRENT_SCHEMA_VERSION, data: page.root }
  const context = await browser.newContext({
    viewport: VIEWPORT, deviceScaleFactor: 2, colorScheme: page.theme, reducedMotion: 'reduce',
  })
  await context.addInitScript(
    ({ key, json }: { key: string; json: string }) => localStorage.setItem(key, json),
    { key: STORAGE_KEY, json: JSON.stringify(envelope) },
  )
  const pw = await context.newPage()
  await pw.goto(`http://localhost:${VITE_PORT}/`)
  await pw.waitForLoadState('networkidle')
  // Inter is a variable webfont loaded async - without this, capture timing races its swap-in
  // and produces widespread (but meaningless) antialiasing diffs between otherwise-identical runs.
  await pw.evaluate(() => document.fonts.ready)

  if (page.interact) await page.interact(pw)
  await pw.waitForTimeout(300)

  const buf = await pw.screenshot({ type: 'png' })
  const outFile = path.join(outDir, page.file)
  const changed = saveIfChanged(buf, outFile)
  console.log(`  -> ${path.relative(repoRoot, outFile)}${changed ? '' : ' (unchanged)'}`)
  await context.close()
}

async function main() {
  mkdirSync(outDir, { recursive: true })
  const pages = buildPages(Date.now())

  console.log(`Starting scratch Vite dev server on :${VITE_PORT}...`)
  freePort(VITE_PORT)
  const viteCli = path.resolve(repoRoot, 'node_modules/vite/bin/vite.js')
  const vite: ChildProcess = spawn(process.execPath, [viteCli, '--port', String(VITE_PORT), '--strictPort'], {
    cwd: repoRoot, stdio: 'ignore',
  })
  await waitForHttp(`http://localhost:${VITE_PORT}`, 20_000)

  console.log('Launching headless Chromium...')
  const browser = await chromium.launch()

  try {
    for (const [index, page] of pages.entries()) {
      console.log(`[${index + 1}/${pages.length}] ${page.slug}`)
      await capturePage(browser, page)
    }
  } finally {
    await browser.close()
    vite.kill()
  }

  console.log('Done.')
}

try {
  await main()
} catch (err) {
  console.error(err)
  process.exit(1)
}
