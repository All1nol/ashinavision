const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;
const CLEANUP_INTERVAL_MS = 120_000;

type Entry = { timestamps: number[] };

const store = new Map<string, Entry>();

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

const startCleanup = () => {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      entry.timestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS);
      if (entry.timestamps.length === 0) store.delete(key);
    }
  }, CLEANUP_INTERVAL_MS);
  if (typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    cleanupTimer.unref();
  }
};

export const isAllowed = (ip: string): boolean => {
  startCleanup();
  const now = Date.now();
  const entry = store.get(ip) ?? { timestamps: [] };

  entry.timestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS);

  if (entry.timestamps.length >= MAX_REQUESTS) return false;

  entry.timestamps.push(now);
  store.set(ip, entry);
  return true;
};
