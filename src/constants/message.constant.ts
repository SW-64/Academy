export const MESSAGES = {
  AUTH: {
    SIGN_UP: {
      SUCCEED: '회원가입에 성공했습니다.',
    },
    SIGN_IN: {
      SUCCEED: '로그인에 성공했습니다.',
      NOT_APPROVED: '관리자 승인 대기중인 계정입니다.',
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
};
