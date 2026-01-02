
import { IsNotEmpty, IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class CreateCommentDto {
  @IsNotEmpty({ message: 'userId is required' })
  @IsNumber()
  userId: number;

  @IsNotEmpty({ message: 'productId is required' })
  @IsString()
  productId: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsNotEmpty({ message: 'comment is required' })
  @IsString()
  comment: string;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'rating must be >= 0' })
  @Max(5, { message: 'rating must be <= 5' })
  rating?: number;
}