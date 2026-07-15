import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

// Mock IORedis before anything else is imported
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    off: jest.fn(),
    quit: jest.fn(),
    disconnect: jest.fn(),
    status: 'ready',
    client: jest.fn().mockResolvedValue('OK'),
  }));
});

// Set dummy env variables for Supabase
process.env.SUPABASE_URL = 'http://localhost:8000';
process.env.SUPABASE_SERVICE_KEY = 'dummy-key';
process.env.CLERK_SECRET_KEY = 'dummy-clerk-key';
process.env.DATABASE_URL = 'postgresql://dummy:dummy@localhost:5432/dummy';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/database/prisma.service';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
    .overrideProvider(PrismaService)
    .useValue({
      $connect: jest.fn().mockResolvedValue(undefined),
      $disconnect: jest.fn().mockResolvedValue(undefined),
      user: { findUnique: jest.fn() },
    })
    .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/fhir/export (GET) without auth should return 401', () => {
    // ClerkAuthGuard should block this request
    return request(app.getHttpServer())
      .get('/fhir/export')
      .expect(401);
  });
});
