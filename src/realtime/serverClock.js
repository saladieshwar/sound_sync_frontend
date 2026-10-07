const MAX_SAMPLES = 10

/**
 * Estimates the server clock from `time_sync` round trips (NTP-style). Device clocks often differ
 * from the server by a second or more, so room timing always uses `now()` instead of Date.now().
 */
export function createServerClock() {
  let samples = []

  const offset = () =>
    samples.length ? samples.reduce((a, b) => (b.rtt < a.rtt ? b : a)).offset : 0

  return {
    /** Records one round trip: local send time, server reply timestamp, local receive time. */
    addSample(sentAt, serverTs, receivedAt = Date.now()) {
      if (!Number.isFinite(sentAt) || !Number.isFinite(serverTs) || receivedAt < sentAt) return
      const rtt = receivedAt - sentAt
      samples = [...samples, { rtt, offset: serverTs - (sentAt + rtt / 2) }].slice(-MAX_SAMPLES)
    },
    /** Server time minus local time, in ms (0 until the first sample). */
    offset,
    /** Current server time in epoch ms, as seen from this device. */
    now: () => Date.now() + offset(),
  }
}
