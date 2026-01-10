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
import { ClassService } from './class.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from './../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/entities/user.entity';
import { MESSAGES } from './../constants/message.constant';
import { UserInfo } from './../util/decorators/user-info.decorator';
import { PartialUser } from './../users/interfaces/partial-user.entity';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';

@Controller('class')
export class ClassController {
  constructor(private readonly classService: ClassService) {}

  /**
   * 클래스 생성
   * @param createClassDto
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  async createClass(
    @Body() createClassDto: CreateClassDto,
    @UserInfo() admin: PartialUser,
  ) {
    await this.classService.createClass(createClassDto, admin.userId);
    return {
      statusCode: HttpStatus.CREATED,
      message: MESSAGES.ADMIN.CLASS.SUCCESS.CREATE,
    };
  }

  /**
   * 클래스의 학생 목록 조회
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('/:classId/students')
  async getAllStudentsOfClass(@Param('classId', ParseIntPipe) classId: number) {
    const data = await this.classService.getAllStudentsOfClass(classId);
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.CLASS.SUCCESS.GET_ALL_OF_CLASS,
      data: data,
    };
  }

  /**
   * 클래스 전체 목록 조회
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get()
  async getAllClasses() {
    const data = await this.classService.getAllClasses();
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.CLASS.SUCCESS.GET_ALL,
      data: data,
    };
  }

  /**
   * 클래스 수정
   * @param updateClassDto
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('/:classId')
  async updateClass(
    @Body() updateClassDto: UpdateClassDto,
    @UserInfo() admin: PartialUser,
    @Param('classId', ParseIntPipe) classId: number,
  ) {
    await this.classService.updateClass(updateClassDto, admin.userId, classId);
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.CLASS.SUCCESS.UPDATE,
    };
  }

  /**
   * 클래스 삭제
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete('/:classId')
  async deleteClass(
    @UserInfo() admin: PartialUser,
    @Param('classId', ParseIntPipe) classId: number,
  ) {
    await this.classService.deleteClass(admin.userId, classId);
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.CLASS.SUCCESS.DELETE,
    };
  }

  /**
   * 클래스의 교재 목록 조회
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('/:classId/textbooks')
  async getAllTextbookOfClass(@Param('classId', ParseIntPipe) classId: number) {
    const data = await this.classService.getAllTextbooksOfClass(classId);
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.TEXTBOOK.SUCCESS.GET_ALL_OF_CLASS,
      data: data,
    };
  }
}
