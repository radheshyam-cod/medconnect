import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TimelineEventType, SeverityLevel, TimelineSource } from "@prisma/client";

export class TimelineEventDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  eventDate: Date;

  @ApiPropertyOptional()
  endDate?: Date;

  @ApiProperty({ enum: TimelineEventType })
  eventType: TimelineEventType;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional({ enum: SeverityLevel })
  severity?: SeverityLevel;

  @ApiPropertyOptional()
  facility?: string;

  @ApiPropertyOptional()
  doctorName?: string;

  @ApiProperty({ enum: TimelineSource })
  source: TimelineSource;

  @ApiPropertyOptional()
  documentId?: string;

  @ApiProperty()
  createdAt: Date;

  static fromPrisma(e: any): TimelineEventDto {
    return {
      id: e.id,
      userId: e.userId,
      eventDate: e.eventDate,
      endDate: e.endDate || undefined,
      eventType: e.eventType,
      title: e.title,
      description: e.description || undefined,
      severity: e.severity || undefined,
      facility: e.facility || undefined,
      doctorName: e.doctorName || undefined,
      source: e.source,
      documentId: e.documentId || undefined,
      createdAt: e.createdAt,
    };
  }
}

export class TimelineSummaryDto {
  @ApiProperty()
  totalEvents: number;

  @ApiProperty()
  byType: Record<string, number>;

  @ApiProperty()
  byMonth: Record<string, number>;

  @ApiProperty()
  recentEvents: TimelineEventDto[];
}
