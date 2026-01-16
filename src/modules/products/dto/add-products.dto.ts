import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsUrl,
  IsArray,
  ValidateNested,
} from 'class-validator';

export enum ImageType {
  MAIN = 'MAIN',
  GALLERY = 'GALLERY',
}

export class AddProductImageDto {
  @IsUrl()
  imageUrl: string;

  @IsOptional()
  @IsEnum(ImageType)
  imageType?: 'MAIN' | 'GALLERY';

  @IsOptional()
  @IsNumber()
  width?: number;

  @IsOptional()
  @IsNumber()
  height?: number;

  @IsOptional()
  @IsNumber()
  fileSize?: number;

  @IsOptional()
  @IsString()
  mimetype?: string;

  @IsOptional()
  @IsString()
  altText?: string;

  @IsOptional()
  @IsNumber()
  position?: number;
}

export class AddImagesRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddProductImageDto)
  images: AddProductImageDto[];
}
