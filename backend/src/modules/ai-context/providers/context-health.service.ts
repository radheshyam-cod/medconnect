import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ContextHealthService {
  private readonly logger = new Logger(ContextHealthService.name);

  // Monitor latency, failures, retries, cache hit, provider availability, token usage
  recordLatency(providerName: string, latencyMs: number): void {
    this.logger.debug(`[ContextHealth] ${providerName} latency: ${latencyMs}ms`);
  }

  recordFailure(providerName: string, error: Error): void {
    this.logger.warn(`[ContextHealth] ${providerName} failure: ${error.message}`);
  }

  recordCacheHit(providerName: string, hit: boolean): void {
    this.logger.debug(`[ContextHealth] ${providerName} cache hit: ${hit}`);
  }
}
