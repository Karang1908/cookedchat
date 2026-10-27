import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const app = await NestFactory.create(AppModule, { cors: config.corsOrigins === true ? true : { origin: config.corsOrigins } });
app.enableShutdownHooks();
await app.listen(config.port, '0.0.0.0');
