// src/textbook/textbook.service.spec.ts
import { Test } from '@nestjs/testing';
import { DataSource, EntityManager } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TextbookService } from './textbook.service';
import { ClassTextbook } from '../class-textbook/entities/class-textbook.entity';
import { Textbook } from './entities/textbook.entity';

describe('CRITICAL-1 ClassTextbook race: INSERT IGNORE', () => {
  let service: TextbookService;
  let dataSource: DataSource;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TextbookService,
        {
          provide: DataSource,
          useValue: { transaction: jest.fn() },
        },
        { provide: getRepositoryToken(Textbook), useValue: {} },
        { provide: getRepositoryToken(ClassTextbook), useValue: {} },
      ],
    }).compile();

    service = module.get(TextbookService);
    dataSource = module.get(DataSource);
  });

  it('insertClassTextbooksIgnore()는 orIgnore()를 호출한다', async () => {
    const execute = jest.fn().mockResolvedValue({ identifiers: [] });
    const qb: any = {
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      orIgnore: jest.fn().mockReturnThis(),
      execute,
    };

    const manager: any = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    };

    await (service as any).insertClassTextbooksIgnore(manager, 10, [1, 2]);

    expect(manager.createQueryBuilder).toHaveBeenCalled();
    expect(qb.insert).toHaveBeenCalled();
    expect(qb.orIgnore).toHaveBeenCalled();
    expect(execute).toHaveBeenCalled();
  });
});
