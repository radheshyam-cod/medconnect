import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ContextBuilder {
  constructor(private readonly prisma: PrismaService) {}

  async buildPatientContext(userId: string): Promise<PatientAiContext> {
    const [
      patientProfile,
      recentDocuments,
      recentTimeline,
      recentMedications,
      recentLabs,
      recentSummary,
    ] = await Promise.all([
      this.getPatientProfile(userId),
      this.getRecentDocuments(userId),
      this.getRecentTimeline(userId),
      this.getRecentMedications(userId),
      this.getRecentLabs(userId),
      this.getRecentSummary(userId),
    ]);

    return {
      patientProfile,
      recentDocuments,
      recentTimeline,
      recentMedications,
      recentLabs,
      recentSummary,
      contextTimestamp: new Date().toISOString(),
    };
  }

  private async getPatientProfile(userId: string): Promise<PatientProfileContext | null> {
    const profile = await this.prisma.patientProfile.findUnique({
      where: { userId },
    });
    if (!profile) return null;

    return {
      age: profile.dateOfBirth
        ? Math.floor(
            (Date.now() - profile.dateOfBirth.getTime()) /
              (365.25 * 24 * 60 * 60 * 1000),
          )
        : undefined,
      gender: profile.gender || undefined,
      bloodGroup: profile.bloodGroup || undefined,
      allergies: profile.allergies || [],
    };
  }

  private async getRecentDocuments(userId: string): Promise<DocumentContext[]> {
    const documents = await this.prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        fileName: true,
        documentType: true,
        documentDate: true,
        status: true,
        createdAt: true,
      },
    });

    return documents.map((doc) => ({
      id: doc.id,
      fileName: doc.fileName,
      documentType: doc.documentType || undefined,
      documentDate: doc.documentDate?.toISOString().split('T')[0],
      status: doc.status,
    }));
  }

  private async getRecentTimeline(userId: string): Promise<TimelineContext[]> {
    const events = await this.prisma.timeline.findMany({
      where: { userId },
      orderBy: { eventDate: 'desc' },
      take: 20,
    });

    return events.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      eventDate: e.eventDate.toISOString().split('T')[0],
      title: e.title,
      description: e.description || undefined,
      severity: e.severity || undefined,
      facility: e.facility || undefined,
      doctorName: e.doctorName || undefined,
      diseases: e.diseases,
      medicines: e.medicines,
    }));
  }

  private async getRecentMedications(userId: string): Promise<MedicationContext[]> {
    const medications = await this.prisma.medication.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return medications.map((m) => ({
      id: m.id,
      name: m.name,
      dosage: m.dosage || undefined,
      frequency: m.frequency || undefined,
      isActive: m.isActive,
      startDate: m.startDate?.toISOString().split('T')[0],
      endDate: m.endDate?.toISOString().split('T')[0],
    }));
  }

  private async getRecentLabs(userId: string): Promise<LabContext[]> {
    const labs = await this.prisma.labResult.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 30,
    });

    return labs.map((l) => ({
      id: l.id,
      testName: l.testName,
      value: l.value,
      unit: l.unit || undefined,
      isAbnormal: l.isAbnormal,
      date: l.date.toISOString().split('T')[0],
      category: l.category || undefined,
      referenceRange: l.referenceRange || undefined,
    }));
  }

  private async getRecentSummary(userId: string): Promise<SummaryContext | null> {
    const summary = await this.prisma.doctorSummary.findFirst({
      where: { userId },
      orderBy: { generatedAt: 'desc' },
    });

    if (!summary) return null;

    return {
      currentConditions: summary.currentConditions,
      currentMedicines: summary.currentMedicines,
      allergies: summary.allergies,
      recentLabs: summary.recentLabs,
      pastSurgeries: summary.pastSurgeries,
      vitalSigns: summary.vitalSigns,
      generatedAt: summary.generatedAt.toISOString(),
    };
  }

  compressContext(context: PatientAiContext): string {
    const parts: string[] = [];

    // Patient profile
    if (context.patientProfile) {
      const p = context.patientProfile;
      parts.push(`Patient: ${p.age ? `${p.age} years` : ''} ${p.gender || ''} ${p.bloodGroup ? `| Blood: ${p.bloodGroup}` : ''}`.trim());
      if (p.allergies && p.allergies.length > 0) {
        parts.push(`Allergies: ${p.allergies.join(', ')}`);
      }
    }

    // Active medications (compressed)
    const activeMeds = context.recentMedications?.filter((m) => m.isActive) || [];
    if (activeMeds.length > 0) {
      parts.push(`Current Meds: ${activeMeds.map((m) => `${m.name}${m.dosage ? ' ' + m.dosage : ''}${m.frequency ? ' ' + m.frequency : ''}`).join(' | ')}`);
    }

    // Known conditions from timeline
    const conditions = context.recentTimeline
      ?.flatMap((e) => e.diseases || [])
      .filter((d, i, arr) => arr.indexOf(d) === i)
      .slice(0, 10);
    if (conditions?.length > 0) {
      parts.push(`Known Conditions: ${conditions.join(', ')}`);
    }

    // Recent labs (compressed - only abnormal ones if many)
    const labs = context.recentLabs || [];
    const abnormalLabs = labs.filter((l) => l.isAbnormal);
    const normalLabs = labs.filter((l) => !l.isAbnormal);
    if (abnormalLabs.length > 0) {
      parts.push(`Abnormal Labs: ${abnormalLabs.map((l) => `${l.testName}: ${l.value}${l.unit ? ' ' + l.unit : ''}`).join(' | ')}`);
    }
    if (normalLabs.length > 0 && normalLabs.length <= 5) {
      parts.push(`Labs: ${normalLabs.map((l) => `${l.testName}: ${l.value}${l.unit ? ' ' + l.unit : ''}`).join(' | ')}`);
    }

    // Recent timeline events (last 5)
    if (context.recentTimeline?.length > 0) {
      const recentEvents = context.recentTimeline.slice(0, 5);
      parts.push(`Recent Events: ${recentEvents.map((e) => `[${e.eventDate}] ${e.title}${e.facility ? ' @ ' + e.facility : ''}`).join(' | ')}`);
    }

    // Previous AI summary (if available)
    if (context.recentSummary) {
      const s = context.recentSummary;
      if (s.currentConditions?.length > 0) {
        parts.push(`Conditions (from prev summary): ${(s.currentConditions as string[]).join(', ')}`);
      }
      if (s.pastSurgeries?.length > 0) {
        parts.push(`Surgeries: ${(s.pastSurgeries as any[]).map((surg: any) => surg.procedure || surg.name).join(', ')}`);
      }
    }

    return parts.join('\n');
  }
}

// --- Context Types ---

export interface PatientAiContext {
  patientProfile?: PatientProfileContext | null;
  recentDocuments: DocumentContext[];
  recentTimeline: TimelineContext[];
  recentMedications: MedicationContext[];
  recentLabs: LabContext[];
  recentSummary?: SummaryContext | null;
  contextTimestamp: string;
}

export interface PatientProfileContext {
  age?: number;
  gender?: string;
  bloodGroup?: string;
  allergies?: string[];
}

export interface DocumentContext {
  id: string;
  fileName: string;
  documentType?: string;
  documentDate?: string;
  status: string;
}

export interface TimelineContext {
  id: string;
  eventType: string;
  eventDate: string;
  title: string;
  description?: string;
  severity?: string;
  facility?: string;
  doctorName?: string;
  diseases: string[];
  medicines: string[];
}

export interface MedicationContext {
  id: string;
  name: string;
  dosage?: string;
  frequency?: string;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
}

export interface LabContext {
  id: string;
  testName: string;
  value: string;
  unit?: string;
  isAbnormal: boolean;
  date: string;
  category?: string;
  referenceRange?: string;
}

export interface SummaryContext {
  currentConditions: any;
  currentMedicines: any;
  allergies: any;
  recentLabs: any;
  pastSurgeries: any;
  vitalSigns: any;
  generatedAt: string;
}
