import { IsArray, IsEmail, IsIn, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ALLOWED_ROLES } from '../constants/auth.constants';
import type { AllowedRole } from '../constants/auth.constants';

export class LoginDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(' ').map((item) => item.trim()).filter(Boolean);
    }
    if (Array.isArray(value)) {
      return value;
    }
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  scope?: string[];

  @IsOptional()
  @IsIn(ALLOWED_ROLES)
  role?: AllowedRole;
}
