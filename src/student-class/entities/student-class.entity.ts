import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Class } from '../../class/entities/class.entity';
import { Student } from './../../students/entities/student.entity';

@Entity({ name: 'student_class' })
@Index('uq_student_class', ['studentId', 'classId'], { unique: true })
export class StudentClass {
  @PrimaryGeneratedColumn({ name: 'student_class_id' })
  studentClassId: number;

  @Column({ name: 'student_id', type: 'int' })
  studentId: number;

  @Column({ name: 'class_id', type: 'int' })
  classId: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime', nullable: true })
  deletedAt: Date | null;

  @ManyToOne(() => Class, (c) => c.studentClasses, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'class_id', referencedColumnName: 'classId' })
  clazz: Class;

  @ManyToOne(() => Student, (c) => c.studentClasses, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'student_id', referencedColumnName: 'studentId' })
  student: Student;
}
