import { MigrationInterface, QueryRunner } from "typeorm";

export class AddImagesToAnalysis1778141182528 implements MigrationInterface {
    name = 'AddImagesToAnalysis1778141182528'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`analysis\` ADD \`images\` longtext NULL COMMENT '원본 이미지 base64 JSON 배열'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`analysis\` DROP COLUMN \`images\``);
    }
}
