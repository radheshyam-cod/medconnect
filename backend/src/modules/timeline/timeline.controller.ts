import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { TimelineService } from "./timeline.service";
import { CreateTimelineEventDto } from "./dto/create-timeline-event.dto";
import { QueryTimelineDto } from "./dto/query-timeline.dto";
import { TimelineEventDto, TimelineSummaryDto } from "./dto/timeline-response.dto";
import { AITimelineSummaryDto } from "./dto/ai-summary-response.dto";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("Timeline")
@ApiBearerAuth()
@Controller("timeline")
export class TimelineController {
  constructor(private readonly timelineService: TimelineService) {}

  @Get()
  @ApiOperation({ summary: "List timeline events with pagination and filters" })
  async findAll(
    @CurrentUser('id') clerkId: string,
    @Query() queryParams: QueryTimelineDto,
  ): Promise<{ events: TimelineEventDto[]; total: number }> {
    return this.timelineService.findAll(clerkId, queryParams);
  }

  @Get("summary")
  @ApiOperation({ summary: "Get timeline summary (counts by type/month)" })
  async getSummary(@CurrentUser('id') clerkId: string): Promise<TimelineSummaryDto> {
    return this.timelineService.getSummary(clerkId);
  }

  @Get("ai-summary")
  @ApiOperation({ summary: "Get AI-generated narrative summary of the last month's health timeline" })
  async getAISummary(@CurrentUser('id') clerkId: string): Promise<AITimelineSummaryDto> {
    return this.timelineService.getAISummary(clerkId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a single timeline event" })
  async findOne(
    @CurrentUser('id') clerkId: string,
    @Param("id") id: string,
  ): Promise<TimelineEventDto> {
    return this.timelineService.findOne(clerkId, id);
  }

  @Post()
  @ApiOperation({ summary: "Create a manual timeline event" })
  async create(
    @CurrentUser('id') clerkId: string,
    @Body() dto: CreateTimelineEventDto,
  ): Promise<TimelineEventDto> {
    return this.timelineService.create(clerkId, dto);
  }

  @Post("generate")
  @ApiOperation({ summary: "AI-generate timeline from document extractions" })
  async generate(
    @CurrentUser('id') clerkId: string,
    @Body() body: { extractionIds: string[] },
  ): Promise<TimelineEventDto[]> {
    return this.timelineService.generateFromExtractions(clerkId, body.extractionIds);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a timeline event" })
  async remove(@CurrentUser('id') clerkId: string, @Param("id") id: string): Promise<void> {
    return this.timelineService.remove(clerkId, id);
  }
}
