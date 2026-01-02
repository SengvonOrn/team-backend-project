import { Test, TestingModule } from '@nestjs/testing';
import { UrlimageService } from './urlimage.service';

describe('UrlimageService', () => {
  let service: UrlimageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UrlimageService],
    }).compile();

    service = module.get<UrlimageService>(UrlimageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
