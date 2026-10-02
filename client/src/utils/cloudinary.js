const WIDGET_SCRIPT_URL = 'https://upload-widget.cloudinary.com/latest/global/all.js'

let widgetScriptPromise = null

// Cloudinary 업로드 위젯 스크립트를 처음 필요할 때 한 번만 불러옴
export function loadUploadWidget() {
  if (window.cloudinary?.createUploadWidget) return Promise.resolve(window.cloudinary)
  if (!widgetScriptPromise) {
    widgetScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = WIDGET_SCRIPT_URL
      script.async = true
      script.onload = () => resolve(window.cloudinary)
      script.onerror = () => {
        widgetScriptPromise = null
        script.remove()
        reject(new Error('Cloudinary 업로드 위젯을 불러오지 못했어요.'))
      }
      document.head.appendChild(script)
    })
  }
  return widgetScriptPromise
}

const UPLOAD_PATH = '/image/upload/'
const isCloudinaryImage = (url) => /^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//.test(url ?? '')

// URL의 기존 변환(예: 자르기) 뒤, 버전(v123...) 앞에 변환을 추가
// Cloudinary는 변환을 앞에서부터 차례로 적용하므로 "자르기 → 크기 조절" 순서를 지키기 위함
function appendTransformation(url, transformation) {
  const start = url.indexOf(UPLOAD_PATH) + UPLOAD_PATH.length
  const segments = url.slice(start).split('/')
  const versionIndex = segments.findIndex((s) => /^v\d+$/.test(s))
  segments.splice(versionIndex === -1 ? 0 : versionIndex, 0, transformation)
  return url.slice(0, start) + segments.join('/')
}

// 업로드 위젯 결과에서 저장할 URL. 위젯에서 자른 경우 원본은 그대로 두고 좌표만 저장되므로
// 저장된 좌표로 자르는 변환(c_crop,g_custom)을 붙여 선택한 영역이 보이게 함
export function uploadedImageUrl(info) {
  return info.coordinates?.custom ? appendTransformation(info.secure_url, 'c_crop,g_custom') : info.secure_url
}

// Cloudinary 이미지 URL이면 크기에 맞춘 변환(잘라 채우기, 자동 포맷·화질)을 적용한 URL로 바꿈
// 원본 URL은 그대로 저장하고, 화면에 보여줄 때만 가볍게 불러오기 위함
export function cloudinaryImage(url, { width, height = width } = {}) {
  if (!width || !isCloudinaryImage(url)) return url
  return appendTransformation(url, `c_fill,w_${width},h_${height},q_auto,f_auto`)
}
