import { IsArray, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class IssueTokenDto {
  @IsOptional()
  @IsString()
  subject?: string;

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
  @IsString()
  role?: string;

  @IsOptional()
  @IsObject()
  claims?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(1)
  ttlSeconds?: number;
}
