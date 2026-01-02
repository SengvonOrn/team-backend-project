export interface IProductImage {
  id: string;
  productId: string;
  imageUrl: string;
  altText: string | null;
  position: number;
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

export interface IProductImageQuery {
  page: number;
  limit: number;
  productId?: string;
}
export interface IUploadResponse {
  success: boolean;
  message: string;
  data: IProductImage;
}