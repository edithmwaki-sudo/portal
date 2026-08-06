import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentResponseDto } from './dto/student-response.dto';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { Permissions } from '../permissions/permissions';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@ApiTags('students')
@ApiBearerAuth('access-token')
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  @RequirePermission(Permissions.canViewStudent)
  @ApiOperation({ summary: 'List students (paginated, optional search)' })
  @ApiOkResponse({ description: 'Paginated student list' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const parsedPage = Math.max(parseInt(page ?? '1', 10) || 1, 1);
    const parsedLimit = Math.min(
      Math.max(parseInt(limit ?? '25', 10) || 25, 1),
      100,
    );
    const result = await this.studentsService.findAll(
      parsedPage,
      parsedLimit,
      search,
    );

    return {
      items: plainToInstance(StudentResponseDto, result.items, {
        excludeExtraneousValues: true,
      }),
      total: result.total,
      page: parsedPage,
      limit: parsedLimit,
    };
  }

  @Get(':id')
  @RequirePermission(Permissions.canViewStudent)
  @ApiOperation({ summary: 'Get a single student' })
  @ApiOkResponse({ type: StudentResponseDto })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const student = await this.studentsService.findOneById(id);
    return plainToInstance(StudentResponseDto, student, {
      excludeExtraneousValues: true,
    });
  }

  @Post()
  @RequirePermission(Permissions.canCreateStudent)
  @ApiOperation({ summary: 'Admit a student (creates user + student profile)' })
  @ApiCreatedResponse({ type: StudentResponseDto })
  async create(
    @Body() dto: CreateStudentDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const student = await this.studentsService.create(dto, actor.userId);
    return plainToInstance(StudentResponseDto, student, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  @RequirePermission(Permissions.canUpdateStudent)
  @ApiOperation({ summary: 'Update a student' })
  @ApiOkResponse({ type: StudentResponseDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStudentDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const student = await this.studentsService.update(id, dto, actor.userId);
    return plainToInstance(StudentResponseDto, student, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(Permissions.canDeleteStudent)
  @ApiOperation({ summary: 'Soft-delete a student and deactivate the user' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    await this.studentsService.remove(id, actor.userId);
  }
}
