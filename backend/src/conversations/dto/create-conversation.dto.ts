import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateConversationDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  participants?: string[];

  @IsOptional()
  @IsString()
  title?: string | null;

  @IsOptional()
  @IsBoolean()
  isGroup?: boolean;
}
