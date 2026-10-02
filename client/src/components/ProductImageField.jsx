import { useEffect, useRef, useState } from 'react'
import { getCloudinaryConfig, signCloudinaryParams } from '@/api/cloudinary.js'
import { cloudinaryImage, loadUploadWidget, uploadedImageUrl } from '@/utils/cloudinary.js'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024

// 위젯 색상을 관리자 화면 톤에 맞춤
const WIDGET_PALETTE = {
  window: '#F1F5F4',
  windowBorder: '#D3DFE0',
  tabIcon: '#0B2B3C',
  menuIcons: '#4B6470',
  textDark: '#0B2B3C',
  textLight: '#FFFFFF',
  link: '#1D5A73',
  action: '#0B2B3C',
  inactiveTabIcon: '#8A9CA4',
  error: '#DC2626',
  inProgress: '#1D5A73',
  complete: '#1D5A73',
  sourceBg: '#E2EAEA',
}

function ImagePlusIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7" />
      <path d="M16 5h6M19 2v6" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
    </svg>
  )
}

/**
 * Cloudinary 업로드 위젯으로 대표 이미지를 올리고 미리보기를 보여주는 입력칸
 * value: 이미지 URL / onChange(url): 업로드 완료 시 이미지 URL 전달 (위젯에서 자른 경우 자르기 변환 포함)
 * onWidgetOpen / onWidgetClose: 위젯이 열리고 닫힐 때 호출 (부모 팝업을 잠시 숨겼다 되살리는 용도)
 */
function ProductImageField({ value, onChange, error, disabled, onWidgetOpen, onWidgetClose }) {
  const widgetRef = useRef(null)
  const callbacksRef = useRef({ onChange, onWidgetOpen, onWidgetClose })
  const [status, setStatus] = useState('loading') // loading | ready | unavailable
  const [message, setMessage] = useState(null)

  // 위젯 콜백은 생성 시점에 고정되므로 최신 콜백을 ref로 참조
  useEffect(() => {
    callbacksRef.current = { onChange, onWidgetOpen, onWidgetClose }
  })

  useEffect(() => {
    let cancelled = false

    Promise.all([getCloudinaryConfig(), loadUploadWidget()])
      .then(([config, cloudinary]) => {
        if (cancelled) return
        widgetRef.current = cloudinary.createUploadWidget(
          {
            cloudName: config.cloudName,
            apiKey: config.apiKey,
            folder: config.folder,
            // 서명 업로드: 위젯이 만든 파라미터를 서버(관리자 전용)에 보내 서명을 받아 옴
            uploadSignature: (callback, paramsToSign) => {
              signCloudinaryParams(paramsToSign)
                .then(callback)
                .catch((err) => {
                  setMessage(err.message || '업로드 서명을 받지 못했어요.')
                  widgetRef.current?.close({ quiet: true })
                })
            },
            sources: ['local', 'url', 'camera'],
            multiple: false,
            maxFiles: 1,
            resourceType: 'image',
            clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
            maxImageFileSize: MAX_IMAGE_BYTES,
            cropping: true,
            croppingAspectRatio: 1,
            showSkipCropButton: true,
            singleUploadAutoClose: true,
            styles: { palette: WIDGET_PALETTE },
          },
          (err, result) => {
            if (err) {
              setMessage('이미지를 올리지 못했어요. 다시 시도해 주세요.')
              return
            }
            if (result.event === 'success') {
              setMessage(null)
              callbacksRef.current.onChange(uploadedImageUrl(result.info))
            }
            if (result.event === 'close') callbacksRef.current.onWidgetClose?.()
          },
        )
        setStatus('ready')
      })
      .catch((err) => {
        if (cancelled) return
        setStatus('unavailable')
        setMessage(err.status ? err.message : err.message || '이미지 업로드를 준비하지 못했어요.')
      })

    return () => {
      cancelled = true
      widgetRef.current?.destroy()
      widgetRef.current = null
    }
  }, [])

  const openWidget = () => {
    if (!widgetRef.current || disabled) return
    setMessage(null)
    callbacksRef.current.onWidgetOpen?.()
    widgetRef.current.open()
  }

  const shownError = error || message
  const buttonLabel = status === 'loading' ? '업로드 준비 중…' : value ? '이미지 변경' : '대표 이미지 업로드'
  const canOpen = status === 'ready' && !disabled

  return (
    <div className="modal-field modal-field-full">
      <span className="modal-field-label" id="product-image-label">
        대표 이미지
      </span>
      <div className={`dropzone${value ? ' has-image' : ''}${shownError ? ' is-invalid' : ''}`}>
        {value ? (
          <>
            <a href={value} target="_blank" rel="noreferrer" className="dropzone-preview-link" title="원본 이미지 새 창에서 보기">
              <img className="dropzone-preview" src={cloudinaryImage(value, { width: 400 })} alt="대표 이미지 미리보기" />
            </a>
            <div className="dropzone-actions">
              <button type="button" className="dropzone-change" onClick={openWidget} disabled={!canOpen}>
                {buttonLabel}
              </button>
              <button type="button" className="dropzone-remove" onClick={() => onChange('')} disabled={disabled}>
                이미지 삭제
              </button>
              <p className="dropzone-hint">이미지를 누르면 원본을 새 창에서 볼 수 있어요.</p>
            </div>
          </>
        ) : (
          <button
            type="button"
            className="dropzone-label"
            onClick={openWidget}
            disabled={!canOpen}
            aria-labelledby="product-image-label"
            aria-describedby={shownError ? 'product-image-error' : 'product-image-hint'}
          >
            <ImagePlusIcon />
            <span className="dropzone-title">{buttonLabel}</span>
            <span className="dropzone-hint" id="product-image-hint">
              JPG, PNG, WEBP · 최대 5MB · 정사각형으로 자를 수 있어요
            </span>
          </button>
        )}
      </div>
      {shownError && (
        <p id="product-image-error" className="modal-field-error" role="alert">
          {shownError}
        </p>
      )}
    </div>
  )
}

export default ProductImageField
