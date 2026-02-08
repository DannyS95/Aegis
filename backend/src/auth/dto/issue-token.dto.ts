import {
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ALLOWED_ROLES } from '../constants/auth.constants';
import type { AllowedRole } from '../constants/auth.constants';

export class IssueTokenDto {
  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value
        .split(' ')
        .map((item) => item.trim())
        .filter(Boolean);
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

  @IsOptional()
  @IsObject()
  claims?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(1)
  ttlSeconds?: number;
}
