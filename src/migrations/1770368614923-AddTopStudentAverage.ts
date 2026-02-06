import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTopStudentAverage1234567890123 implements MigrationInterface {
  // 실행: DB에 변경사항 적용
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE exam 
            ADD COLUMN top_student_average DECIMAL(5,2) NULL 
            COMMENT '상위 학생 평균'
        `);
  }

  // 되돌리기: 변경사항 취소
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE exam 
            DROP COLUMN top_student_average
        `);
  }
}
