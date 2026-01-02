export interface IProductAttribute {
  id: string;
  productId: string;
  attributeName: string;
  attributeValue: string;
  createdAt: Date;
  updatedAt: Date;
  product?: any;
}

export interface IPaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}
export interface IProductAttributeQuery {
  page: number;
  limit: number;
  productId?: string;
  attributeName?: string;
}
