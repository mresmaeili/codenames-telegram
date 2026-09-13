export interface RealtimeMetrics {
  broadcastCount: number;
  totalBroadcastDurationMs: number;
  lastBroadcastDurationMs: number;
  lastStateVersion: number | null;
}

const metrics: RealtimeMetrics = {
  broadcastCount: 0,
  totalBroadcastDurationMs: 0,
  lastBroadcastDurationMs: 0,
  lastStateVersion: null,
};

export function recordGameBroadcast(
  durationMs: number,
  stateVersion: number,
): void {
  metrics.broadcastCount += 1;
  metrics.totalBroadcastDurationMs += durationMs;
  metrics.lastBroadcastDurationMs = durationMs;
  metrics.lastStateVersion = stateVersion;
}

export function getRealtimeMetrics(): RealtimeMetrics {
  return { ...metrics };
}
