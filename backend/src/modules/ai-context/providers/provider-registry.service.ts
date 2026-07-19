import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import {
  CONTEXT_PROVIDER_TOKEN,
  IContextProvider,
} from './context-provider.interface';
import { ContextHealthService } from './context-health.service';

/**
 * Registry for all registered IContextProvider instances.
 *
 * Providers are injected via the CONTEXT_PROVIDER_TOKEN multi-provider
 * token — the registry has zero knowledge of concrete implementation
 * classes. Adding a new provider only requires registering it in
 * the module under the same token.
 */
@Injectable()
export class ProviderRegistry {
  private readonly logger = new Logger(ProviderRegistry.name);

  constructor(
    @Inject(CONTEXT_PROVIDER_TOKEN)
    @Optional()
    private readonly allProviders: IContextProvider[],
    private readonly healthService: ContextHealthService,
  ) {
    for (const p of (allProviders ?? [])) {
      this.logger.log(
        `Registered context provider: ${p.name} v${p.version} (available: ${p.isAvailable})`,
      );
    }
  }

  /**
   * Return all providers that are available AND not currently
   * circuit-broken ('down'). The aggregator uses this to decide
   * which providers to call in parallel.
   */
  getProviders(): IContextProvider[] {
    return (this.allProviders ?? []).filter((p) => {
      if (!p.isAvailable) return false;
      if (this.healthService.shouldSkip(p.name)) return false;
      return true;
    });
  }

  /**
   * Look up a single provider by name. Returns undefined if the
   * provider is unavailable or currently circuit-broken.
   */
  getProvider(name: string): IContextProvider | undefined {
    return (this.allProviders ?? []).find(
      (p) => p.name === name && p.isAvailable && !this.healthService.shouldSkip(p.name),
    );
  }

  /**
   * Return ALL registered providers regardless of health (for
   * health dashboard or admin endpoints).
   */
  getAllProviders(): IContextProvider[] {
    return this.allProviders ?? [];
  }
}
