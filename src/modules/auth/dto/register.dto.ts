import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
export class RegisterDto {
  @IsEmail()
  email: string;
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  name?: string;
}
