import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { TimelineEventType } from "@prisma/client";
import { PaginationDto } from "../../../common/dto/pagination.dto";

export class QueryTimelineDto extends PaginationDto {
  @ApiPropertyOptional({ enum: TimelineEventType })
  @IsOptional()
  @IsEnum(TimelineEventType)
  eventType?: TimelineEventType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  patientId?: string;
}
