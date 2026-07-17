import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Medication, LabResult, Timeline } from '@prisma/client';
import { MemorySynchronizer } from '../memory/memory-synchronizer.service';
import { MemoryLogger } from '../memory/memory-logger.service';

@Injectable()
export class FhirService {
  private readonly logger = new Logger(FhirService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly memorySynchronizer: MemorySynchronizer,
    private readonly memoryLogger: MemoryLogger,
  ) {}

  private async getInternalUserId(clerkId: string) {
    const user = await this.prisma.user.findUnique({ where: { clerkId } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /**
   * Generates a FHIR R4 standard JSON export for the patient.
   */
  async exportPatientData(clerkId: string) {
    const user = await this.getInternalUserId(clerkId);

    // Fetch all related patient data
    const [timeline, medications, labs, documents] = await Promise.all([
      this.prisma.timeline.findMany({ where: { userId: user.id } }),
      this.prisma.medication.findMany({ where: { userId: user.id } }),
      this.prisma.labResult.findMany({ where: { userId: user.id } }),
      this.prisma.document.findMany({ where: { userId: user.id } })
    ]);

    // FHIR Bundle to hold all resources
    const bundle = {
      resourceType: 'Bundle',
      type: 'collection',
      timestamp: new Date().toISOString(),
      entry: [] as Array<{ fullUrl: string; resource: Record<string, unknown> }>,
    };

    // 1. Map User to FHIR Patient Resource
    const patientResource = {
      fullUrl: `urn:uuid:${user.id}`,
      resource: {
        resourceType: 'Patient',
        id: user.id,
        name: [
          {
            use: 'usual',
            text: user.fullName || 'Unknown',
          }
        ],
        telecom: [
          {
            system: 'email',
            value: user.email,
          }
        ],
      }
    };
    bundle.entry.push(patientResource);

    // 2. Map Medications to FHIR MedicationStatement Resources
    medications.forEach((med: Medication) => {
      bundle.entry.push({
        fullUrl: `urn:uuid:${med.id}`,
        resource: {
          resourceType: 'MedicationStatement',
          id: med.id,
          status: med.isActive ? 'active' : 'completed',
          medicationCodeableConcept: {
            text: med.name
          },
          subject: {
            reference: `Patient/${user.id}`
          },
          dosage: [
            {
              text: `${med.dosage} ${med.frequency}`
            }
          ],
          dateAsserted: med.startDate ? new Date(med.startDate).toISOString() : new Date().toISOString()
        }
      });
    });

    // 3. Map Lab Results to FHIR Observation Resources
    labs.forEach((lab: LabResult) => {
      bundle.entry.push({
        fullUrl: `urn:uuid:${lab.id}`,
        resource: {
          resourceType: 'Observation',
          id: lab.id,
          status: 'final',
          category: [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                  code: 'laboratory',
                  display: 'Laboratory'
                }
              ]
            }
          ],
          code: {
            text: lab.testName
          },
          subject: {
            reference: `Patient/${user.id}`
          },
          effectiveDateTime: lab.date ? new Date(lab.date).toISOString() : new Date().toISOString(),
          valueString: lab.value,
          interpretation: [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
                  code: lab.isAbnormal ? 'A' : 'N',
                  display: lab.isAbnormal ? 'Abnormal' : 'Normal'
                }
              ]
            }
          ],
          referenceRange: lab.referenceRange ? [
            {
              text: lab.referenceRange
            }
          ] : undefined
        }
      });
    });

    // 4. Map Timeline Events to FHIR Condition/Encounter Resources
    timeline.forEach((event: Timeline) => {
      // Simplified: mapping to Condition for now
      bundle.entry.push({
        fullUrl: `urn:uuid:${event.id}`,
        resource: {
          resourceType: 'Condition',
          id: event.id,
          clinicalStatus: {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
                code: 'active'
              }
            ]
          },
          code: {
            text: event.title
          },
          subject: {
            reference: `Patient/${user.id}`
          },
          onsetDateTime: event.eventDate ? new Date(event.eventDate).toISOString() : new Date().toISOString(),
          note: [
            {
              text: event.description || ''
            }
          ]
        }
      });
    });

    // Trigger memory sync after FHIR export (fire-and-forget)
    this.memorySynchronizer.onFhirImported(user.id, {
      exportedAt: new Date().toISOString(),
      medicationCount: medications.length,
      labCount: labs.length,
      timelineCount: timeline.length,
      documentCount: documents.length,
    });
    this.memoryLogger.debug('FHIR_MEMORY_SYNC_TRIGGERED');

    return bundle;
  }
}
