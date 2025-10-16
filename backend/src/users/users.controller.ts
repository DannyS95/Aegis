import {
  Controller,
  Get,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/nest/guards/jwt-auth.guard';
import { CurrentUser } from './nest/current-user.decorator';
import type { AuthenticatedUser } from '../auth/nest/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@CurrentUser() user?: AuthenticatedUser) {
    if (!user?.id) {
      throw new UnauthorizedException('Missing subject claim in token');
    }

    return this.usersService.findById(user.id);
  }
}
