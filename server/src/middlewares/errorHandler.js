export function notFound(req, res) {
  res.status(404).json({ message: `Not found: ${req.originalUrl}` });
}

// unique 인덱스 중복(11000) 시 필드별 안내 메시지
const DUPLICATE_MESSAGES = {
  sku: '이미 사용 중인 상품ID(SKU)예요.',
  email: '이미 가입된 이메일이에요.',
};

// 스키마 검증 실패를 필드별 메시지로 정리. 형식 변환 실패(CastError)는 내부 메시지 대신 안내 문구로
function validationErrors(err) {
  return Object.fromEntries(
    Object.entries(err.errors).map(([path, e]) => [
      path,
      e.name === 'CastError' ? `${path} 값의 형식이 올바르지 않아요.` : e.message,
    ])
  );
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let message = err.message || 'Internal Server Error';
  let errors;

  if (err.name === 'ValidationError') {
    status = 400;
    errors = validationErrors(err);
    message = Object.values(errors)[0];
  } else if (err.name === 'CastError') {
    // URL의 :id 등이 형식에 맞지 않을 때. Mongoose 내부 메시지는 노출하지 않음
    status = 400;
    message = err.path === '_id' ? '잘못된 ID 형식이에요.' : `${err.path} 값의 형식이 올바르지 않아요.`;
  } else if (err.name === 'VersionError') {
    // 같은 문서를 다른 요청이 먼저 수정함 (예: 장바구니를 두 탭에서 동시에 변경)
    status = 409;
    message = '방금 다른 곳에서 변경됐어요. 새로고침 후 다시 시도해 주세요.';
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyValue ?? {})[0];
    message = DUPLICATE_MESSAGES[field] ?? `Duplicate value: ${field}`;
    errors = { [field]: message };
  }

  console.error(err);
  // errors: 등록 폼에서 필드 옆에 메시지를 보여줄 수 있도록 { 필드: 메시지 } 형태로 함께 전달
  res.status(status).json({ message, ...(errors && { errors }) });
}
