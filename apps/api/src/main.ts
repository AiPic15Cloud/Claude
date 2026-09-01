import 'reflect-metadata';
import helmet from 'helmet';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });

  app.use(helmet());
  app.enableCors({
    origin: process.env.API_CORS_ORIGIN?.split(',') ?? 'http://localhost:5173',
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  // A full route/DTO map is a free reconnaissance tool for anyone probing
  // the API — every route stays behind JwtAuthGuard regardless, but there's
  // no reason to hand out the map in production. Set ENABLE_API_DOCS=true
  // to opt back in if ever needed there.
  const docsEnabled = process.env.NODE_ENV !== 'production' || process.env.ENABLE_API_DOCS === 'true';
  if (docsEnabled) {
    const config = new DocumentBuilder()
      .setTitle('ATLAS API')
      .setDescription(
        'Real Estate Intelligence Operating System — REST API (foundation, Cockpit & Portefeuille modules)',
      )
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // Railway (and most PaaS hosts) inject PORT — it takes priority over the
  // local-dev-oriented API_PORT variable.
  const port = process.env.PORT ?? process.env.API_PORT ?? 3001;
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`ATLAS API listening on port ${port}`);
  if (docsEnabled) {
    // eslint-disable-next-line no-console
    console.log(`OpenAPI docs on /api/docs`);
  }
}

bootstrap();
