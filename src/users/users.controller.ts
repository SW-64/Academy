import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * 내 정보 조회
   */
  @UseGuards(JwtAuthGuard)
  @Get('/me')
  async getMyInfo(@UserInfo() user: PartialUser) {
    const userId = user.userId;
    const data = await this.usersService.getMyInfo(userId);
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.AUTH.USER_INFO.SUCCEED,
      data: data,
    };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
