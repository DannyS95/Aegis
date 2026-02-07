import {
  Body,
  Controller,
  Get,
  HttpCode,
  MethodNotAllowedException,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService, TokenResponse } from './auth.service';
import type { Request, Response } from 'express';
import { IssueTokenDto } from './dto/issue-token.dto';
import { LoginDto } from './dto/login.dto';
import { randomBytes } from 'node:crypto';
import {
  AUTH_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  resolveCookieOptions,
} from './constants/auth-cookie.constants';
import { JwtAuthGuard } from '../security/guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(200)
  @Post('token')
  async issueToken(
    @Body() body: IssueTokenDto,
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
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ ok: true }> {
    const tokenResponse = await this.authService.login(body);
    const csrfToken = randomBytes(32).toString('base64url');
    const cookieOptions = resolveCookieOptions();

    response.cookie(AUTH_COOKIE_NAME, tokenResponse.accessToken, {
      ...cookieOptions,
      httpOnly: true,
      maxAge: tokenResponse.expiresIn * 1000,
    });

    response.cookie(CSRF_COOKIE_NAME, csrfToken, {
      ...cookieOptions,
      httpOnly: false,
      maxAge: tokenResponse.expiresIn * 1000,
    });

    return { ok: true };
  }

  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response): { ok: true } {
    const cookieOptions = resolveCookieOptions();
    response.clearCookie(AUTH_COOKIE_NAME, cookieOptions);
    response.clearCookie(CSRF_COOKIE_NAME, cookieOptions);
    return { ok: true };
  }
}
