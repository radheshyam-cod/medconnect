import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MemoryLogger {
  private readonly logger = new Logger('Memory');

  log(operation: string, details?: Record<string, unknown>): void {
    const safeDetails = this.sanitizeForLogging(details);
    this.logger.log(`[${operation}]${safeDetails ? ' ' + JSON.stringify(safeDetails) : ''}`);
  }

  warn(operation: string, details?: Record<string, unknown>): void {
    const safeDetails = this.sanitizeForLogging(details);
    this.logger.warn(`[${operation}]${safeDetails ? ' ' + JSON.stringify(safeDetails) : ''}`);
  }

  error(operation: string, error: Error | string, details?: Record<string, unknown>): void {
    const safeDetails = this.sanitizeForLogging(details);
    const errorMsg = typeof error === 'string' ? error : error.message;
    this.logger.error(
      `[${operation}] ${errorMsg}${safeDetails ? ' | ' + JSON.stringify(safeDetails) : ''}`,
    );
  }

  debug(operation: string, details?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === 'development') {
      const safeDetails = this.sanitizeForLogging(details);
      this.logger.debug(`[${operation}]${safeDetails ? ' ' + JSON.stringify(safeDetails) : ''}`);
    }
  }

  private sanitizeForLogging(details?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!details) return undefined;

    const sensitiveKeys = [
      'apiKey', 'token', 'secret', 'password', 'authorization',
      'rawText', 'rawOcrText', 'rawResponse', 'fullName', 'phone',
      'email', 'address', 'aadhar', 'pan', 'abhaId',
    ];

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(details)) {
      if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk.toLowerCase()))) {
        sanitized[key] = value ? '[REDACTED]' : value;
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeForLogging(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
}
