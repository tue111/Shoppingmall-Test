import { useEffect, useRef, useState } from 'react'
import { createProduct, deleteProduct, PRODUCT_CATEGORIES, updateProduct } from '@/api/products.js'
import ProductImageField from './ProductImageField.jsx'

// 서버 스키마(Product.js)와 같은 규칙. 서버가 대문자로 저장하므로 여기서는 대소문자 모두 허용
const SKU_PATTERN = /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/

const EMPTY_FORM = { sku: '', name: '', price: '', category: '', image: '', description: '', stock: '0' }

function toForm(product) {
  if (!product) return EMPTY_FORM
  return {
    sku: product.sku,
    name: product.name,
    price: String(product.price),
    category: product.category,
    image: product.image,
    description: product.description ?? '',
    stock: String(product.stock ?? 0),
  }
}

const isNonNegativeInteger = (value) => /^\d+$/.test(String(value).trim())

// 서버와 같은 기준으로 먼저 검사해 불필요한 요청을 줄임. 최종 판단은 서버 검증
function validate(form) {
  const errors = {}
  const sku = form.sku.trim()
  if (!form.image) errors.image = '상품 이미지를 등록해 주세요.'
  if (!form.name.trim()) errors.name = '상품 이름을 입력해 주세요.'
  else if (form.name.trim().length > 100) errors.name = '상품 이름은 100자 이하로 입력해 주세요.'
  if (!sku) errors.sku = '상품ID(SKU)를 입력해 주세요.'
  else if (sku.length > 40) errors.sku = '상품ID(SKU)는 40자 이하로 입력해 주세요.'
  else if (!SKU_PATTERN.test(sku)) errors.sku = '상품ID(SKU)는 영문, 숫자, 하이픈(-)만 사용할 수 있어요.'
  if (!form.category) errors.category = '카테고리를 선택해 주세요.'
  if (String(form.price).trim() === '') errors.price = '상품 가격을 입력해 주세요.'
  else if (!isNonNegativeInteger(form.price)) errors.price = '상품 가격은 0원 이상의 정수로 입력해 주세요.'
  if (!isNonNegativeInteger(form.stock)) errors.stock = '재고는 0개 이상의 정수로 입력해 주세요.'
  return errors
}

function FieldError({ id, message }) {
  if (!message) return null
  return (
    <p id={id} className="modal-field-error" role="alert">
      {message}
    </p>
  )
}

/**
 * 상품 등록/수정 팝업. product가 있으면 수정 모드(삭제 가능), 없으면 등록 모드
 * onSaved(message): 저장·삭제 성공 시 호출 (목록 새로고침과 안내 문구 표시는 부모가 담당)
 */
function ProductFormModal({ product, onClose, onSaved }) {
  const isEdit = Boolean(product)
  const dialogRef = useRef(null)
  const [form, setForm] = useState(() => toForm(product))
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [saving, setSaving] = useState(false)
  const busy = saving

  // <dialog>.showModal(): 배경 비활성화, 포커스 가두기, Esc 처리를 브라우저가 담당
  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev))
  }

  const handleChange = (e) => setField(e.target.name, e.target.value)

  // 업로드 위젯은 <dialog>(최상위 레이어) 밖에 뜨므로, 위젯이 열려 있는 동안 팝업을 잠시 닫았다가 다시 띄움
  // (컴포넌트는 그대로 유지되어 입력값은 사라지지 않음)
  const hideForWidget = () => dialogRef.current?.close()
  const showAfterWidget = () => {
    if (dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const found = validate(form)
    setErrors(found)
    setFormError(null)
    if (Object.keys(found).length) return

    const payload = {
      sku: form.sku.trim(),
      name: form.name.trim(),
      price: Number(form.price),
      category: form.category,
      image: form.image,
      description: form.description.trim(),
      stock: Number(form.stock),
    }
    setSaving(true)
    try {
      if (isEdit) {
        await updateProduct(product._id, payload)
        onSaved('상품 정보를 수정했어요.')
      } else {
        await createProduct(payload)
        onSaved('상품을 등록했어요.')
      }
    } catch (err) {
      // 409(SKU 중복), 400(검증)은 필드 옆에 표시하고, 그 외에는 폼 하단에 표시
      if (err.errors) setErrors(err.errors)
      else setFormError(err.status ? err.message : '서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.')
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`'${product.name}' 상품을 삭제할까요? 삭제하면 되돌릴 수 없어요.`)) return
    setSaving(true)
    setFormError(null)
    try {
      await deleteProduct(product._id)
      onSaved('상품을 삭제했어요.')
    } catch (err) {
      setFormError(err.status ? err.message : '서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.')
      setSaving(false)
    }
  }

  const close = () => {
    if (!busy) onClose()
  }

  const fieldProps = (name) => ({
    id: `product-${name}`,
    name,
    value: form[name],
    onChange: handleChange,
    'aria-invalid': Boolean(errors[name]),
    'aria-describedby': errors[name] ? `product-${name}-error` : undefined,
  })

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-labelledby="product-modal-title"
      onCancel={(e) => {
        // Esc: 저장 중에는 닫지 않고, 닫을 때는 부모 상태로 언마운트
        e.preventDefault()
        close()
      }}
      // dialog 자체(= 바깥 어두운 영역)를 누른 경우에만 닫기
      onClick={(e) => e.target === dialogRef.current && close()}
    >
      <form className="modal-inner" onSubmit={handleSubmit} noValidate>
        <div className="modal-head">
          <h2 id="product-modal-title" className="modal-title">
            {isEdit ? '상품 수정' : '새 상품 등록'}
          </h2>
          <p className="modal-subtitle">스토어에 노출될 상품 정보를 입력해 주세요.</p>
          <button type="button" className="modal-close" onClick={close} aria-label="닫기" disabled={busy}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <ProductImageField
            value={form.image}
            onChange={(url) => setField('image', url)}
            error={errors.image}
            disabled={busy}
            onWidgetOpen={hideForWidget}
            onWidgetClose={showAfterWidget}
          />

          <div className="modal-field modal-field-full">
            <label htmlFor="product-name">상품명</label>
            <input {...fieldProps('name')} placeholder="예: 파도 린넨 셔츠" maxLength={100} />
            <FieldError id="product-name-error" message={errors.name} />
          </div>

          <div className="modal-field">
            <label htmlFor="product-sku">상품ID(SKU)</label>
            <input {...fieldProps('sku')} placeholder="예: TOP-LINEN-001" maxLength={40} autoCapitalize="characters" spellCheck={false} />
            {errors.sku ? (
              <FieldError id="product-sku-error" message={errors.sku} />
            ) : (
              <p className="modal-field-hint">영문, 숫자, 하이픈(-). 다른 상품과 겹칠 수 없어요.</p>
            )}
          </div>

          <div className="modal-field">
            <label htmlFor="product-category">카테고리</label>
            <select {...fieldProps('category')}>
              <option value="" disabled>
                카테고리 선택
              </option>
              {PRODUCT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <FieldError id="product-category-error" message={errors.category} />
          </div>

          <div className="modal-field">
            <label htmlFor="product-price">가격 (원)</label>
            <input {...fieldProps('price')} type="number" inputMode="numeric" min="0" step="1" placeholder="예: 89000" />
            <FieldError id="product-price-error" message={errors.price} />
          </div>

          <div className="modal-field">
            <label htmlFor="product-stock">재고 (개)</label>
            <input {...fieldProps('stock')} type="number" inputMode="numeric" min="0" step="1" />
            <FieldError id="product-stock-error" message={errors.stock} />
          </div>

          <div className="modal-field modal-field-full">
            <label htmlFor="product-description">
              상품 설명 <span className="field-optional">(선택)</span>
            </label>
            <textarea {...fieldProps('description')} rows={3} placeholder="예: 바닷바람처럼 가벼운 프렌치 린넨 셔츠" />
          </div>

          {formError && (
            <p className="modal-form-error modal-field-full" role="alert">
              {formError}
            </p>
          )}
        </div>

        <div className="modal-foot">
          {isEdit && (
            <button type="button" className="modal-button modal-button-danger" onClick={handleDelete} disabled={busy}>
              삭제
            </button>
          )}
          <div className="modal-foot-right">
            <button type="button" className="modal-button modal-button-ghost" onClick={close} disabled={busy}>
              취소
            </button>
            <button type="submit" className="modal-button modal-button-primary" disabled={busy}>
              {saving ? '저장하는 중…' : isEdit ? '저장하기' : '등록하기'}
            </button>
          </div>
        </div>
      </form>
    </dialog>
  )
}

export default ProductFormModal
