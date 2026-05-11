/**
 * SSE Event Bus
 *
 * A zero-dependency, globalThis-safe pub/sub bus that:
 *  • Holds a Set of ReadableStreamController instances (one per connected SSE client)
 *  • Lets any server-side code push typed events to ALL connected dashboards instantly
 *  • Is HMR-safe: state lives on globalThis so hot-reloads never create orphan buses
 *
 * Design rules:
 *  • Never throws — every write is wrapped in try/catch
 *  • Automatically removes dead controllers on write failure
 *  • Maximum 64 simultaneous dashboard connections (DoS protection)
 */

export type SseEventType =
  | 'snapshot'        // full data snapshot (every 3s)
  | 'job_success'     // a job completed successfully
  | 'job_failed'      // a job failed
  | 'error'           // error recorded
  | 'queue_overflow'  // queue depth exceeded threshold
  | 'redis_down'      // redis connectivity lost
  | 'redis_up'        // redis reconnected
  | 'cpu_alert'       // CPU spike
  | 'mem_alert'       // memory spike
  | 'ping'            // keepalive

export interface SseEvent {
  type: SseEventType
  ts: number
  data?: unknown
}

type Controller = ReadableStreamDefaultController<Uint8Array>

const KEY = Symbol.for('toolify.sse.bus')
type G = Record<symbol, Set<Controller>>

function getControllers(): Set<Controller> {
  const g = globalThis as G
  if (!g[KEY]) g[KEY] = new Set()
  return g[KEY]
}

const MAX_CLIENTS = 64

export function addSseClient(ctrl: Controller): () => void {
  const clients = getControllers()
  if (clients.size >= MAX_CLIENTS) {
    // Evict oldest (first inserted) client
    const oldest = clients.values().next().value
    if (oldest) {
      try { oldest.close() } catch {}
      clients.delete(oldest)
    }
  }
  clients.add(ctrl)
  return () => clients.delete(ctrl)
}

function encode(event: SseEvent): Uint8Array {
  const id   = event.ts.toString()
  const type = event.type
  const data = JSON.stringify(event.data ?? {})
  const msg  = `id:${id}\nevent:${type}\ndata:${data}\n\n`
  return new TextEncoder().encode(msg)
}

export function pushSseEvent(event: SseEvent): void {
  const clients = getControllers()
  if (clients.size === 0) return
  const payload = encode(event)
  const dead: Controller[] = []
  for (const ctrl of clients) {
    try {
      ctrl.enqueue(payload)
    } catch {
      dead.push(ctrl)
    }
  }
  for (const ctrl of dead) clients.delete(ctrl)
}

export function getSseClientCount(): number {
  return getControllers().size
}

/** Push a keepalive ping to all connected clients (prevents proxy timeouts). */
export function pingAllClients(): void {
  pushSseEvent({ type: 'ping', ts: Date.now() })
}
