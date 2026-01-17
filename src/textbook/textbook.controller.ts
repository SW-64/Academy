import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TextbookService } from './textbook.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/users/entities/user.entity';
import { UserInfo } from 'src/util/decorators/user-info.decorator';
import { PartialUser } from 'src/users/interfaces/partial-user.entity';
import { CreateTextbookDto } from './dto/create-textbook.dto';
import { MESSAGES } from './../constants/message.constant';
import { UpdateTextbookDto } from './dto/update-textbook.dto';

@Controller('textbooks')
export class TextbookController {
  constructor(private readonly textbookService: TextbookService) {}

  /**
   * 교재 생성
   * @param createTextbookDto
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  async createTextbook(
    @UserInfo() admin: PartialUser,
    @Body() createTextbookDto: CreateTextbookDto,
  ) {
    const data = await this.textbookService.createTextbook(
      createTextbookDto,
      admin.userId,
    );
    return {
      statusCode: HttpStatus.CREATED,
      message: MESSAGES.ADMIN.TEXTBOOK.SUCCESS.CREATE,
      data: data,
    };
  }

  /**
   * 교재 목록 조회
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STUDENT, Role.PARENT)
  @Get()
  async getAllTextbooks() {
    const data = await this.textbookService.getAllTextbooks();
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.TEXTBOOK.SUCCESS.GET_ALL,
      data: data,
    };
  }

  /**
   * 교재 상세 조회
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('/:textbookId')
  async getOneTextbook(@Param('textbookId', ParseIntPipe) textbookId: number) {
    const data = await this.textbookService.getTextbookById(textbookId);
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.TEXTBOOK.SUCCESS.GET_ONE,
      data: data,
    };
  }

  /**
   * 교재 수정
   * @param updateTextbookDto
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('/:textbookId')
  async updateTextbook(
    @Param('textbookId', ParseIntPipe) textbookId: number,
    @UserInfo() admin: PartialUser,
    @Body() updateTextbookDto: UpdateTextbookDto,
  ) {
    await this.textbookService.updateTextbook(
      updateTextbookDto,
      admin.userId,
      textbookId,
    );
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.TEXTBOOK.SUCCESS.UPDATE,
    };
  }

  /**
   * 교재 삭제
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete('/:textbookId')
  async deleteTextbook(
    @Param('textbookId', ParseIntPipe) textbookId: number,
    @UserInfo() admin: PartialUser,
  ) {
    await this.textbookService.deleteTextbook(textbookId, admin.userId);
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.TEXTBOOK.SUCCESS.DELETE,
    };
  }
}
