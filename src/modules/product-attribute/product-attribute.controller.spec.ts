import { Test, TestingModule } from '@nestjs/testing';
import { ProductAttributeController } from './product-attribute.controller';

describe('ProductAttributeController', () => {
  let controller: ProductAttributeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductAttributeController],
    }).compile();

    controller = module.get<ProductAttributeController>(ProductAttributeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
