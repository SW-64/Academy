import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAnalysisTable1775639594869 implements MigrationInterface {
  name = 'CreateAnalysisTable1775639594869';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`analysis\` (
        \`id\`                 INT            NOT NULL AUTO_INCREMENT,
        \`job_id\`             VARCHAR(36)    NOT NULL COMMENT 'BullMQ Job UUID',
        \`original_file_name\` VARCHAR(255)   NOT NULL COMMENT '원본 파일명',
        \`result\`             LONGTEXT       NULL     COMMENT 'Claude 분석 결과',
        \`status\`             VARCHAR(20)    NOT NULL DEFAULT 'pending' COMMENT 'pending | completed | failed',
        \`created_at\`         DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`uq_analysis_job_id\` (\`job_id\`)
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`analysis\``);
  }
}
