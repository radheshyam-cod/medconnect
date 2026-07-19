import { Injectable, Logger } from '@nestjs/common';
import { IContextProvider } from './context-provider.interface';
import { ContextHealthService } from './context-health.service';

import { Mem0ContextProvider } from './mem0-context.provider';
import { AlchemystContextProvider } from './alchemyst-context.provider';

/**
 * Registry for all registered IContextProvider instances.
 */
@Injectable()
export class ProviderRegistry {
  private readonly logger = new Logger(ProviderRegistry.name);
  private readonly allProviders: IContextProvider[];

  constructor(
    private readonly mem0: Mem0ContextProvider,
    private readonly alchemyst: AlchemystContextProvider,
    private readonly healthService: ContextHealthService,
  ) {
    this.allProviders = [this.mem0, this.alchemyst];
    for (const p of this.allProviders) {
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
