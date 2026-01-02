export interface IStore {
  id: string;
  userId: number;
  name: string;
  description: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  createdAt: Date;
  updatedAt: Date;
  products?: any[];
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

export interface IStoreQuery {
  page: number;
  limit: number;
  search?: string;
}
