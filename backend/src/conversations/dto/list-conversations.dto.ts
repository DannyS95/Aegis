import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListConversationsQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  take?: number;
}
