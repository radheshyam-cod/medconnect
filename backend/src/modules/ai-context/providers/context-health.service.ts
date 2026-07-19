import { Injectable, Logger } from '@nestjs/common';
import {
  ProviderHealth,
  ProviderHealthStatus,
} from './context-provider.interface';

// ────────────────────────────────────────────────────────
// Circuit breaker constants — tune via env vars later
// ────────────────────────────────────────────────────────
export const CIRCUIT_BREAKER = {
  /** Number of consecutive failures before tripping to 'down'. */
  CONSECUTIVE_FAILURES_TO_TRIP: 3 as const,
  /** How long a 'down' provider is skipped (ms). */
  RESET_WINDOW_MS: 60_000 as const,
  /** Number of consecutive failures before warning 'degraded'. */
  DEGRADED_THRESHOLD: 2 as const,
  /** Latency above this (ms) marks a call as slow. */
  HIGH_LATENCY_MS: 5_000 as const,
  /** Interval between proactive health checks for down providers (ms). */
  HEALTH_CHECK_INTERVAL_MS: 30_000 as const,
  /** Maximum number of latency samples kept for moving average. */
  MAX_LATENCY_SAMPLES: 10 as const,
} as const;

interface ProviderState {
  consecutiveFailures: number;
  /** Sliding window of recent latencies for moving-average calculation. */
  latenciesMs: number[];
  /** When the provider was last checked. */
  lastCheck: string;
  /** If currently 'down', the earliest time a retry is allowed. */
  nextRetryAt: string | null;
  lastError: string | null;
}

@Injectable()
export class ContextHealthService {
  private readonly logger = new Logger(ContextHealthService.name);

  /** Per-provider runtime state. */
  private readonly state = new Map<string, ProviderState>();

  // ── Public ops ──────────────────────────────────────

  /**
   * Return the computed health for a provider.
   * This is the primary API the aggregator calls before deciding to invoke a provider.
   */
  getHealth(providerName: string, version = 'unknown'): ProviderHealth {
    const s = this.state.get(providerName);
    if (!s) {
      // First time — assume healthy
      return {
        status: 'healthy',
        providerName,
        version,
        lastCheck: new Date().toISOString(),
        latencyMs: 0,
        consecutiveFailures: 0,
      };
    }

    const status = this.resolveStatus(s);
    return {
      status,
      providerName,
      version,
      lastCheck: s.lastCheck,
      latencyMs: this.averageLatency(s),
      consecutiveFailures: s.consecutiveFailures,
      lastError: s.lastError ?? undefined,
      nextRetryAt: s.nextRetryAt ?? undefined,
    };
  }

  /**
   * Whether the aggregator should skip this provider for the current call.
   * A provider is skipped only when it is in 'down' state AND the reset
   * window has not elapsed.
   */
  shouldSkip(providerName: string): boolean {
    const s = this.state.get(providerName);
    if (!s) return false;
    if (s.consecutiveFailures < CIRCUIT_BREAKER.CONSECUTIVE_FAILURES_TO_TRIP) return false;
    if (!s.nextRetryAt) return false;
    // If the reset window has passed, allow a retry
    if (Date.now() >= new Date(s.nextRetryAt).getTime()) return false;
    return true;
  }

  /**
   * Record a successful call. Resets failure count and updates latency average.
   */
  recordSuccess(providerName: string, latencyMs: number): void {
    const s = this.ensureState(providerName);
    s.consecutiveFailures = 0;
    s.latenciesMs.push(latencyMs);
    if (s.latenciesMs.length > CIRCUIT_BREAKER.MAX_LATENCY_SAMPLES) {
      s.latenciesMs.shift();
    }
    s.lastCheck = new Date().toISOString();
    s.nextRetryAt = null;
    s.lastError = null;
  }

  /**
   * Record a failure. Increments the failure counter; may trip the circuit breaker.
   */
  recordFailure(providerName: string, error: Error): void {
    const s = this.ensureState(providerName);
    s.consecutiveFailures++;
    s.lastCheck = new Date().toISOString();
    s.lastError = error.message;

    if (s.consecutiveFailures >= CIRCUIT_BREAKER.CONSECUTIVE_FAILURES_TO_TRIP) {
      s.nextRetryAt = new Date(Date.now() + CIRCUIT_BREAKER.RESET_WINDOW_MS).toISOString();
      this.logger.warn(
        `[CircuitBreaker] ${providerName} tripped DOWN after ${s.consecutiveFailures} consecutive failures. ` +
        `Next retry at ${s.nextRetryAt}. Last error: ${error.message}`,
      );
    } else if (s.consecutiveFailures >= CIRCUIT_BREAKER.DEGRADED_THRESHOLD) {
      this.logger.warn(
        `[CircuitBreaker] ${providerName} DEGRADED (${s.consecutiveFailures}/${CIRCUIT_BREAKER.CONSECUTIVE_FAILURES_TO_TRIP} failures).`,
      );
    }
  }

  /**
   * Convenience: record latency without affecting success/failure counts.
   * Useful for tracking slow responses that still succeeded.
   */
  recordLatency(providerName: string, latencyMs: number): void {
    const s = this.ensureState(providerName);
    s.latenciesMs.push(latencyMs);
    if (s.latenciesMs.length > CIRCUIT_BREAKER.MAX_LATENCY_SAMPLES) {
      s.latenciesMs.shift();
    }
    s.lastCheck = new Date().toISOString();
  }

  recordCacheHit(_providerName: string, _hit: boolean): void {
    // Reserved for future cache-optimization metrics
  }

  // ── Internal helpers ────────────────────────────────

  private resolveStatus(s: ProviderState): ProviderHealthStatus {
    if (s.nextRetryAt && Date.now() < new Date(s.nextRetryAt).getTime()) {
      return 'down';
    }
    if (s.consecutiveFailures >= CIRCUIT_BREAKER.DEGRADED_THRESHOLD) {
      return 'degraded';
    }
    return 'healthy';
  }

  private averageLatency(s: ProviderState): number {
    if (s.latenciesMs.length === 0) return 0;
    const sum = s.latenciesMs.reduce((a, b) => a + b, 0);
    return Math.round(sum / s.latenciesMs.length);
  }

  private ensureState(providerName: string): ProviderState {
    let s = this.state.get(providerName);
    if (!s) {
      s = {
        consecutiveFailures: 0,
        latenciesMs: [],
        lastCheck: new Date().toISOString(),
        nextRetryAt: null,
        lastError: null,
      };
      this.state.set(providerName, s);
    }
    return s;
  }
}
