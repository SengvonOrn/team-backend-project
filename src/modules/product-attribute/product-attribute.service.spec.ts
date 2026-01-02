import { Test, TestingModule } from '@nestjs/testing';
import { ProductAttributeService } from './product-attribute.service';

describe('ProductAttributeService', () => {
  let service: ProductAttributeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductAttributeService],
    }).compile();

    service = module.get<ProductAttributeService>(ProductAttributeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
