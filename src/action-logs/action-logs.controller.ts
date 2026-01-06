import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  UseGuards,
  HttpStatus,
  Param,
  ParseIntPipe,
} from '@nestjs/common';

import { CreateLogDto } from './dto/create-log.dto';
import { ActionLogsService } from './action-logs.service';
import { JwtAuthGuard } from './../auth/guards/jwt-auth.guard';
import { RolesGuard } from './../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/entities/user.entity';
import { MESSAGES } from './../constants/message.constant';

@Controller('logs')
export class ActionLogsController {
  constructor(private readonly actionLogsService: ActionLogsService) {}
  /**
   * 로그 생성
   * @param CreateLogDto
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  async createLog(@Body() createLogDto: CreateLogDto) {
    await this.actionLogsService.createLog(createLogDto);
    return {
      statusCode: HttpStatus.CREATED,
      message: MESSAGES.ADMIN.ACTION_LOGS.SUCCESS.CREATE,
    };
  }

  /**
   * 로그 전체조회
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get()
  async findAllLogs() {
    const data = await this.actionLogsService.findAllLogs();
    return {
      statusCode: HttpStatus.CREATED,
      message: MESSAGES.ADMIN.ACTION_LOGS.SUCCESS.LIST,
      data: data,
    };
  }

  /**
   * 특정 액터의 로그 조회
   * @param actorId
   * @returns
   */
  @Get('actor/:actorId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async findLogsByActor(@Param('actorId', ParseIntPipe) actorId: number) {
    const data = await this.actionLogsService.findLogsByActor(actorId);
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.ACTION_LOGS.SUCCESS.GET,
      data: data,
    };
  }
}
