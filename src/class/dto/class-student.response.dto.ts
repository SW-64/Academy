export type ClassStudentsResponse = {
  classId: number;
  className: string;
  students: Array<{
    studentClassId: number;
    studentId: number;
    grade: number;
    school: string;
    userId: number;
    name: string;
    email: string;
  }>;
};
