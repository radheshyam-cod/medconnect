export class DashboardStatsDto {
  documentsThisMonth: number;
  totalDocuments: number;
  activeMedications: number;
  totalLabResults: number;
  upcomingRemindersToday: number;
  recentDocuments: RecentDocumentDto[];
  recentLabResults: RecentLabResultDto[];

  constructor(data: DashboardStatsDto) {
    Object.assign(this, data);
  }
}

export class RecentDocumentDto {
  id: string;
  fileName: string;
  documentType: string | null;
  status: string;
  createdAt: Date;

  constructor(data: RecentDocumentDto) {
    Object.assign(this, data);
  }
}

export class RecentLabResultDto {
  id: string;
  testName: string;
  value: string;
  unit: string | null;
  isAbnormal: boolean;
  date: Date;

  constructor(data: RecentLabResultDto) {
    Object.assign(this, data);
  }
}
