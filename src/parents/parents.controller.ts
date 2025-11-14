import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
} from '@nestjs/common';
import { ParentsService } from './parents.service';

@Controller('parents')
export class ParentsController {
  constructor(private readonly parentsService: ParentsService) {}

  // 자녀조회
  @Get('/students')
  async findMyStudents(@Req() req) {
    const userId = req.user.id;
    const parentId = await this.parentsService.getParentByUserId(userId);
    const students = await this.parentsService.getMyStudents(parentId);
    return students;
  }
}
