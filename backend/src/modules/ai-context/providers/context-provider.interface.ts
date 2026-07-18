import { MedicalContext } from '../dto/medical-context.dto';

export interface ContextQuery {
  userId: string;
  query: string;
  limit?: number;
}

export interface IContextProvider {
  name: string;
  isAvailable: boolean;

  retrieveContext(query: ContextQuery): Promise<Partial<MedicalContext>>;
  
  updateContext(userId: string, data: Partial<MedicalContext>): Promise<void>;
}
