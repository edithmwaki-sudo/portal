import {
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { SessionsService } from './sessions.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { SessionResponseDto } from './dto/session-response.dto';

@ApiTags('sessions')
@ApiBearerAuth('access-token')
@Controller('sessions')
@UseInterceptors(ClassSerializerInterceptor)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  @ApiOperation({ summary: 'List the authenticated user\'s active sessions' })
  list(@CurrentUser() user: AuthenticatedUser): Promise<SessionResponseDto[]> {
    return this.sessionsService.listActiveForUser(user.userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke one of the authenticated user\'s sessions' })
  revoke(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ): Promise<void> {
    return this.sessionsService.revokeOne(user, id, req);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke all other sessions, keeping the current one' })
  revokeOthers(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<number> {
    return this.sessionsService.revokeOthers(user, req);
  }
}