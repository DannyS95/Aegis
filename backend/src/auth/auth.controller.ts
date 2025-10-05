import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AuthService, TokenResponse } from './auth.service';
import type { IssueTokenRequest, LoginRequest } from './auth.service';

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

  @HttpCode(200)
  @Post('login')
  async login(@Body() body: LoginRequest = {}): Promise<TokenResponse> {
    return this.authService.login(body);
  }
}
