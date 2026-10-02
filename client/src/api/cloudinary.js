import api from './client.js'

// 업로드 위젯에 필요한 공개 설정값 { cloudName, apiKey, folder } (관리자 전용)
export const getCloudinaryConfig = () => api.get('/uploads/cloudinary/config').then((res) => res.data)

// 위젯이 넘겨준 업로드 파라미터에 서버가 API Secret으로 서명 (관리자 전용)
export const signCloudinaryParams = (paramsToSign) =>
  api.post('/uploads/cloudinary/signature', { paramsToSign }).then((res) => res.data.signature)
