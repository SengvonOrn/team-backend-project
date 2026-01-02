export interface IProductImage {
  id: string;
  productId: string;
  imageUrl: string;
  altText: string | null;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProduct {
  id: string;
  storeId: string;
  name: string;
  slug: string;
  description: string | null;
  brand: string | null;
  category: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  store?: any;
  images?: IProductImage[];
  variants?: any[];
  attributes?: any[];
  comments?: any[];
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

export interface IProductQuery {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  storeId?: string;
  category?: string;
  brand?: string;
}
