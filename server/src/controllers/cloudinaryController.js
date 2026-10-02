import crypto from 'node:crypto';

// 업로드 서명 유효 시간. Cloudinary는 1시간까지 받아 주지만 재사용 여지를 줄이려고 더 짧게 제한
const MAX_TIMESTAMP_SKEW_SEC = 10 * 60;
// 서명 대상에서 제외되는 파라미터 (Cloudinary 규칙)
const UNSIGNED_KEYS = new Set(['file', 'cloud_name', 'resource_type', 'api_key']);

function readConfig() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_FOLDER } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) return null;
  return {
    cloudName: CLOUDINARY_CLOUD_NAME,
    apiKey: CLOUDINARY_API_KEY,
    apiSecret: CLOUDINARY_API_SECRET,
    folder: CLOUDINARY_FOLDER || 'shoppingmall/products',
  };
}

const NOT_CONFIGURED = 'Cloudinary 설정이 없어요. server/.env에 CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET을 입력해 주세요.';

// Cloudinary 서명 규칙: 키를 정렬해 key=value를 &로 잇고, 끝에 API Secret을 붙여 SHA-1
export function signParams(params, apiSecret) {
  const payload = Object.keys(params)
    .filter((key) => !UNSIGNED_KEYS.has(key) && params[key] !== undefined && params[key] !== null && params[key] !== '')
    .sort()
    .map((key) => `${key}=${Array.isArray(params[key]) ? params[key].join(',') : params[key]}`)
    .join('&');
  return crypto.createHash('sha1').update(payload + apiSecret).digest('hex');
}

// 업로드 위젯에 필요한 공개 설정값 (API Secret은 절대 내려주지 않음)
export function getCloudinaryConfig(req, res) {
  const config = readConfig();
  if (!config) return res.status(503).json({ message: NOT_CONFIGURED });
  res.json({ cloudName: config.cloudName, apiKey: config.apiKey, folder: config.folder });
}

// 업로드 위젯이 보낸 파라미터에 서명. 정해진 폴더에, 방금 만든 요청에만 서명해 줌
export function signCloudinaryUpload(req, res) {
  const config = readConfig();
  if (!config) return res.status(503).json({ message: NOT_CONFIGURED });

  const params = req.body?.paramsToSign;
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    return res.status(400).json({ message: '서명할 업로드 정보가 없어요.' });
  }
  const timestamp = Number(params.timestamp);
  if (!Number.isInteger(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > MAX_TIMESTAMP_SKEW_SEC) {
    return res.status(400).json({ message: '업로드 요청 시간이 올바르지 않아요. 다시 시도해 주세요.' });
  }
  if (params.folder !== config.folder) {
    return res.status(400).json({ message: '허용되지 않은 업로드 폴더예요.' });
  }
  const invalidValue = Object.values(params).some((value) => value !== null && typeof value === 'object' && !Array.isArray(value));
  if (invalidValue) return res.status(400).json({ message: '업로드 정보 형식이 올바르지 않아요.' });

  res.json({ signature: signParams(params, config.apiSecret) });
}
