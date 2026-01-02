import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsPhoneNumber,
} from 'class-validator';

export class CreateCustomerDto {
  @IsNotEmpty()
  userId: number;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  // @IsPhoneNumber()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;
}
