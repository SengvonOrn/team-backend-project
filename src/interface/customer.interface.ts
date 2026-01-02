export interface ICustomer {
  id: string;
  userId: number;
  email: string;
  username: string | null;
  phone: string | null;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
  user?: any;
  orders?: any[];
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

export interface ICustomerQuery {
  page: number;
  limit: number;
  search?: string;
  status?: string;
}