import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../security/guards/jwt-auth.guard';
import { JwtKeyProvider } from '../security/jwt/jwt-key.provider';
import { JwtTokenService } from '../security/jwt/jwt-token.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtKeyProvider, JwtTokenService, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard, JwtKeyProvider, JwtTokenService],
})
export class AuthModule {}
