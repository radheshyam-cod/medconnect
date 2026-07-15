import { Module } from '@nestjs/common';
import { FhirService } from './fhir.service';
import { FhirController } from './fhir.controller';

@Module({
  controllers: [FhirController],
  providers: [FhirService],
  exports: [FhirService]
})
export class FhirModule {}
