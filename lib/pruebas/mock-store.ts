import { createMockFixtures } from "@/lib/pruebas/mock-fixtures"
import type { MockPruebasStore, MockScenario } from "@/lib/pruebas/types"

export interface MockRuntimeState {
  store: MockPruebasStore
  scenario: MockScenario
  latencyMs: number
}

let runtime: MockRuntimeState = {
  store: createMockFixtures(),
  scenario: "populated",
  latencyMs: 0,
}

type LoadingWaiter = {
  resolve: () => void
  reject: (error: Error) => void
}

const loadingWaiters: LoadingWaiter[] = []

function cloneStore(source: MockPruebasStore): MockPruebasStore {
  return structuredClone(source)
}

export function getMockRuntime(): MockRuntimeState {
  return runtime
}

export function getMockStore(): MockPruebasStore {
  return runtime.store
}

export function replaceMockStore(next: MockPruebasStore): void {
  runtime.store = next
}

export function setMockScenario(scenario: MockScenario): void {
  const previous = runtime.scenario
  runtime.scenario = scenario
  if (previous === "loading" && scenario !== "loading") {
    flushLoadingWaiters("resolve")
  }
}

export function setMockLatencyMs(ms: number): void {
  runtime.latencyMs = Math.max(0, ms)
}

export function resetMockStore(): void {
  flushLoadingWaiters("reject")
  runtime = {
    store: createMockFixtures(),
    scenario: "populated",
    latencyMs: 0,
  }
}

export function waitWhileLoading(): Promise<void> {
  if (runtime.scenario !== "loading") {
    return Promise.resolve()
  }
  return new Promise<void>((resolve, reject) => {
    loadingWaiters.push({ resolve, reject })
  })
}

function flushLoadingWaiters(mode: "resolve" | "reject"): void {
  const waiters = loadingWaiters.splice(0, loadingWaiters.length)
  for (const waiter of waiters) {
    if (mode === "resolve") {
      waiter.resolve()
    } else {
      waiter.reject(new Error("mock_store_reset"))
    }
  }
}

export function snapshotStore(): MockPruebasStore {
  return cloneStore(runtime.store)
}

export function emptyStoreSnapshot(): MockPruebasStore {
  return {
    companies: [],
    vacancies: [],
    candidates: [],
    applications: [],
    tests: [],
    versions: [],
    questions: [],
    links: [],
    assignments: [],
    sessions: [],
    results: [],
    reviews: [],
    trackingEvents: [],
  }
}
