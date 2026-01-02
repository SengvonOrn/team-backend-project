// update-profile.dto.ts
import {
  IsString,
  IsOptional,
  IsEnum,
  ValidateNested,
  IsArray,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Status } from '@prisma/client';

export class UpdateLocationDto {
  @IsOptional()
  @IsNumber()
  id?: number; // For updating existing locations

  @IsString()
  addressLine: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsString()
  country: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsString()
  label?: string;
}



export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsEnum(Status)
  status?: Status;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateLocationDto)
  locations?: UpdateLocationDto[];
}
