import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { JsonValue } from '@b2b-rental/shared';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOkResponse({ schema: { example: { ok: true } } })
  check() {
    const payload: JsonValue = { ok: true };
    return payload as { ok: true };
  }
}
