import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Class } from './entities/class.entity';
import { In, Repository } from 'typeorm';
import { MESSAGES } from '../constants/message.constant';
import { ClassTextbook } from './../class-textbook/entities/class-textbook.entity';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { StudentClass } from './../student-class/entities/student-class.entity';
import { ActionLog } from './../action-logs/entities/action-logs.entity';
import { Student } from './../students/entities/student.entity';

@Injectable()
export class ClassService {
  constructor(
    @InjectRepository(Class)
    private readonly classRepository: Repository<Class>,
    @InjectRepository(ClassTextbook)
    private readonly classTextbookRepository: Repository<ClassTextbook>,
    @InjectRepository(StudentClass)
    private readonly studentClassRepository: Repository<StudentClass>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(ActionLog)
    private readonly actionLogRepository: Repository<ActionLog>,
  ) {}
  // 클래스 생성
  async createClass({ name, studentIds }: CreateClassDto, adminId: number) {
    const newClass = this.classRepository.create({
      className: name,
    });
    await this.classRepository.save(newClass);

    await this.studentClassRepository.save(
      studentIds?.map((studentId) =>
        this.studentClassRepository.create({
          classId: newClass.classId,
          studentId: studentId,
        }),
      ) || [],
    );

    // 로그 저장
    await this.actionLogRepository.save({
      actorId: adminId,
      actorType: 'admin',
      action: 'CREATE_CLASS',
      targetType: 'class',
      targetId: newClass.classId,
      description: `Admin created a class (classId: ${newClass.classId})`,
      createdAt: new Date(),
    });

    return;
  }

  // 클래스의 학생 목록 조회
  async getAllStudentsOfClass(classId: number) {
    const existedClass = await this.classRepository.findOneBy({ classId });
    if (!existedClass) {
      throw new NotFoundException(MESSAGES.ADMIN.CLASS.ERROR.NOT_FOUND);
    }
    const students = await this.classRepository.findOne({
      where: { classId },
      relations: [
        'studentClasses',
        'studentClasses.student',
        'studentClasses.student.user',
      ],
      select: {
        studentClasses: {
          studentClassId: true,
          student: {
            studentId: true,
            grade: true,
            school: true,
            user: {
              userId: true,
              name: true,
              email: true,
            },
          },
        },
      },
    });
    return students;
  }

  // 클래스 전체 목록 조회
  async getAllClasses() {
    const classes = await this.classRepository.find({
      select: {
        classId: true,
        className: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return classes;
  }

  // 클래스 수정
  async updateClass(
    updateClassDto: UpdateClassDto,
    adminId: number,
    classId: number,
  ) {
    const existedClass = await this.classRepository.findOneBy({ classId });
    if (!existedClass) {
      throw new NotFoundException(MESSAGES.ADMIN.CLASS.ERROR.NOT_FOUND);
    }
    if (updateClassDto.name !== undefined && updateClassDto.name !== null) {
      existedClass.className = updateClassDto.name;
    }

    // 학생 교체
    if (updateClassDto.studentIds !== undefined) {
      const targetIds = [...new Set(updateClassDto.studentIds)];

      // studentIds가 실제 존재하는 학생인지 검증
      const students = await this.studentRepository.find({
        where: { studentId: In(targetIds) },
        select: { studentId: true },
      });
      const validSet = new Set(students.map((s) => s.studentId));
      const invalid = targetIds.filter((id) => !validSet.has(id));
      if (invalid.length) {
        throw new BadRequestException(
          `존재하지 않는 학생이 포함되어 있습니다: ${invalid.join(', ')}`,
        );
      }

      // 현재 이 반에 속한 학생 목록
      const currentLinks = await this.studentClassRepository.find({
        where: { classId },
        select: { studentId: true, studentClassId: true },
      });
      const currentSet = new Set(currentLinks.map((l) => l.studentId));

      //제거/추가 계산
      const removeIds = [...currentSet].filter((id) => !validSet.has(id)); // 기존 - 최종
      const addIds = targetIds.filter((id) => !currentSet.has(id)); // 최종 - 기존
      console.log(removeIds, addIds);
      if (removeIds.length) {
        await this.studentClassRepository.delete({
          classId,
          studentId: In(removeIds),
        });
      }

      //추가: insert
      if (addIds.length) {
        await this.studentClassRepository
          .createQueryBuilder()
          .insert()
          .into(StudentClass)
          .values(addIds.map((sid) => ({ classId, studentId: sid })))
          .execute();
      }

      // 로그 저장
      await this.actionLogRepository.save({
        actorId: adminId,
        actorType: 'admin',
        action: 'UPDATE_CLASS',
        targetType: 'class',
        targetId: classId,
        description: `Admin updated a class (classId: ${classId})`,
        changes: updateClassDto,
        createdAt: new Date(),
      });
      return;
    }
  }

  // 클래스 삭제
  async deleteClass(adminId: number, classId: number) {
    const existedClass = await this.classRepository.findOneBy({ classId });
    if (!existedClass) {
      throw new NotFoundException(MESSAGES.ADMIN.CLASS.ERROR.NOT_FOUND);
    }
    await this.classRepository.softDelete({ classId });

    // 로그 저장
    await this.actionLogRepository.save({
      actorId: adminId,
      actorType: 'admin',
      action: 'DELETE_CLASS',
      targetType: 'class',
      targetId: classId,
      description: `Admin deleted a class (classId: ${classId})`,
      createdAt: new Date(),
    });
    return;
  }

  // 클래스의 교재 목록 조회
  async getAllTextbooksOfClass(classId: number) {
    const existedClass = await this.classRepository.findOneBy({ classId });
    if (!existedClass) {
      throw new NotFoundException(MESSAGES.ADMIN.CLASS.ERROR.NOT_FOUND);
    }

    const textbooks = await this.classTextbookRepository.find({
      where: { classId },
      relations: ['textbook'],
      select: {
        classTextbookId: true,
        classId: true,
        textbook: {
          textbookId: true,
          name: true,
          grade: true,
        },
      },
    });

    return textbooks;
  }
}
