export class AITimelineKeyEventDto {
  date: string;
  title: string;
  type: string;
  significance: string;
}

export class AITimelineSummaryDto {
  summary: string;
  keyEvents: AITimelineKeyEventDto[];
  trends: string[];
  recommendations: string[];
  totalEventsInPeriod: number;
  periodStart: string;
  periodEnd: string;

  constructor(data: AITimelineSummaryDto) {
    Object.assign(this, data);
  }
}
