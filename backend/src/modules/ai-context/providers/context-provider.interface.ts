import { MedicalContext } from '../dto/medical-context.dto';

/**
 * Injection token for multi-provider context registration.
 * All context providers register under this token with `multi: true`.
 */
export const CONTEXT_PROVIDER_TOKEN = 'CONTEXT_PROVIDER_TOKEN';

export interface ContextQuery {
  userId: string;
  query: string;
  limit?: number;
  /** Per-call timeout override (ms). Falls back to the provider default if unset. */
  timeoutMs?: number;
}

export type ProviderHealthStatus = 'healthy' | 'degraded' | 'down';

export interface ProviderHealth {
  status: ProviderHealthStatus;
  providerName: string;
  version: string;
  lastCheck: string;            // ISO timestamp
  latencyMs: number;             // Moving average of recent calls
  consecutiveFailures: number;
  lastError?: string;
  /** If status === 'down', the provider will be skipped until this timestamp. */
  nextRetryAt?: string;          // ISO timestamp
}

/**
 * Wrapper returned by every provider. The `data` field holds the actual
 * MedicalContext payload; the `source` and `version` are tagged here so
 * that ContextAggregator does not need to reach inside items for provenance.
 */
export interface ProviderContext {
  source: string;
  version: string;
  data: Partial<MedicalContext>;
}

export interface IContextProvider {
  /** Human-readable provider name (e.g. "Mem0", "Alchemyst"). Must be unique. */
  readonly name: string;
  /** Semantic version for this provider's output format (e.g. "1.0.0"). */
  readonly version: string;
  /** Whether the provider is configured and usable (runtime gate). */
  readonly isAvailable: boolean;

  /**
   * Retrieve context for a patient query. Returns a ProviderContext wrapper
   * with source/version tagging so the aggregator knows where data came from.
   * Must NOT throw on transient errors — return empty data and log instead.
   */
  retrieveContext(query: ContextQuery): Promise<ProviderContext>;

  /**
   * Health check that returns the current provider health state.
   * Called by ContextHealthService on a timer and before each retrieveContext call.
   */
  healthCheck(): Promise<ProviderHealth>;

  /**
   * Push validated facts back to the provider for long-term storage.
   * Called by ContextSynchronizer after the sync gate passes.
   */
  updateContext(userId: string, data: Partial<MedicalContext>): Promise<void>;
}
