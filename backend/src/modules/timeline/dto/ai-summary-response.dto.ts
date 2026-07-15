import { ApiProperty } from "@nestjs/swagger";

export class AIKeyEventDto {
  @ApiProperty()
  date: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  significance: string;
}

export class AITimelineSummaryDto {
  @ApiProperty()
  summary: string;

  @ApiProperty({ type: () => [AIKeyEventDto] })
  keyEvents: AIKeyEventDto[];

  @ApiProperty({ type: [String] })
  trends: string[];

  @ApiProperty({ type: [String] })
  recommendations: string[];

  @ApiProperty()
  totalEventsInPeriod: number;

  @ApiProperty()
  periodStart: string;

  @ApiProperty()
  periodEnd: string;

  constructor(data?: Partial<AITimelineSummaryDto>) {
    if (data) {
      Object.assign(this, data);
    }
  }
}
