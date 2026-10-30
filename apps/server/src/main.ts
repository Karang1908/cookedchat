import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { loadConfig, placeholderKeys } from './config.js';

const config = loadConfig();
const unfilled = placeholderKeys();
if (unfilled.length) console.warn(`[config] still placeholders, treated as unset: ${unfilled.join(', ')}`);
const app = await NestFactory.create(AppModule, { cors: config.corsOrigins === true ? true : { origin: config.corsOrigins } });
app.enableShutdownHooks();
await app.listen(config.port, '0.0.0.0');
