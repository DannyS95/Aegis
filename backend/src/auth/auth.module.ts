import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './nest/guards/jwt-auth.guard';
import { JwtConfigService } from './jwt/services/jwt-config.service';
import { JwtTokenService } from './jwt/services/jwt-token.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtConfigService, JwtTokenService, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard, JwtConfigService, JwtTokenService],
})
export class AuthModule {}
