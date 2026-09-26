import 'reflect-metadata';
import helmet from 'helmet';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });
  const configService = app.get(ConfigService);

  // Railway terminates TLS and proxies every request through one hop before
  // it reaches this process — without this, Express's req.ip resolves to
  // that proxy's address for every client, collapsing them into a single
  // ThrottlerModule bucket (one client can throttle-lock /auth/login for
  // everyone) and making the per-IP brute-force limits on the auth
  // endpoints meaningless. `1` = trust exactly one hop (X-Forwarded-For's
  // rightmost entry), matching Railway's proxy topology.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.use(helmet());
  app.enableCors({
    origin: configService.get<string>('corsOrigin')!.split(','),
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

  const port = configService.get<number>('port')!;
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`ATLAS API listening on port ${port}`);
  if (docsEnabled) {
    // eslint-disable-next-line no-console
    console.log(`OpenAPI docs on /api/docs`);
  }
}

bootstrap();
