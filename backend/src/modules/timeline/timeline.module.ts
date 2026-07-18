import { Module } from "@nestjs/common";
import { TimelineController } from "./timeline.controller";
import { TimelineService } from "./timeline.service";
import { FamilyModule } from "../family/family.module";

@Module({
  imports: [FamilyModule],
  controllers: [TimelineController],
  providers: [TimelineService],
  exports: [TimelineService],
})
export class TimelineModule {}
