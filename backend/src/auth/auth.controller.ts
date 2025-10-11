import {
  Body,
  Controller,
  Get,
  HttpCode,
  MethodNotAllowedException,
  Post,
  Req,
} from '@nestjs/common';
import { AuthService, TokenResponse } from './auth.service';
import type { IssueTokenRequest, LoginRequest } from './auth.service';
import type { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(200)
  @Post('token')
  async issueToken(
    @Body() body: IssueTokenRequest = {},
  ): Promise<TokenResponse> {
    return this.authService.issueToken(body);
  }

  @Get('token')
  @HttpCode(405)
  handleUnsupportedTokenMethod(@Req() request: Request): never {
    throw new MethodNotAllowedException(
      `${request.method} is not supported for /auth/token. Use POST instead.`,
    );
  }

  @HttpCode(200)
  @Post('login')
  async login(@Body() body: LoginRequest = {}): Promise<TokenResponse> {
    return this.authService.login(body);
  }
}
