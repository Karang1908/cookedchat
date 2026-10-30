import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { loadConfig, placeholderKeys } from './config.js';
import { lanAddresses } from './lan.js';

const config = loadConfig();
const unfilled = placeholderKeys();
if (unfilled.length) console.warn(`[config] still placeholders, treated as unset: ${unfilled.join(', ')}`);
const app = await NestFactory.create(AppModule, { cors: config.corsOrigins === true ? true : { origin: config.corsOrigins } });
app.enableShutdownHooks();
await app.listen(config.port, '0.0.0.0');
const lan = lanAddresses()[0];
if (lan && !process.env.RENDER) console.log(`[local] phones on the same Wi-Fi: http://${lan}:3000 (QR codes point there too)`);
