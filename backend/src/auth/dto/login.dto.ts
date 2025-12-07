import { IsArray, IsEmail, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

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
  @IsString()
  role?: string;
}
