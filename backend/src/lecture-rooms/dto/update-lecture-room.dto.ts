import { PartialType } from '@nestjs/mapped-types';
import { CreateLectureRoomDto } from './create-lecture-room.dto';

export class UpdateLectureRoomDto extends PartialType(CreateLectureRoomDto) {}
