import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { DashboardService } from './dashboard.service.js';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('today')
  today(@CurrentUser() user: AuthUser) {
    return this.dashboard.today(user.id);
  }

  @Get('summary')
  summary(@CurrentUser() user: AuthUser) {
    return this.dashboard.summary(user.id);
  }
}
