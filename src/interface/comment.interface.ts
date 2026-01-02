export interface IComment {
  id: string;
  userId: number;
  productId: string;
  title: string | null;
  comment: string;
  rating: number | null;
  createdAt: Date;
  updatedAt: Date;
  user?: any;
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

export interface ICommentQuery {
  page: number;
  limit: number;
  productId?: string;
  userId?: number;
  minRating?: number;
  maxRating?: number;
}
