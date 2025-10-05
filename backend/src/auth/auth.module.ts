import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtConfigService } from './jwt/jwt-config.service';
import { JwtTokenService } from './jwt/jwt-token.service';
import { JwtAuthGuard } from './jwt/jwt-auth.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtConfigService, JwtTokenService, JwtAuthGuard],
  exports: [JwtConfigService, JwtTokenService, JwtAuthGuard],
})
export class AuthModule {}
