import { PartialType } from '@nestjs/mapped-types';
import { CreateUrlimageDto } from './create-urlimage.dto';

export class UpdateUrlimageDto extends PartialType(CreateUrlimageDto) {}
