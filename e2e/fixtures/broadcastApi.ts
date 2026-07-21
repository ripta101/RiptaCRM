/**
 * Thin fetch wrappers against message-broadcast-api, used only for E2E test setup/teardown
 * (creating throwaway fixtures before driving the UI, deleting them afterward) — never
 * to replace the UI interactions the specs are actually meant to exercise.
 */
const BASE_URL = "http://localhost:4313";
// Matches every service's INTERNAL_SERVICE_KEY dev-only fallback (see .env.e2e) — a known,
// hardcoded value, same spirit as this file already hardcoding seeded ids like "user-1".
const SERVICE_KEY_HEADERS = { "X-Internal-Service-Key": "dev-only-insecure-service-key-change-me" };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: init?.body
      ? { "Content-Type": "application/json", ...SERVICE_KEY_HEADERS, ...init.headers }
      : { ...SERVICE_KEY_HEADERS, ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(`${init?.method ?? "GET"} ${path} failed (${res.status}): ${body?.error ?? "unknown error"}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface CreateThrowawayBroadcastInput {
  title: string;
  targetProfileIds: string[];
  priority?: "LOW" | "NORMAL" | "HIGH";
  startAt?: string;
  endAt?: string;
}

/** Defaults to an already-active window (started a minute ago, ends in an hour). */
export async function createThrowawayBroadcast(input: CreateThrowawayBroadcastInput): Promise<{ id: string }> {
  const now = Date.now();
  return request<{ id: string }>("/api/broadcasts", {
    method: "POST",
    body: JSON.stringify({
      title: input.title,
      bodyHtml: `<p>${input.title}</p>`,
      targetProfileIds: input.targetProfileIds,
      priority: input.priority,
      startAt: input.startAt ?? new Date(now - 60_000).toISOString(),
      endAt: input.endAt ?? new Date(now + 60 * 60_000).toISOString(),
    }),
  });
}

export async function deleteThrowawayBroadcast(id: string): Promise<void> {
  await request(`/api/broadcasts/${id}`, { method: "DELETE" });
}

/** For fixtures created through the UI (not this file's create helper), so they can still be tracked for cleanup. */
export async function findBroadcastIdByTitle(title: string): Promise<string | undefined> {
  const { results } = await request<{ results: { id: string; title: string }[] }>("/api/broadcasts");
  return results.find((b) => b.title === title)?.id;
}
