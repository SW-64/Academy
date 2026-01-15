import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/entities/user.entity';
import { UserInfo } from '../util/decorators/user-info.decorator';
import { PartialUser } from '../users/interfaces/partial-user.entity';
import { MESSAGES } from '../constants/message.constant';

import { MaterialsService } from './materials.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';

@Controller('materials')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  /**
   * 학습자료 생성 (S3 제외, 메타만)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('')
  async createMaterial(
    @Body() dto: CreateMaterialDto,
    @UserInfo() admin: PartialUser,
  ) {
    const data = await this.materialsService.createMaterial(dto, admin.userId);
    return {
      statusCode: HttpStatus.CREATED,
      message: MESSAGES.ADMIN.MATERIAL.SUCCESS.CREATE,
      data,
    };
  }

  /**
   * 학습자료 목록 조회
   * sort: created_desc(기본) | title_asc
   * classId(선택): 특정 반에 배포된 자료만
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('')
  async getAllMaterials(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('sort') sort?: string,
    @Query('classId') classId?: string,
  ) {
    const _page = Math.max(Number(page) || 1, 1);
    const _limit = Math.min(Math.max(Number(limit) || 10, 1), 50);

    const sortOption = sort === 'title_asc' ? 'title_asc' : 'created_desc';
    const classIdNumber = classId ? Math.max(Number(classId) || 0, 0) : null;

    const data = await this.materialsService.getAllMaterials(
      { page: _page, limit: _limit },
      sortOption,
      classIdNumber,
    );

    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.MATERIAL.SUCCESS.LIST,
      data,
    };
  }

  /**
   * 학습자료 상세 조회
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('/:materialId')
  async getMaterial(@Param('materialId', ParseIntPipe) materialId: number) {
    const data = await this.materialsService.getMaterial(materialId);
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.MATERIAL.SUCCESS.GET,
      data,
    };
  }

  /**
   * 학습자료 수정 (title/description, 선택적으로 classIds 교체)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('/:materialId')
  async updateMaterial(
    @Param('materialId', ParseIntPipe) materialId: number,
    @Body() dto: UpdateMaterialDto,
    @UserInfo() admin: PartialUser,
  ) {
    await this.materialsService.updateMaterial(materialId, dto, admin.userId);
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.MATERIAL.SUCCESS.UPDATE,
    };
  }

  /**
   * 학습자료 삭제 (soft delete: material + class_material 함께)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete('/:materialId')
  async deleteMaterial(
    @Param('materialId', ParseIntPipe) materialId: number,
    @UserInfo() admin: PartialUser,
  ) {
    await this.materialsService.deleteMaterial(materialId, admin.userId);
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.MATERIAL.SUCCESS.DELETE,
    };
  }

  /**
   * 학습자료 파일 업로드 (S3 연동)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('/:materialId/file')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 25 * 1024 * 1024 }, // 예: 25MB 제한
      fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
          return cb(
            new BadRequestException(
              MESSAGES.ADMIN.MATERIAL.ERROR.INVALID_FILE_TYPE,
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadMaterialFile(
    @Param('materialId', ParseIntPipe) materialId: number,
    @UploadedFile() file: Express.Multer.File,
    @UserInfo() admin: PartialUser,
  ) {
    if (!file) {
      throw new BadRequestException(
        MESSAGES.ADMIN.MATERIAL.ERROR.FILE_REQUIRED,
      );
    }

    const data = await this.materialsService.uploadMaterialFile(
      materialId,
      file,
      admin.userId,
    );

    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.MATERIAL.SUCCESS.UPLOAD,
      data,
    };
  }
}
