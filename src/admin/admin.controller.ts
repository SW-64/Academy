import { Controller, Get, Post, Body, Patch, Param, Delete,
  Req,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateNoticeDto } from './dto/create-notice.dto';
import { MESSAGES } from '../constants/message.constant';
import { UpdateAdminDto } from './dto/update-admin.dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * 공지사항 생성
   * @param createNoticeDto
   * @returns
   */
  @Post('/notices')
  async createNotice(@Req() req, @Body() createNoticeDto: CreateNoticeDto) {
    const userId = req.user.userId;
    const notice = await this.adminService.createNotice(
      userId,
      createNoticeDto,
    );
    return {
      statusCode: HttpStatus.CREATED,
      message: MESSAGES.ADMIN.NOTICE.CREATED,
      data: notice,
    };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.adminService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAdminDto: UpdateAdminDto) {
    return this.adminService.update(+id, updateAdminDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.adminService.remove(+id);
  }
}
