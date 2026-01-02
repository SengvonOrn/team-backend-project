import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  Min,
} from 'class-validator';

export class UploadProductImageDto {
  @IsNotEmpty({ message: 'productId is required' })
  @IsString({ message: 'productId must be a string' })
  productId: string;

  @IsOptional()
  @IsString({ message: 'altText must be a string' })
  altText?: string;

  @IsOptional()
  @IsNumber({}, { message: 'position must be a number' })
  @Min(0, { message: 'position must be >= 0' })
  position?: number;
}
