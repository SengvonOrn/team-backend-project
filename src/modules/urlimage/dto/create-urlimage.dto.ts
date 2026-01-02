import { IsNumber, IsString, IsOptional } from 'class-validator';

export class CreateUrlimageDto {
  @IsNumber()
  userId: number;

  @IsString()
  @IsOptional()
  profile?: string;

  @IsString()
  @IsOptional()
  thumbnail?: string;
}
