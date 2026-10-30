import { Controller, Get } from '@nestjs/common';
import { lanAddresses } from './lan.js';

@Controller()
export class HealthController {
  @Get('health')
  health() {
    return { ok: true, t: Date.now() };
  }

  /** local runs: the web app asks this so QR codes point at the laptop's Wi-Fi address instead of "localhost" */
  @Get('lan')
  lan() {
    return { ips: lanAddresses() };
  }
}
