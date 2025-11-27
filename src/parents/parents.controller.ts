import { Controller, Get, UseGuards } from '@nestjs/common';
import { ParentsService } from './parents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../users/entities/user.entity';
import { UserInfo } from '../util/decorators/user-info.decorator';
import { PartialUser } from '../users/interfaces/partial-user.entity';

@Controller('parents')
export class ParentsController {
  constructor(private readonly parentsService: ParentsService) {}

  // 자녀조회
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PARENT)
  @Get('/students')
  async getMyStudents(@UserInfo() user: PartialUser) {
    const userId = user.userId;
    const students = await this.parentsService.getMyStudents(userId);
    return students;
  }
}
