import { Test, TestingModule } from '@nestjs/testing';
import { UrlimageController } from './urlimage.controller';
import { UrlimageService } from './urlimage.service';

describe('UrlimageController', () => {
  let controller: UrlimageController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UrlimageController],
      providers: [UrlimageService],
    }).compile();

    controller = module.get<UrlimageController>(UrlimageController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
