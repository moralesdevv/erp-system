import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@erp.local' })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'StrongPass@123' })
  @IsString()
  @IsNotEmpty()
  @Length(8, 128)
  password: string;
}
