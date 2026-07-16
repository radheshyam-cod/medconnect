export class AITimelineSummaryDto {
  summary: string;
  keyEvents: Array<{
    date: string;
    title: string;
    type: string;
    significance: string;
  }>;
  trends: string[];
  recommendations: string[];
  totalEventsInPeriod: number;
  periodStart: string;
  periodEnd: string;

  constructor(data: AITimelineSummaryDto) {
    Object.assign(this, data);
  }
}
