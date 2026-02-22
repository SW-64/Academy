export interface StudentSearchResult {
  userId: string;
  studentId: number;
  name: string;
  school: string;
  grade: number;
  phone: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    lastPage: number;
  };
}
