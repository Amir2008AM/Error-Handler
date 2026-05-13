/**
 * lib/dashboard-store.ts — Client-side dashboard state management
 *
 * Tracks:
 * - Last test run per tool (success/failure)
 * - Last failure case (stored for Verify Fix)
 * - Test file + metadata (for Verify Fix re-submission)
 * - Verification results (before/after comparison)
 */

export interface TestRun {
  id: string
  toolSlug: string
  status: 'success' | 'failed'
  timestamp: number
  steps: Array<{
    name: string
    status: string
    durationMs: number
    detail?: string
  }>
  warnings: string[]
  error?: string
  totalMs: number
  fileInfo: { name: string; size: number }
}

export interface FailureCase {
  testRun: TestRun
  fileBuffer: Blob
  fileName: string
}

export interface VerifyResult {
  beforeFailure: TestRun
  afterTest: TestRun
  isFixed: boolean
  comparisonDetail: string
}

interface DashboardState {
  lastRuns: Map<string, TestRun>
  lastFailure: Map<string, FailureCase>
  verifyResults: Map<string, VerifyResult>
}

const state: DashboardState = {
  lastRuns: new Map(),
  lastFailure: new Map(),
  verifyResults: new Map(),
}

// ── Store Test Run ────────────────────────────────────────────────────────────

export function storeTestRun(toolSlug: string, run: TestRun): void {
  state.lastRuns.set(toolSlug, run)

  // If it's a failure, auto-store as potential Verify Fix case
  if (run.status === 'failed') {
    state.lastFailure.set(toolSlug, {
      testRun: run,
      fileBuffer: new Blob(),
      fileName: run.fileInfo.name,
    })
  }
}

export function getLastRun(toolSlug: string): TestRun | undefined {
  return state.lastRuns.get(toolSlug)
}

// ── Store Failure Case (for Verify Fix) ────────────────────────────────────────

export function storeFailureCase(toolSlug: string, testRun: TestRun, fileBlob: Blob): void {
  state.lastFailure.set(toolSlug, {
    testRun,
    fileBuffer: fileBlob,
    fileName: testRun.fileInfo.name,
  })
}

export function getFailureCase(toolSlug: string): FailureCase | undefined {
  return state.lastFailure.get(toolSlug)
}

export function clearFailureCase(toolSlug: string): void {
  state.lastFailure.delete(toolSlug)
}

// ── Store Verify Result ────────────────────────────────────────────────────────

export function storeVerifyResult(
  toolSlug: string,
  beforeFailure: TestRun,
  afterTest: TestRun
): void {
  const isFixed = afterTest.status === 'success' && beforeFailure.status === 'failed'
  const comparisonDetail = isFixed
    ? `Fixed: ${beforeFailure.error || 'previous error'} → now working`
    : `Still failing: ${afterTest.error || 'same error'}`

  state.verifyResults.set(toolSlug, {
    beforeFailure,
    afterTest,
    isFixed,
    comparisonDetail,
  })
}

export function getVerifyResult(toolSlug: string): VerifyResult | undefined {
  return state.verifyResults.get(toolSlug)
}

// ── Clear All ──────────────────────────────────────────────────────────────────

export function clearDashboardState(): void {
  state.lastRuns.clear()
  state.lastFailure.clear()
  state.verifyResults.clear()
}

// ── Query State ────────────────────────────────────────────────────────────────

export function hasActiveFailure(toolSlug: string): boolean {
  return state.lastFailure.has(toolSlug)
}

export function getAllFailedTools(): string[] {
  return Array.from(state.lastFailure.keys())
}

export function getToolsWithVerifyResults(): string[] {
  return Array.from(state.verifyResults.keys())
}
