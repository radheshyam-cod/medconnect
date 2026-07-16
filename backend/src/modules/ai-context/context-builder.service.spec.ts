import { Test, TestingModule } from '@nestjs/testing';
import { ContextBuilder } from './context-builder.service';
import { PrismaService } from '../database/prisma.service';

describe('ContextBuilder', () => {
  let builder: ContextBuilder;
  let prisma: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContextBuilder,
        {
          provide: PrismaService,
          useValue: {
            patientProfile: { findUnique: jest.fn() },
            document: { findMany: jest.fn() },
            timeline: { findMany: jest.fn() },
            medication: { findMany: jest.fn() },
            labResult: { findMany: jest.fn() },
            doctorSummary: { findFirst: jest.fn() },
          },
        },
      ],
    }).compile();

    builder = module.get<ContextBuilder>(ContextBuilder);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(builder).toBeDefined();
  });

  describe('buildPatientContext', () => {
    it('should return all context sections when data exists', async () => {
      prisma.patientProfile.findUnique.mockResolvedValue({
        userId: 'user_123',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'Male',
        bloodGroup: 'O+',
        allergies: ['Penicillin'],
      });
      prisma.document.findMany.mockResolvedValue([
        { id: 'doc_1', fileName: 'report.pdf', documentType: 'LAB_REPORT', documentDate: new Date('2024-01-15'), status: 'COMPLETED', createdAt: new Date() },
      ]);
      prisma.timeline.findMany.mockResolvedValue([
        { id: 'evt_1', eventType: 'VISIT', eventDate: new Date('2024-01-10'), title: 'Checkup', description: 'Regular checkup', severity: 'MILD', facility: 'Clinic', doctorName: 'Dr. Smith', diseases: [], medicines: [] },
      ]);
      prisma.medication.findMany.mockResolvedValue([
        { id: 'med_1', name: 'Metformin', dosage: '500mg', frequency: '1-0-1', isActive: true, startDate: new Date('2024-01-01'), endDate: null },
      ]);
      prisma.labResult.findMany.mockResolvedValue([
        { id: 'lab_1', testName: 'Blood Sugar', value: '140', unit: 'mg/dL', isAbnormal: true, date: new Date('2024-01-15'), category: 'Metabolic', referenceRange: '70-120' },
      ]);
      prisma.doctorSummary.findFirst.mockResolvedValue({
        currentConditions: ['Diabetes'],
        currentMedicines: ['Metformin'],
        allergies: ['Penicillin'],
        recentLabs: ['Blood Sugar: 140'],
        pastSurgeries: [],
        vitalSigns: [],
        generatedAt: new Date('2024-01-20'),
      });

      const context = await builder.buildPatientContext('user_123');
      
      expect(context).toBeDefined();
      expect(context.patientProfile).toBeDefined();
      expect(context.patientProfile!.age).toBeGreaterThan(30);
      expect(context.patientProfile!.gender).toBe('Male');
      expect(context.recentDocuments).toHaveLength(1);
      expect(context.recentTimeline).toHaveLength(1);
      expect(context.recentMedications).toHaveLength(1);
      expect(context.recentLabs).toHaveLength(1);
      expect(context.recentSummary).toBeDefined();
      expect(context.contextTimestamp).toBeDefined();
    });

    it('should handle empty data gracefully', async () => {
      prisma.patientProfile.findUnique.mockResolvedValue(null);
      prisma.document.findMany.mockResolvedValue([]);
      prisma.timeline.findMany.mockResolvedValue([]);
      prisma.medication.findMany.mockResolvedValue([]);
      prisma.labResult.findMany.mockResolvedValue([]);
      prisma.doctorSummary.findFirst.mockResolvedValue(null);

      const context = await builder.buildPatientContext('user_123');
      expect(context.patientProfile).toBeNull();
      expect(context.recentDocuments).toHaveLength(0);
      expect(context.recentTimeline).toHaveLength(0);
      expect(context.recentMedications).toHaveLength(0);
      expect(context.recentLabs).toHaveLength(0);
      expect(context.recentSummary).toBeNull();
    });
  });

  describe('compressContext', () => {
    it('should produce a concise string from context object', () => {
      const context = {
        patientProfile: { age: 34, gender: 'Male', bloodGroup: 'O+', allergies: ['Penicillin'] },
        recentDocuments: [{ id: '1', fileName: 'test.pdf', documentType: 'LAB_REPORT', documentDate: '2024-01-15', status: 'COMPLETED' }],
        recentTimeline: [{ id: '1', eventType: 'VISIT', eventDate: '2024-01-10', title: 'Checkup', description: 'Regular checkup', severity: 'MILD', facility: 'Clinic', doctorName: 'Dr. Smith', diseases: ['Diabetes'], medicines: ['Metformin'] }],
        recentMedications: [{ id: '1', name: 'Metformin', dosage: '500mg', frequency: '1-0-1', isActive: true }],
        recentLabs: [{ id: '1', testName: 'Blood Sugar', value: '140', unit: 'mg/dL', isAbnormal: true, date: '2024-01-15' }],
        recentSummary: { currentConditions: ['Diabetes'], currentMedicines: ['Metformin'], allergies: ['Penicillin'], recentLabs: [], pastSurgeries: [], vitalSigns: [], generatedAt: '2024-01-20' },
        contextTimestamp: '2024-01-20T00:00:00.000Z',
      } as any;

      const compressed = builder.compressContext(context);
      expect(compressed).toContain('Patient');
      expect(compressed).toContain('34');
      expect(compressed).toContain('Male');
      expect(compressed).toContain('Current Meds');
      expect(compressed).toContain('Metformin');
      expect(compressed).toContain('Known Conditions');
      expect(compressed).toContain('Diabetes');
      expect(compressed).toContain('Abnormal Labs');
      expect(compressed).toContain('Blood Sugar');
    });

    it('should handle null patient profile', () => {
      const context = {
        patientProfile: null,
        recentDocuments: [],
        recentTimeline: [],
        recentMedications: [],
        recentLabs: [],
        recentSummary: null,
        contextTimestamp: '2024-01-20T00:00:00.000Z',
      } as any;

      const compressed = builder.compressContext(context);
      expect(compressed).not.toContain('Patient');
    });
  });
});
