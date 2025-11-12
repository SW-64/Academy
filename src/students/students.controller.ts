import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  //성적 목록 조회
  @Get('/:studentId/grades')
  async getGrades(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Req() req,
  ) {
    const _page = Number(page) || 1;
    const _limit = Math.min(Number(limit) || 10, 50);

    const grades = await this.studentsService.findGarde(studentId, {
      page: _page,
      limit: _limit,
    });
    return grades;
  }

  @Post()
  create(@Body() createStudentDto: CreateStudentDto) {
    return this.studentsService.create(createStudentDto);
  }

  @Get()
  findAll() {
    return this.studentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.studentsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateStudentDto: UpdateStudentDto) {
    return this.studentsService.update(+id, updateStudentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.studentsService.remove(+id);
  }
}
