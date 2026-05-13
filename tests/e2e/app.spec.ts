import { test, expect } from '@playwright/test'

const BASE_URL = process.env.TEST_URL ?? 'http://localhost:3000'
const APP_PASSWORD = process.env.APP_PASSWORD ?? 'test-password'

// ============================================================
// Authentication
// ============================================================
test.describe('Authentication', () => {
  test('redirects unauthenticated users to /login', async ({ page }) => {
    await page.goto(BASE_URL)
    await expect(page).toHaveURL(/\/login/)
  })

  test('shows password form on login page', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`)
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('rejects wrong password', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    await expect(page.locator('text=Incorrect password')).toBeVisible()
  })

  test('accepts correct password and redirects to app', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[type="password"]', APP_PASSWORD)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(BASE_URL + '/')
  })
})

// ============================================================
// Overview page
// ============================================================
test.describe('Overview', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[type="password"]', APP_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL(`${BASE_URL}/`)
  })

  test('shows KPI cards on overview', async ({ page }) => {
    await expect(page.locator('text=Discipline Score')).toBeVisible()
    await expect(page.locator('text=Promise Integrity')).toBeVisible()
    await expect(page.locator('text=Productivity')).toBeVisible()
  })

  test('shows Today Habits section', async ({ page }) => {
    await expect(page.locator("text=Today's Habits")).toBeVisible()
  })

  test('shows Active Goals section', async ({ page }) => {
    await expect(page.locator('text=Active Goals')).toBeVisible()
  })
})

// ============================================================
// Habits page
// ============================================================
test.describe('Habit Tracker', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[type="password"]', APP_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL(`${BASE_URL}/`)
    await page.goto(`${BASE_URL}/habits`)
  })

  test('shows monthly grid', async ({ page }) => {
    await expect(page.locator('text=Habit Tracker')).toBeVisible()
    // Month header visible
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']
    const currentMonth = monthNames[new Date().getMonth()]
    await expect(page.locator(`text=${currentMonth}`)).toBeVisible()
  })

  test('can open new habit modal', async ({ page }) => {
    await page.click('text=New Habit')
    await expect(page.locator('text=New Habit').last()).toBeVisible()
    await expect(page.locator('input[placeholder*="Morning Exercise"]')).toBeVisible()
  })

  test('can create a new habit', async ({ page }) => {
    await page.click('text=New Habit')
    await page.fill('input[placeholder*="Morning Exercise"]', 'E2E Test Habit')
    await page.click('text=Create Habit')
    await expect(page.locator('text=Habit created')).toBeVisible({ timeout: 5000 })
  })
})

// ============================================================
// Goals page
// ============================================================
test.describe('Goals', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[type="password"]', APP_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL(`${BASE_URL}/`)
    await page.goto(`${BASE_URL}/goals`)
  })

  test('shows goals page', async ({ page }) => {
    await expect(page.locator('h2:text("Goals")')).toBeVisible()
  })

  test('can open new goal modal', async ({ page }) => {
    await page.click('text=New Goal')
    await expect(page.locator('text=New Goal').last()).toBeVisible()
  })
})

// ============================================================
// Planning page
// ============================================================
test.describe('Daily Planning', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[type="password"]', APP_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL(`${BASE_URL}/`)
    await page.goto(`${BASE_URL}/planning`)
  })

  test('shows planning form', async ({ page }) => {
    await expect(page.locator('text=Daily Planning')).toBeVisible()
    await expect(page.locator('text=Daily Objective')).toBeVisible()
    await expect(page.locator('text=Top 3 Priorities')).toBeVisible()
  })

  test('can save a plan', async ({ page }) => {
    await page.fill('textarea[placeholder*="one thing"]', 'Complete the project')
    await page.fill('input[placeholder="Priority 1..."]', 'Finish feature X')
    const saveBtn = page.locator('button', { hasText: /Save Plan/ })
    await saveBtn.click()
    await expect(page.locator('text=Plan saved')).toBeVisible({ timeout: 5000 })
  })
})

// ============================================================
// Analytics page
// ============================================================
test.describe('Analytics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[type="password"]', APP_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL(`${BASE_URL}/`)
    await page.goto(`${BASE_URL}/analytics`)
  })

  test('shows analytics sections', async ({ page }) => {
    await expect(page.locator('text=Performance Profile')).toBeVisible()
    await expect(page.locator('text=Keystone Habit Ranking')).toBeVisible()
    await expect(page.locator('text=Failure Pattern Detection')).toBeVisible()
  })
})

// ============================================================
// Reports page
// ============================================================
test.describe('Reports', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[type="password"]', APP_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL(`${BASE_URL}/`)
    await page.goto(`${BASE_URL}/reports`)
  })

  test('shows monthly report sections', async ({ page }) => {
    await expect(page.locator('text=Monthly Report')).toBeVisible()
    await page.waitForSelector('text=Executive Summary', { timeout: 15000 })
    await expect(page.locator('text=Executive Summary')).toBeVisible()
  })
})

// ============================================================
// Settings page
// ============================================================
test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[type="password"]', APP_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL(`${BASE_URL}/`)
    await page.goto(`${BASE_URL}/settings`)
  })

  test('shows settings sections', async ({ page }) => {
    await expect(page.locator('text=Appearance')).toBeVisible()
    await expect(page.locator('text=Session & Security')).toBeVisible()
    await expect(page.locator('text=KPI Weights')).toBeVisible()
  })

  test('can change accent color', async ({ page }) => {
    const violetBtn = page.locator('[title="Violet"]')
    if (await violetBtn.isVisible()) {
      await violetBtn.click()
      // Verify it got selected (has scale-110 class)
      await expect(violetBtn).toHaveClass(/scale-110/)
    }
  })
})

// ============================================================
// Command palette
// ============================================================
test.describe('Command Palette', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[type="password"]', APP_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL(`${BASE_URL}/`)
  })

  test('opens with Cmd+K', async ({ page }) => {
    await page.keyboard.press('Meta+k')
    await expect(page.locator('input[placeholder="Search commands..."]')).toBeVisible()
  })

  test('closes with Escape', async ({ page }) => {
    await page.keyboard.press('Meta+k')
    await expect(page.locator('input[placeholder="Search commands..."]')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('input[placeholder="Search commands..."]')).not.toBeVisible()
  })

  test('navigates to Analytics when selected', async ({ page }) => {
    await page.keyboard.press('Meta+k')
    await page.fill('input[placeholder="Search commands..."]', 'Analytics')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(`${BASE_URL}/analytics`)
  })
})
