import { IsNotEmpty, IsString } from 'class-validator';

export class CreateProductAttributeDto {
  @IsNotEmpty({ message: 'productId is required' })
  @IsString()
  productId: string;

  @IsNotEmpty({ message: 'attributeName is required' })
  @IsString()
  attributeName: string;

  @IsNotEmpty({ message: 'attributeValue is required' })
  @IsString()
  attributeValue: string;
}
