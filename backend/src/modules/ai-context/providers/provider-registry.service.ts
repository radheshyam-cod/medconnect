import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { IContextProvider } from './context-provider.interface';
import { Mem0ContextProvider } from './mem0-context.provider';
import { AlchemystContextProvider } from './alchemyst-context.provider';

@Injectable()
export class ProviderRegistry implements OnModuleInit {
  private readonly logger = new Logger(ProviderRegistry.name);
  private providers: Map<string, IContextProvider> = new Map();

  constructor(
    private readonly mem0Provider: Mem0ContextProvider,
    private readonly alchemystProvider: AlchemystContextProvider,
  ) {}

  onModuleInit() {
    this.register(this.mem0Provider);
    this.register(this.alchemystProvider);
  }

  register(provider: IContextProvider): void {
    if (this.providers.has(provider.name)) {
      this.logger.warn(`Provider ${provider.name} is already registered. Overwriting.`);
    }
    this.providers.set(provider.name, provider);
    this.logger.log(`Registered Context Provider: ${provider.name}`);
  }

  getProviders(): IContextProvider[] {
    return Array.from(this.providers.values()).filter(p => p.isAvailable);
  }

  getProvider(name: string): IContextProvider | undefined {
    const provider = this.providers.get(name);
    return provider?.isAvailable ? provider : undefined;
  }
}
