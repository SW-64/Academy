import { Module } from '@nestjs/common';
import { ParentsService } from './parents.service';
import { ParentsController } from './parents.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Parent } from './entities/parent.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Parent])],
  controllers: [ParentsController],
  providers: [ParentsService],
})
export class ParentsModule {}
