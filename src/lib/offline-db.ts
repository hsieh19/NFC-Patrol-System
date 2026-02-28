import Dexie, { Table } from 'dexie';

export interface LocalPatrolRecord {
  id?: number;
  checkpointId?: string;
  nfcTagId?: string;
  timestamp: number;
  status: 'NORMAL' | 'ABNORMAL';
  notes?: string;
  synced: number; // 0 for false, 1 for true
}

export interface LocalRepairReport {
  id?: number;
  checkpointId?: string;
  description: string;
  imageUrls: string[];
  timestamp: number;
  synced: number; // 0 for false, 1 for true
}

export class OfflineDB extends Dexie {
  patrolRecords!: Table<LocalPatrolRecord>;
  repairReports!: Table<LocalRepairReport>;

  constructor() {
    super('XungengOffline');
    this.version(1).stores({
      patrolRecords: '++id, checkpointId, nfcTagId, timestamp, synced',
      repairReports: '++id, checkpointId, timestamp, synced'
    });
  }
}

export const offlineDb = new OfflineDB();
