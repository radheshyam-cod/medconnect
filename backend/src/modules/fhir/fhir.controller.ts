import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { FhirService } from './fhir.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('FHIR')
@ApiBearerAuth()
@Controller('fhir')
export class FhirController {
  constructor(private readonly fhirService: FhirService) {}

  @Get('export')
  @ApiOperation({ summary: 'Export patient data in FHIR R4 JSON format' })
  async exportPatientData(@CurrentUser('id') clerkId: string, @Res() res: Response) {
    const fhirBundle = await this.fhirService.exportPatientData(clerkId);
    
    // Send as a downloadable JSON file
    res.setHeader('Content-Type', 'application/fhir+json');
    res.setHeader('Content-Disposition', 'attachment; filename=patient-fhir-export.json');
    res.send(fhirBundle);
  }
}
