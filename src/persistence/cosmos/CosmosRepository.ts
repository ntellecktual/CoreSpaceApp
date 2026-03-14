import { CosmosDocument } from './cosmosTypes';

export type CosmosQueryOptions = {
  tenantId: string;
  entityType?: CosmosDocument['entityType'];
};

export interface CosmosRepository {
  upsertMany(documents: CosmosDocument[]): Promise<void>;
  query(options: CosmosQueryOptions): Promise<CosmosDocument[]>;
  deleteByTenant(tenantId: string): Promise<void>;
}
