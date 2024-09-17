import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cors from 'cors';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  // Create the app with the AppModule and enable logging for errors, warnings, and debug messages
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'debug'],
  });
  app.use(cookieParser())
  // Enable CORS for the frontend
  app.enableCors({
    origin: 'http://willm.corinth.informatik.rwth-aachen.de',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  await app.listen(3101);
}
bootstrap();
