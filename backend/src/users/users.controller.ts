import {
  Controller,
  Get,
  UnauthorizedException,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../security/guards/jwt-auth.guard';
import { CurrentUser } from './nest/current-user.decorator';
import type { AuthenticatedUser } from '../security/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  listUsers(@CurrentUser() user?: AuthenticatedUser) {
    if (!user?.id) {
      throw new UnauthorizedException('Missing subject claim in token');
    }

    if (user.role !== 'admin') {
      throw new ForbiddenException('Admin role required');
    }

    return this.usersService.listAll();
  }

  @Get('me')
  async getMe(@CurrentUser() user?: AuthenticatedUser) {
    if (!user?.id) {
      throw new UnauthorizedException('Missing subject claim in token');
    }

    return this.usersService.findById(user.id);
  }
}
