export const MESSAGES = {
  AUTH: {
    SIGN_UP: {
      SUCCEED: '회원가입에 성공했습니다.',
      STUDENT: {
        SCHOOL_GRADE_REQUIRED: '학생은 학교와 학년 정보를 입력해야 합니다.',
      },
      PARENT: {
        SCHOOL_GRADE_FORBIDDEN:
          '학부모는 학교와 학년 정보를 입력할 수 없습니다.',
      },
    },
    SIGN_IN: {
      SUCCEED: '로그인에 성공했습니다.',
      NOT_APPROVED: '관리자 승인 대기중인 계정입니다.',
    },
    SIGN_OUT: {
      SUCCEED: '로그아웃에 성공했습니다.',
    },
    REFRESH: {
      SUCCEED: '토큰 재발급에 성공했습니다.',
    },
    PASSWORD_CHANGE: {
      SUCCEED: '비밀번호 변경에 성공했습니다.',
    },
    USER_INFO: {
      SUCCEED: '내 정보 조회에 성공했습니다.',
    },
    USER_UPDATE: {
      SUCCEED: '내 정보 수정에 성공했습니다.',
    },
    COMMON: {
      DUPLICATED: '이미 가입된 이메일입니다.',
      PASSWORD: {
        REQUIRED: '비밀번호 확인은 필수 입력 항목입니다.',
        INVALID_FORMAT:
          '비밀번호는 영문자, 숫자, 특수문자를 포함한 8자 이상이어야 합니다.',
      },
      NAME: {
        REQUIRED: '이름은 필수 입력 항목입니다.',
        INVALID_LENGTH: '이름은 2자 이상 20자 이하로 입력해주세요.',
      },
      EMAIL: {
        REQUIRED: '이메일은 필수 입력 항목입니다.',
        INVALID_FORMAT: '유효한 이메일 형식이 아닙니다.',
      },
      PASSWORD_CONFIRM: {
        NOT_MATCHED_WITH_PASSWORD:
          '비밀번호 확인이 비밀번호와 일치하지 않습니다.',
      },
      ROLE: {
        REQUIRED: '역할은 필수 입력 항목입니다.',
        IS: '역할은 PARENT 또는 STUDENT여야 합니다.',
      },
      PHONE: {
        REQUIRED: '연락처는 필수 입력 항목입니다.',
        INVALID_FORMAT: '연락처는 010으로 시작하는 11자리 숫자여야 합니다.',
      },
      JWT: {
        UNAUTHORIZED: '인증에 실패했습니다. 다시 로그인해주세요.',
      },
    },
  },
  ADMIN: {
    NOTICE: {
      CREATED: '공지사항이 성공적으로 생성되었습니다.',
      GET_ALL: '공지사항 목록을 성공적으로 불러왔습니다.',
      GET: '공지사항을 성공적으로 불러왔습니다.',
      UPDATED: '공지사항이 성공적으로 수정되었습니다.',
      DELETED: '공지사항이 성공적으로 삭제되었습니다.',
      UNAUTHORIZED: {
        CREATED: '공지사항 생성 권한이 없습니다.',
        UPDATED: '공지사항 수정 권한이 없습니다.',
        DELETED: '공지사항 삭제 권한이 없습니다.',
      },
      COMMON: {
        CREATE: {
          TITLE: '공지사항 제목은 필수 입력 항목입니다.',
          CONTENT: '공지사항 내용은 필수 입력 항목입니다.',
        },
        UPDATE: {
          NOT_EXISTED: '존재하지 않는 공지사항입니다.',
          TITLE: '수정할 제목을 입력해주세요.',
          CONTENT: '수정할 내용을 입력해주세요.',
          SAME: '변경된 정보가 없습니다.',
        },
      },
    },
    ACCOUNT: {
      UPDATE: {
        APPROVE: '유저 계정이 승인되었습니다.',
        REJECT: '유저 계정이 거부되었습니다.',
      },
    },
    EXAM: {
      CREATE: {
        OK: '시험일정이 생성되었습니다.',
        YEAR: '시험 해당년도는 필수 입력 항목입니다.',
        SEMESTER: '시험 학기는 필수 입력 항목입니다.',
        EXAM_DATE: '시험 날짜는 필수 입력 항목입니다.',
      },
      UNAUTHORIZED: {
        CREATED: '시험일정 생성 권한이 없습니다.',
        UPDATED: '시험일정 수정 권한이 없습니다.',
        DELETED: '시험일정 삭제 권한이 없습니다.',
      },
      GET: {
        ALL: '시험일정 전체가 조회되었습니다.',
        ONE: '시험일정이 조회되었습니다.',
        NOT_FOUND: '시험일정이 없습니다.',
      },
      NOT_EXISTED: '시험일정이 존재하지 않습니다.',
      UPDATE: {
        OK: '시험일정이 수정되었습니다.',
        YEAR: '수정할 해당년도를 입력해주세요.',
        SEMESTER: '수정할 학기를 입력해주세요.',
        EXAM_DATE: '수정할 시험 날짜를 입력해주세요.',
        SAME: '변경된 정보가 없습니다.',
      },
      DELETE: '시험일정이 삭제되었습니다.',
    },
    PARENT: {
      GET: {
        ALL: '학부모 전체가 조회되었습니다.',
        ONE: '학부모가 조회되었습니다.',
        NOT_FOUND: '학부모가 없습니다.',
      },
      NOT_EXISTED: '학부모가 존재하지 않습니다.',
    },
    STUDENT: {
      GET: {
        ALL: '학생 전체가 조회되었습니다.',
        ONE: '학생이 조회되었습니다.',
        NOT_FOUND: '학생이 없습니다.',
      },
      NOT_EXISTED: '학생이 존재하지 않습니다.',
    },
    GRADE: {
      CREATE: {
        OK: '시험점수가 생성되었습니다.',
        STUDENTID: '학생아이디는 필수 입력 항목입니다.',
        SUBJECT: '시험 과목은 필수 입력 항목입니다.',
        SCORE: '시험 점수는 필수 입력 항목입니다.',
      },
      UNAUTHORIZED: {
        CREATED: '시험점수 생성 권한이 없습니다.',
        UPDATED: '시험점수 수정 권한이 없습니다.',
        DELETED: '시험점수 삭제 권한이 없습니다.',
      },
      GET: {
        ALL: '시험 점수 전체가 조회되었습니다.',
        ONE: '해당 시험 점수가 조회되었습니다.',
      },
      NOT_EXISTED: '해당 시험 점수를 찾을 수 없습니다.',
      EXISTED: '이미 점수가 등록된 시험입니다.',
      UPDATE: {
        OK: '시험일정이 수정되었습니다.',
        STUDENTID: '수정할 학생아이드를 입력해주세요.',
        SUBJECT: '수정할 시험 과목을 입력해주세요.',
        SCORE: '수정할 시험 점수를 입력해주세요.',
        SAME: '변경된 정보가 없습니다.',
      },
      DELETE: '시험점수가 삭제되었습니다.',
    },
  },
  USER: {
    NOT_FOUND: '유저를 찾을 수 없습니다.',
  },
};
