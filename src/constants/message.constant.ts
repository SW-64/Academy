export const MESSAGES = {
  AUTH: {
    SUCCESS: {
      SIGN_UP: '회원가입에 성공했습니다.',
      SIGN_IN: '로그인에 성공했습니다.',
      SIGN_OUT: '로그아웃에 성공했습니다.',
      REFRESH: '토큰 재발급에 성공했습니다.',
      PASSWORD_CHANGE: '비밀번호 변경에 성공했습니다.',
      USER_INFO: '내 정보 조회에 성공했습니다.',
      USER_UPDATE: '내 정보 수정에 성공했습니다.',
      TOKEN_VALID: '토큰이 유효합니다.',
    },

    ERROR: {
      NOT_APPROVED: '관리자 승인 대기 중인 계정입니다.',
      DUPLICATED_EMAIL: '이미 가입된 이메일입니다.',
      DUPLICATED_PHONE: '이미 가입된 연락처입니다.',
      UNAUTHORIZED: '인증에 실패했습니다. 다시 로그인해주세요.',
    },

    VALIDATION: {
      SIGN_UP: {
        STUDENT_SCHOOL_GRADE_REQUIRED:
          '학생은 학교와 학년 정보를 입력해야 합니다.',
        PARENT_SCHOOL_GRADE_FORBIDDEN:
          '학부모는 학교와 학년 정보를 입력할 수 없습니다.',
      },

      NAME: {
        REQUIRED: '이름은 필수 입력 항목입니다.',
        INVALID_LENGTH: '이름은 2자 이상 20자 이하로 입력해주세요.',
      },

      EMAIL: {
        REQUIRED: '이메일은 필수 입력 항목입니다.',
        INVALID_FORMAT: '유효한 이메일 형식이 아닙니다.',
      },

      PASSWORD: {
        REQUIRED: '비밀번호는 필수 입력 항목입니다.',
        INVALID_FORMAT:
          '비밀번호는 영문자, 숫자, 특수문자를 포함한 8자 이상이어야 합니다.',
        CURRENT_REQUIRED: '기존 비밀번호는 필수 입력 항목입니다.',
        NEW_REQUIRED: '새 비밀번호는 필수 입력 항목입니다.',
        CURRENT_INCORRECT: '기존 비밀번호가 올바르지 않습니다.',
      },

      PASSWORD_CONFIRM: {
        REQUIRED: '비밀번호 확인은 필수 입력 항목입니다.',
        NOT_MATCHED: '비밀번호 확인이 비밀번호와 일치하지 않습니다.',
        NEW_REQUIRED: '새 비밀번호 확인은 필수 입력 항목입니다.',
        NEW_NOT_MATCHED: '새 비밀번호와 새 비밀번호 확인이 일치하지 않습니다.',
      },

      ROLE: {
        REQUIRED: '역할은 필수 입력 항목입니다.',
        INVALID: '역할은 PARENT 또는 STUDENT여야 합니다.',
      },

      PHONE: {
        REQUIRED: '연락처는 필수 입력 항목입니다.',
        INVALID_FORMAT: '연락처는 010으로 시작하는 11자리 숫자여야 합니다.',
      },
      SCHOOL: {
        REQUIRED: '학교는 필수 입력 항목입니다.',
        INVALID_FORMAT: '학교는 문자열이어야 합니다.',
      },
    },
  },
  ADMIN: {
    NOTICE: {
      SUCCESS: {
        CREATE: '공지사항이 성공적으로 생성되었습니다.',
        LIST: '공지사항 목록을 성공적으로 불러왔습니다.',
        GET: '공지사항을 성공적으로 불러왔습니다.',
        PINNED_LIST: '고정된 공지사항을 성공적으로 불러왔습니다.',
        UPDATE: '공지사항이 성공적으로 수정되었습니다.',
        DELETE: '공지사항이 성공적으로 삭제되었습니다.',
      },

      ERROR: {
        UNAUTHORIZED: {
          CREATE: '공지사항 생성 권한이 없습니다.',
          UPDATE: '공지사항 수정 권한이 없습니다.',
          DELETE: '공지사항 삭제 권한이 없습니다.',
        },
        NOT_FOUND: '존재하지 않는 공지사항입니다.',
      },

      VALIDATION: {
        CREATE: {
          TITLE_REQUIRED: '공지사항 제목은 필수 입력 항목입니다.',
          CONTENT_REQUIRED: '공지사항 내용은 필수 입력 항목입니다.',
        },
        UPDATE: {
          TITLE_REQUIRED: '수정할 제목을 입력해주세요.',
          CONTENT_REQUIRED: '수정할 내용을 입력해주세요.',
          NO_CHANGES: '변경된 정보가 없습니다.',
        },
      },
    },
    ACCOUNT: {
      SUCCESS: {
        APPROVE: '유저 계정이 승인되었습니다.',
        REJECT: '유저 계정이 거부되었습니다.',
        LIST: '유저 계정 전체가 조회되었습니다.',
        GET: '유저 계정이 조회되었습니다.',
        LIST_NON_APPROVED: '승인 대기 중인 유저 계정 목록이 조회되었습니다.',
        BLACKLIST: '블랙리스트 유저 계정 목록이 조회되었습니다.',
        UNBLACKLIST: '유저 계정이 블랙리스트에서 해제되었습니다.',
      },

      ERROR: {
        NOT_FOUND: '유저 계정이 없습니다.',
      },
    },
    EXAM: {
      SUCCESS: {
        CREATE: '시험 일정이 생성되었습니다.',
        LIST: '시험 일정 전체가 조회되었습니다.',
        GET: '시험 일정이 조회되었습니다.',
        UPDATE: '시험 일정이 수정되었습니다.',
        DELETE: '시험 일정이 삭제되었습니다.',
        CREATE_EXAM_AVERAGE: '시험 평균 점수가 생성되었습니다.',
        GET_WRONG_ANSWERS: '시험 오답 문제들이 조회되었습니다.',
        CALCULATE_ERROR_RATES: '시험 오답률이 계산되었습니다.',
        GET_ERROR_RATES: '시험 오답률이 조회되었습니다.',
        CALCULATE_RANKINGS: '시험 등수가 계산되었습니다.',
        GET_RANKINGS: '시험 등수가 조회되었습니다.',
        UPDATE_WRONG_ANSWERS: '시험 오답 문제가 수정되었습니다.',
      },

      ERROR: {
        UNAUTHORIZED: {
          CREATE: '시험 일정 생성 권한이 없습니다.',
          UPDATE: '시험 일정 수정 권한이 없습니다.',
          DELETE: '시험 일정 삭제 권한이 없습니다.',
        },
        NOT_FOUND: '시험 일정이 존재하지 않습니다.',
        ALREADY_EXISTS: '이미 존재하는 시험 일정입니다.',
        NO_EXAMS: '등록된 시험 일정이 없습니다.',
        INVALID_EXAM_DETAIL: '유효하지 않은 시험 문항입니다.',
      },

      VALIDATION: {
        CREATE: {
          YEAR_REQUIRED: '시험 연도는 필수 입력 항목입니다.',
          YEAR_INVALID_FORMAT: '시험 연도는 정수여야 합니다.',
          EXAM_TITLE_REQUIRED: '시험 이름은 필수 입력 항목입니다.',
          EXAM_DATE_REQUIRED: '시험 날짜는 필수 입력 항목입니다.',
          EXAM_INVALID_FORMAT: '시험 이름은 문자열이어야 합니다.',
          STUDENT_AVERAGE_REQUIRED: '학생 평균은 필수 입력 항목입니다.',
          EXAM_QUESTION_REQUIRED: '문항 번호는 필수 입력 항목입니다.',
          EXAM_QUESTION_INVALID_FORMAT: '문항 번호는 1 이상의 정수여야 합니다.',
          EXAM_POINTS_REQUIRED: '배점은 필수 입력 항목입니다.',
          EXAM_POINTS_INVALID_FORMAT: '배점은 1 이상의 정수여야 합니다.',
          EXAM_QUESTION_POINTS_LENGTH_MISMATCH:
            '문항 번호와 배점의 개수가 일치하지 않습니다.',
        },
        UPDATE: {
          YEAR_REQUIRED: '수정할 연도를 입력해주세요.',
          EXAM_TITLE_REQUIRED: '수정할 시험 이름을 입력해주세요.',
          EXAM_DATE_REQUIRED: '수정할 시험 날짜를 입력해주세요.',
          STUDENT_AVERAGE_REQUIRED: '수정할 학생 평균을 입력해주세요.',
          NO_CHANGES: '변경된 정보가 없습니다.',
          YEAR_INVALID_FORMAT: '시험 연도는 정수여야 합니다.',
          EXAM_INVALID_FORMAT: '시험 이름은 문자열이어야 합니다.',
          EXAM_QUESTION_INVALID_FORMAT: '문항 번호는 1 이상의 정수여야 합니다.',
          EXAM_POINTS_INVALID_FORMAT: '배점은 1 이상의 정수여야 합니다.',
          EXAM_QUESTION_POINTS_LENGTH_MISMATCH:
            '문항 번호와 배점의 개수가 일치하지 않습니다.',
          EXAM_DATE_INVALID_FORMAT:
            '시험 날짜는 올바른 날짜 형식이어야 합니다.',
        },
      },
    },
    PARENT: {
      SUCCESS: {
        LIST: '학부모 전체가 조회되었습니다.',
        GET: '학부모가 조회되었습니다.',
      },
      ERROR: {
        NOT_FOUND: '학부모가 존재하지 않습니다.',
        LIST: {
          INVALID_STATUS: 'status는 approved | pending만 허용됩니다.',
        },
      },
    },
    STUDENT: {
      SUCCESS: {
        LIST: '학생 전체가 조회되었습니다.',
        GET: '학생이 조회되었습니다.',
      },
      ERROR: {
        NOT_FOUND: '학생이 존재하지 않습니다.',
        LIST: {
          INVALID_STATUS: 'status는 approved | pending만 허용됩니다.',
        },
      },
    },
    GRADE: {
      SUCCESS: {
        CREATE: '시험 점수가 생성되었습니다.',
        LIST: '시험 점수 전체가 조회되었습니다.',
        GET: '해당 시험 점수가 조회되었습니다.',
        UPDATE: '시험 점수가 수정되었습니다.',
        DELETE: '시험 점수가 삭제되었습니다.',
        CREATE_EXAM_AVERAGE: '시험 평균 점수가 생성되었습니다.',
      },

      ERROR: {
        UNAUTHORIZED: {
          CREATE: '시험 점수 생성 권한이 없습니다.',
          UPDATE: '시험 점수 수정 권한이 없습니다.',
          DELETE: '시험 점수 삭제 권한이 없습니다.',
        },
        NOT_FOUND: '해당 시험 점수를 찾을 수 없습니다.',
        ALREADY_EXISTS: '이미 점수가 등록된 시험입니다.',
        NO_GRADES: '해당 시험에 등록된 점수가 없습니다.',
        STUDENT_NOT_APPROVED: '승인되지 않은 학생의 점수는 등록할 수 없습니다.',
      },

      VALIDATION: {
        CREATE: {
          STUDENT_ID_REQUIRED: '학생 아이디는 필수 입력 항목입니다.',
          STUDENT_ID_INVALID: '학생 아이디는 1 이상의 정수여야 합니다.',
          SCORE_REQUIRED: '점수는 필수 입력 항목입니다.',
          SCORE_INVALID: '점수는 정수여야 합니다.',
          SCORE_RANGE: '점수는 0~100 사이여야 합니다.',
          COMMENT_INVALID: '코멘트는 문자열이어야 합니다.',
          COMMENT_MAX_LENGTH: '코멘트는 500자 이하여야 합니다.',
        },
        UPDATE: {
          STUDENT_ID_REQUIRED: '수정할 학생 아이디를 입력해주세요.',
          STUDENT_ID_INVALID: '학생 아이디는 1 이상의 정수여야 합니다.',
          SCORE_REQUIRED: '수정할 시험 점수를 입력해주세요.',
          SCORE_INVALID: '점수는 정수여야 합니다.',
          SCORE_RANGE: '점수는 0~100 사이여야 합니다.',
          COMMENT_INVALID: '코멘트는 문자열이어야 합니다.',
          COMMENT_MAX_LENGTH: '코멘트는 500자 이하여야 합니다.',
          NO_CHANGES: '변경된 정보가 없습니다.',
        },
      },
    },
    ACTION_LOGS: {
      SUCCESS: {
        CREATE: '액션 로그가 성공적으로 생성되었습니다.',
        LIST: '액션 로그 목록을 성공적으로 불러왔습니다.',
        GET: '액션 로그를 성공적으로 불러왔습니다.',
      },
      VALIDATION: {
        CREATE: {
          ACTOR_ID_INVALID: '행위자 아이디는 숫자여야 합니다.',
          ACTION_INVALID: '액션은 문자열이어야 합니다.',
          TARGET_TYPE_INVALID: '대상 타입은 문자열이어야 합니다.',
          TARGET_ID_INVALID: '대상 아이디는 숫자여야 합니다.',
          DESCRIPTION_INVALID: '설명은 문자열이어야 합니다.',
          CHANGES_INVALID: '변경 사항은 객체여야 합니다.',
          ACTOR_TYPE_INVALID: '행위자 타입은 user 또는 admin이어야 합니다.',
        },
      },
    },
    USER: {
      SUCCESS: {
        LIST: '유저 계정 전체가 조회되었습니다.',
        GET: '유저 계정이 조회되었습니다.',
        UPDATE: '유저 계정이 수정되었습니다.',
        RESET_PASSWORD: '유저 비밀번호가 초기화되었습니다.',
        LINK_STUDENT_PARENT: '학생-부모 연동이 등록되었습니다.',
        UNLINK_STUDENT_PARENT: '학생-부모 연동이 해제되었습니다.',
      },
      ERROR: {
        NOT_FOUND: '유저 계정이 없습니다.',
        ALREADY_LINKED: '이미 연동된 학생-부모 관계입니다.',
        NO_CHANGE: '변경된 정보가 없습니다.',
      },
    },
    TEXTBOOK: {
      VALIDATION: {
        CREATE: {
          NAME_REQUIRED: '교재 이름은 필수 입력 항목입니다.',
          GRADE_REQUIRED: '교재 학년은 필수 입력 항목입니다.',
          LARGE_UNIT_REQUIRED: '대단원 개수는 필수 입력 항목입니다.',
          SMALL_UNIT_REQUIRED: '소단원 개수는 필수 입력 항목입니다.',
          CLASS_ID_INVALID_FORMAT: '반 아이디는 1 이상의 정수여야 합니다.',
          CLASS_ID_DUPLICATED: '반 아이디가 중복되었습니다.',
          UNITS_INVALID_FORMAT: '소단원의 각 요소들은 1이상의 정수여야 합니다.',
        },
        UPDATE: {
          NAME_INVALID_FORMAT: '교재 이름은 문자열이어야 합니다.',
          GRADE_INVALID_FORMAT: '교재 학년은 정수여야 합니다.',
          CLASS_ID_INVALID_FORMAT: '반 아이디는 1 이상의 정수여야 합니다.',
          CLASS_ID_DUPLICATED: '반 아이디가 중복되었습니다.',
          UNITS_INVALID_FORMAT: '소단원의 형식이 맞지 않습니다.',
        },
      },
      SUCCESS: {
        CREATE: '교재가 성공적으로 생성되었습니다.',
        GET_ALL: '교재 전체 조회에 성공했습니다.',
        GET_ONE: '교재 상세 조회에 성공했습니다.',
        UPDATE: '교재가 성공적으로 수정되었습니다.',
        DELETE: '교재가 성공적으로 삭제되었습니다.',
        GET_ALL_OF_CLASS: '반에 배정된 교재 전체 조회에 성공했습니다.',
      },
      ERROR: {
        NOT_FOUND: '교재를 찾을 수 없습니다.',
        NO_CHANGE: '변경된 정보가 없습니다.',
        INVALID_CLASS_ID: '존재하지 않는 반 아이디가 포함되어 있습니다.',
        CANNOT_SHRINK_CHAPTER_WITH_PROGRESS:
          '진행 데이터가 있을 시, 삭제 혹은 축소할 수 없습니다.',
      },
    },
    CLASS: {
      VALIDATION: {
        CREATE: {
          NAME_REQUIRED: '반 이름은 필수 입력 항목입니다.',
          NAME_INVALID_FORMAT: '반 이름은 문자열이어야 합니다.',
        },
        UPDATE: {
          NAME_INVALID_FORMAT: '반 이름은 문자열이어야 합니다.',
        },
      },
      ERROR: {
        NOT_FOUND: '반을 찾을 수 없습니다.',
        STUDENT_NOT_IN_CLASS: '해당 학생은 반에 속해있지 않습니다.',
      },
      SUCCESS: {
        CREATE: '반이 성공적으로 생성되었습니다.',
        GET_ALL: '반 전체 조회에 성공했습니다.',
        UPDATE: '반이 성공적으로 수정되었습니다.',
        DELETE: '반이 성공적으로 삭제되었습니다.',
        GET_ALL_OF_CLASS: '반에 배정된 학생 전체 조회에 성공했습니다.',
      },
    },
    HOMEWORK: {
      SUCCESS: {
        GET_PROGRESS: '숙제 진도 조회에 성공했습니다.',
        UPDATE_PROGRESS: '숙제 진도 수정에 성공했습니다.',
      },
      ERROR: {
        CLASS_TEXTBOOK_NOT_FOUND: '해당 반에 배정된 교재가 없습니다.',
        PROGRESS_NOT_FOUND: '해당 숙제 진도를 찾을 수 없습니다.',
        NO_UPDATE_ITEMS: '수정할 항목이 없습니다.',
      },
    },
    MATERIAL: {
      SUCCESS: {
        CREATE: '학습자료가 성공적으로 생성되었습니다.',
        LIST: '학습자료 목록을 성공적으로 불러왔습니다.',
        GET: '학습자료를 성공적으로 불러왔습니다.',
        UPDATE: '학습자료가 성공적으로 수정되었습니다.',
        DELETE: '학습자료가 성공적으로 삭제되었습니다.',
        UPLOAD: '학습자료 파일이 성공적으로 업로드되었습니다.',
        DOWNLOAD_URL: '다운로드 링크가 발급되었습니다.',
      },

      ERROR: {
        NOT_FOUND: '학습자료를 찾을 수 없습니다.',
        CLASS_NOT_FOUND: '존재하지 않는 반(classId)이 포함되어 있습니다.',
        FILE_REQUIRED: '업로드할 PDF 파일을 선택해 주세요.',
        INVALID_FILE_TYPE: 'PDF 파일만 업로드할 수 있습니다.',
        FILE_NOT_UPLOADED: '파일이 아직 업로드되지 않았습니다.',
        FORBIDDEN: '해당 학습자료에 접근 권한이 없습니다.',
      },

      VALIDATION: {
        CREATE: {
          TITLE_INVALID: '자료 제목은 문자열이어야 합니다.',
          TITLE_MAX_LENGTH: '자료 제목은 200자 이하여야 합니다.',

          DESC_INVALID: '자료 설명은 문자열이어야 합니다.',
          DESC_MAX_LENGTH: '자료 설명은 1000자 이하여야 합니다.',

          CLASS_IDS_INVALID: 'classIds는 배열이어야 합니다.',
          CLASS_IDS_EMPTY: 'classIds는 최소 1개 이상이어야 합니다.',
          CLASS_IDS_DUPLICATED: 'classIds에 중복된 값이 있습니다.',
          CLASS_ID_INVALID: 'classId는 1 이상의 정수여야 합니다.',
        },

        UPDATE: {
          TITLE_INVALID: '자료 제목은 문자열이어야 합니다.',
          TITLE_MAX_LENGTH: '자료 제목은 200자 이하여야 합니다.',

          DESC_INVALID: '자료 설명은 문자열이어야 합니다.',
          DESC_MAX_LENGTH: '자료 설명은 1000자 이하여야 합니다.',

          CLASS_IDS_INVALID: 'classIds는 배열이어야 합니다.',
          CLASS_IDS_EMPTY: 'classIds는 최소 1개 이상이어야 합니다.',
          CLASS_IDS_DUPLICATED: 'classIds에 중복된 값이 있습니다.',
          CLASS_ID_INVALID: 'classId는 1 이상의 정수여야 합니다.',

          NO_CHANGES: '변경된 정보가 없습니다.',
        },
      },
    },
  },

  USER: {
    ERROR: {
      NOT_FOUND: '유저를 찾을 수 없습니다.',
      VALIDATION: {
        PASSWORD_CONFIRM_NOT_MATCH:
          '비밀번호 확인이 비밀번호와 일치하지 않습니다.',
      },
    },
    SUCCESS: {
      INFO: '유저 정보 조회에 성공했습니다.',
      UPDATE: '유저 정보 수정에 성공했습니다.',
    },
  },

  STUDENTS: {
    GRADE: {
      SUCCESS: {
        SUMMARY: '나의 성적 현황 조회에 성공했습니다.',
        LEVEL_DISTRIBUTION: '나의 등급 분포 조회에 성공했습니다.',
        LIST: '나의 성적 목록 조회에 성공했습니다.',
        ONE: '나의 성적 상세 조회에 성공했습니다.',
      },
    },
    HOMEWORK: {
      SUCCESS: {
        GET_PROGRESS: '나의 숙제 진도 조회에 성공했습니다.',
      },
    },
    HOME: {
      SUCCESS: {
        GET: '학생 홈 정보 조회에 성공했습니다.',
      },
    },
    ERROR: {
      NOT_FOUND: '학생 정보를 찾을 수 없습니다.',
      NOT_IN_CLASS: '해당 반에 소속되지 않았습니다.',
    },
    CLASS: {
      SUCCESS: {
        GET_MY_CLASSES: '나의 클래스 목록 조회에 성공했습니다.',
      },
      ERROR: {
        NOT_FOUND: '해당 반에 소속되지 않았습니다.',
      },
    },
    SUCCESS: {},
  },

  PARENTS: {
    SUCCESS: {
      LIST: '나의 자녀 목록 조회에 성공했습니다.',
    },
    ERROR: {
      NOT_FOUND: '자녀가 존재하지 않습니다.',
    },
    CLASS: {
      SUCCESS: {
        GET_MY_CHILD_CLASSES: '나의 자녀 클래스 목록 조회에 성공했습니다.',
      },
      ERROR: {
        NOT_FOUND: '자녀가 존재하지 않습니다.',
      },
    },
    STUDENT: {
      ERROR: {
        NOT_FOUND: '자녀가 존재하지 않습니다.',
      },
    },
    HOMEWORK: {
      SUCCESS: {
        GET_MY_CHILD_PROGRESS: '나의 자녀 숙제 진도 목록 조회에 성공했습니다.',
      },
      ERROR: {
        CLASS_TEXTBOOK_NOT_FOUND: '클래스에 해당되는 교재가 없습니다.',
      },
    },
  },
} as const;
