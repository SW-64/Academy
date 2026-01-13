import {
  Entity,
  Unique,
  Index,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  DeleteDateColumn,
  JoinColumn,
} from 'typeorm';
import { Material } from './material.entity';
import { Class } from '../../class/entities/class.entity';

@Entity({ name: 'class_material' })
@Unique('uq_cm_class_material', ['classId', 'materialId'])
@Index('idx_cm_class', ['classId'])
@Index('idx_cm_material', ['materialId'])
export class ClassMaterial {
  @PrimaryGeneratedColumn({ type: 'int', name: 'class_material_id' })
  classMaterialId: number;

  @Column({ type: 'int', name: 'material_id' })
  materialId: number;

  @ManyToOne(() => Material, (m) => m.classMaterials, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'material_id' })
  material: Material;

  @Column({ type: 'int', name: 'class_id' })
  classId: number;

  @ManyToOne(() => Class, (c) => c.classMaterials, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  class: Class;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;

  @DeleteDateColumn({ type: 'datetime', name: 'deleted_at', nullable: true })
  deletedAt: Date | null;
}
