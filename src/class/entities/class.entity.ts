import { ClassTextbook } from '../../class-textbook/entities/class-textbook.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
export class Class {
  @PrimaryGeneratedColumn({ name: 'class_id' })
  classId: number;

  @Column({ name: 'class_name', type: 'string' })
  className: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime', nullable: true })
  deletedAt: Date | null;

  @OneToMany(() => ClassTextbook, (ct) => ct.clazz)
  classTextbooks: ClassTextbook[];
}
