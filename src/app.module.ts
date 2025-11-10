import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { StudentsModule } from './students/students.module';
import { ParentsModule } from './parents/parents.module';
import { AdminModule } from './admin/admin.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [AuthModule, StudentsModule, ParentsModule, AdminModule, UsersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
