import { Controller, Get, Param } from '@nestjs/common';
import { SummaryService } from './summary.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('summary')
export class SummaryController {
  constructor(private readonly summaryService: SummaryService) {}

  @Get('patient')
  getPatientSummary(@CurrentUser('id') clerkId: string) {
    return this.summaryService.generateSummary(clerkId, 'PATIENT');
  }

  @Get('doctor')
  getDoctorSummary(@CurrentUser('id') clerkId: string) {
    return this.summaryService.generateSummary(clerkId, 'DOCTOR');
  }
}
