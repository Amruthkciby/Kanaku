// A small localStorage-backed queue for household entries submitted while offline (brief section
// 11: "offline entry queue"). Deliberately just for the fast-entry family flow, not every mutation
// in the app — that's the one screen explicitly meant to work in under five seconds regardless of
// signal, per section 9.1.

const STORAGE_KEY = "kanakku:offline-queue:v1";

export interface QueuedEntryPayload {
  accountId: string;
  amountPaise: number;
  direction: "expense" | "income";
  category: string | null;
  memberId: string;
  mode: string;
  note: string | null;
  occurredOn: string;
}

export interface QueuedEntry {
  id: string;
  payload: QueuedEntryPayload;
  queuedAt: string;
}

export function getQueue(): QueuedEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as QueuedEntry[]) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedEntry[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new CustomEvent("kanakku:queue-changed"));
}

export function enqueue(payload: QueuedEntryPayload): QueuedEntry {
  const entry: QueuedEntry = { id: crypto.randomUUID(), payload, queuedAt: new Date().toISOString() };
  saveQueue([...getQueue(), entry]);
  return entry;
}

function removeFromQueue(id: string) {
  saveQueue(getQueue().filter((e) => e.id !== id));
}

export async function submitOrQueue(payload: QueuedEntryPayload): Promise<{ queued: boolean; error: string | null }> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    enqueue(payload);
    return { queued: true, error: null };
  }

  try {
    const res = await fetch("/api/household-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "Something went wrong." }));
      return { queued: false, error: body.error ?? "Something went wrong." };
    }
    return { queued: false, error: null };
  } catch {
    // Network error mid-request (e.g. connection dropped) -- queue it rather than losing it.
    enqueue(payload);
    return { queued: true, error: null };
  }
}

/** Tries to sync every queued entry; leaves failed ones in the queue for the next attempt. */
export async function flushQueue(): Promise<{ synced: number; remaining: number }> {
  const queue = getQueue();
  let synced = 0;

  for (const entry of queue) {
    try {
      const res = await fetch("/api/household-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry.payload),
      });
      if (res.ok) {
        removeFromQueue(entry.id);
        synced++;
      }
    } catch {
      // still offline — leave it queued and stop trying for now
      break;
    }
  }

  return { synced, remaining: getQueue().length };
}
