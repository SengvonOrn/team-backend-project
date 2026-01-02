import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsUrl,
  Min,
} from 'class-validator';

export class CreateProductImageDto {
  @IsNotEmpty()
  @IsString()
  productId: string;

  @IsNotEmpty({ message: 'imageUrl is required' })
  @IsUrl({}, { message: 'imageUrl must be a valid URL' })
  imageUrl: string;

  @IsOptional()
  @IsString()
  altText?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  position?: number;
}
