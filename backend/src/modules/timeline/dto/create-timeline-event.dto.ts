import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEnum,
  IsOptional,
  IsString,
  IsArray,
  IsDateString,
} from "class-validator";
import { TimelineEventType, SeverityLevel } from "@prisma/client";

export class CreateTimelineEventDto {
  @ApiProperty({ enum: TimelineEventType })
  @IsEnum(TimelineEventType)
  eventType: TimelineEventType;

  @ApiProperty()
  @IsDateString()
  eventDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: SeverityLevel })
  @IsOptional()
  @IsEnum(SeverityLevel)
  severity?: SeverityLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  facility?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  doctorName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  diseases?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  medicines?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  procedureName?: string;
}
