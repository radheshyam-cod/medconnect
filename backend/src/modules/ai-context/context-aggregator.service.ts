import { Injectable, Logger } from '@nestjs/common';
import { MedicalContext } from './dto/medical-context.dto';
import { ProviderRegistry } from './providers/provider-registry.service';
import { ContextHealthService } from './providers/context-health.service';
import crypto from 'crypto';

@Injectable()
export class ContextAggregator {
  private readonly logger = new Logger(ContextAggregator.name);

  constructor(
    private readonly providerRegistry: ProviderRegistry,
    private readonly healthService: ContextHealthService,
    // Inject cache service here when implemented
  ) {}

  async aggregateContext(userId: string, query: string): Promise<MedicalContext> {
    const providers = this.providerRegistry.getProviders();
    const startTime = Date.now();

    const providerPromises = providers.map(async (provider) => {
      const providerStartTime = Date.now();
      try {
        const result = await provider.retrieveContext({ userId, query });
        this.healthService.recordLatency(provider.name, Date.now() - providerStartTime);
        return result;
      } catch (error) {
        this.healthService.recordFailure(provider.name, error as Error);
        return {};
      }
    });

    const results = await Promise.all(providerPromises);

    // Merge logic
    const mergedContext = this.mergeAndDeduplicate(results);

    this.logger.debug(`Aggregated context for user ${userId} in ${Date.now() - startTime}ms`);
    return mergedContext;
  }

  private mergeAndDeduplicate(contexts: Partial<MedicalContext>[]): MedicalContext {
    // This is a simplified merge strategy.
    // In a real implementation, you would resolve conflicts by comparing the 'confidence' scores 
    // of each ContextMetadata block, picking the data with the highest confidence score.

    const result: MedicalContext = {
      patient: null,
      conditions: [],
      medications: [],
      labs: [],
      timeline: [],
      riskFactors: [],
      importantEvents: [],
    };

    // Very naive merge for demonstration purposes
    for (const ctx of contexts) {
      if (ctx.patient && !result.patient) result.patient = ctx.patient;
      if (ctx.conditions) result.conditions.push(...ctx.conditions);
      if (ctx.medications) result.medications.push(...ctx.medications);
      if (ctx.labs) result.labs.push(...ctx.labs);
      if (ctx.timeline) result.timeline.push(...ctx.timeline);
      if (ctx.riskFactors) result.riskFactors.push(...ctx.riskFactors);
      if (ctx.importantEvents) result.importantEvents.push(...ctx.importantEvents);
    }

    // Deduplication logic would go here, comparing hashes
    // result.conditions = deduplicateByHash(result.conditions);

    return result;
  }
}
