// Web e2e acceptance: session row hover card — shows a copyable session id,
// pins open on the pin button (stays after the pointer leaves), and dismisses
// after unpinning. Real chromium, real web composition, zero model calls.
//
// Built on the repository's standard browser lane (launchWebScaffold + a
// seeded cold session through the real persistence API), so the three
// interactions below are exercised against the actual built dist, exactly as
// a human would. The hover card is the ui-workspace Rows
// `SessionNodeItem`/`HoverCard` (with the pinned fixed-state added by the
// [Feature] HoverCard pinned commits), which renders the session id line
// `Session ID: <id>` and a pin button whose accessible label flips
// 固定/取消固定.
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import type { Browser, Page } from 'playwright'
import { chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it, onTestFailed } from 'vitest'
import {
  launchWebScaffold, seedSession, watchConsole, type WebScaffold,
} from './scaffold.ts'
import { newEnglishPage, saveFailureShot } from './support.ts'

const SEED = fileURLToPath(new URL('./snapshots/seeded-history/seed.jsonl', import.meta.url))
// A stable, discoverable session id so the hover card's id line is asserted
// against a known value (the seed fixture realizes {{sessionId}} to this id).
const SEED_ID = 'session-hover-pin-web-e2e'

/**
 * Reveal the seeded cold session row. Every seeded session is unattached, so
 * it sits in the collapsed `Ungrouped` bucket; open the bucket (and its
 * transient Show-more control if the list is long enough to hide the row).
 * @param page - the page under test.
 */
async function revealSeededSession(page: Page): Promise<void> {
  const list = page.locator('[role="tree"][aria-label="Sessions"]')
  await list.waitFor({ timeout: 30_000 })
  const bucket = page.getByText('Ungrouped', { exact: true })
  const rows = list.locator('[role="treeitem"]')
  const deadline = Date.now() + 30_000
  for (;;) {
    if (await bucket.count() > 0 && await bucket.evaluate(el => el.closest('[role="group"]')?.getAttribute('aria-expanded')) !== 'true') {
      await bucket.first().click()
    }
    const showMore = page.getByRole('button', { name: /Show \d+ more sessions/ })
    if (await showMore.count() > 0) await showMore.first().click()
    const visible = await rows.count()
    if (visible > 0) return
    if (Date.now() > deadline) throw new Error('seeded session row never appeared in the sidebar')
    await page.waitForTimeout(200)
  }
}

describe('web e2e: session row hover card shows id, pins, and unpins', () => {
  let scaffold: WebScaffold
  let browser: Browser
  let page: Page
  let tripwire: ReturnType<typeof watchConsole>

  beforeAll(async () => {
    scaffold = await launchWebScaffold({})
    // Seed a NON-blank session (the sidebar shows blank rows only when they
    // are the selected provisional row). The recorded fixture's path tokens
    // must survive JSON round-trips on every host: `realizeSeedFixture`
    // rewrites the parsed header cwd to `scaffold.workspaceCwd`, whose Windows
    // drive-letter backslashes would break the transcript lines (which are
    // re-parsed by parseSessionLog). Keep the header cwd a backslash-free
    // sentinel the transcript never contains (so that rewrite touches only the
    // ignored header line) and spell the transcript's own `{{cwd}}` references
    // as a forward-slash token — both survive JSON on POSIX and Windows.
    const raw = await readFile(SEED, 'utf8')
    const realized = raw.split('{{sessionId}}').join(SEED_ID)
    const lines = realized.split('\n')
    const header = lines[0] ?? ''
    lines[0] = header.split('{{cwd}}/workspace').join('HDR-SESSION-ROOT').split('{{cwd}}').join('HDR-SESSION-ROOT')
    for (let index = 1; index < lines.length; index += 1) {
      lines[index] = (lines[index] ?? '').split('{{cwd}}').join('CWD/workspace')
    }
    await seedSession(scaffold, lines.join('\n'), SEED_ID)
    browser = await chromium.launch()
    page = await newEnglishPage(browser)
    tripwire = watchConsole(page)
    await page.goto(scaffold.baseUrl, { waitUntil: 'load' })
    await page.waitForSelector('[class*="frame"]', { timeout: 30_000 })
    await revealSeededSession(page)
  }, 180_000)

  afterAll(async () => {
    await browser?.close()
    await scaffold?.close()
  })

  it('hovering a session row shows a card carrying the session id', async () => {
    onTestFailed(() => saveFailureShot(page, 'web-e2e-session-hover-pin-show'))
    const rows = page.locator('[role="tree"][aria-label="Sessions"] [role="treeitem"]')
    await rows.first().waitFor({ timeout: 10_000 })
    // treeitem[0] is the Ungrouped group header; the seeded session is the row after it.
    const row = rows.nth(1)
    await row.waitFor({ timeout: 10_000 })
    await row.hover()
    // HoverCard dwells 500ms before opening; poll for the id line.
    await expect.poll(async () => page.getByText(`Session ID: ${SEED_ID}`, { exact: true }).count(), {
      timeout: 10_000,
    }).toBeGreaterThan(0)
    expect(await page.getByText(`Session ID: ${SEED_ID}`, { exact: true }).isVisible()).toBe(true)
    expect(tripwire.pageErrors).toEqual([])
  }, 60_000)

  it('pinning the card keeps it open after the pointer leaves', async () => {
    onTestFailed(() => saveFailureShot(page, 'web-e2e-session-hover-pin-pinned'))
    const pin = page.getByRole('button', { name: '固定' })
    await pin.waitFor({ timeout: 10_000 })
    expect(await pin.getAttribute('aria-pressed')).toBe('false')
    await pin.click()
    await expect.poll(() => page.getByRole('button', { name: '取消固定' }).count(), {
      timeout: 5_000,
    }).toBe(1)
    // Move the pointer far away (the far conversation column) and give the
    // 200ms pointer-grace more than enough time to elapse; a pinned card stays.
    await page.mouse.move(10, 10)
    await page.waitForTimeout(1200)
    expect(await page.getByText(`Session ID: ${SEED_ID}`, { exact: true }).isVisible()).toBe(true)
    expect(await page.getByRole('button', { name: '取消固定' }).count()).toBe(1)
    expect(tripwire.pageErrors).toEqual([])
  }, 60_000)

  it('unpinning the card lets it dismiss once the pointer leaves', async () => {
    onTestFailed(() => saveFailureShot(page, 'web-e2e-session-hover-pin-unpin'))
    const unpin = page.getByRole('button', { name: '取消固定' })
    await unpin.waitFor({ timeout: 10_000 })
    await unpin.click()
    await expect.poll(() => page.getByRole('button', { name: '固定' }).count(), {
      timeout: 5_000,
    }).toBe(1)
    // Still over the row (pointer left earlier); leave it again and wait out the grace.
    await page.mouse.move(10, 10)
    await expect.poll(async () => page.getByText(`Session ID: ${SEED_ID}`, { exact: true }).count(), {
      timeout: 5_000,
    }).toBe(0)
    expect(tripwire.pageErrors).toEqual([])
  }, 60_000)

  it('issued zero model calls and stayed clean', async () => {
    expect(tripwire.pageErrors).toEqual([])
    expect(tripwire.warnings).toEqual([])
  })
})
