import { MemorySearchResult } from './memory.interface';

export const MEM0_PROVIDER_TOKEN = 'MEM0_PROVIDER_TOKEN';
export const ALCHEMYST_PROVIDER_TOKEN = 'ALCHEMYST_PROVIDER_TOKEN';

export interface IContextProvider {
  name: string;
  isAvailable: boolean;
  addMemory(
    messages: Array<{ role: string; content: string }>,
    userId: string,
    metadata?: Record<string, unknown>,
  ): Promise<unknown>;
  searchMemory(
    query: string,
    userId: string,
    limit?: number,
  ): Promise<MemorySearchResult[]>;
  getAllMemories(userId: string): Promise<any[]>;
  deleteMemory(memoryId: string): Promise<boolean>;
  deleteAllUserMemories(userId: string): Promise<boolean>;
}

export interface IContextOrchestrator extends IContextProvider {
  optimizeContext(
    patientProfileStr: string,
    memoryStr: string,
    extractionsStr?: string,
  ): Promise<string>;
}
