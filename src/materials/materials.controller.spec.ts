import { Test, TestingModule } from '@nestjs/testing';
import { MaterialController } from './materials.controller';
import { MaterialService } from './materials.service';

describe('MaterialController', () => {
  let controller: MaterialController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MaterialController],
      providers: [MaterialService],
    }).compile();

    controller = module.get<MaterialController>(MaterialController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
