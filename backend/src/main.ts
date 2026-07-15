import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";
import helmet from "helmet";

async function bootstrap() {
  const logger = new Logger("Bootstrap");

  const app = await NestFactory.create(AppModule);

  // Security headers
  app.use(helmet());

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(",") || [
      "http://localhost:3000",
      "http://localhost:3001",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  // Global prefix
  const apiPrefix = process.env.API_PREFIX || "/api/v1";
  app.setGlobalPrefix(apiPrefix);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global response transformer
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle("MedConnect India API")
    .setDescription("AI-powered Personal Health Record API for India")
    .setVersion("1.0")
    .addBearerAuth()
    .addTag("Auth", "Authentication endpoints")
    .addTag("Documents", "Document upload and management")
    .addTag("OCR", "Optical Character Recognition pipeline")
    .addTag("Timeline", "Health timeline management")
    .addTag("Medications", "Medication tracking")
    .addTag("Labs", "Lab results management")
    .addTag("Doctor Summary", "AI-generated doctor summaries")
    .addTag("Search", "Semantic and full-text search")
    .addTag("Family", "Family group management")
    .addTag("Sharing", "Secure health record sharing")
    .addTag("Notifications", "Push and email notifications")
    .addTag("Integrations", "External system integrations")
    .addTag("Admin", "Administrative endpoints")
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document);

  // Start server
  const port = process.env.API_PORT || 3001;
  await app.listen(port);
  logger.log(`MedConnect India API running on http://localhost:${port}${apiPrefix}`);
  logger.log(`Swagger docs at http://localhost:${port}${apiPrefix}/docs`);
}

bootstrap();
