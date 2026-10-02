import { Link } from 'react-router-dom'
import { cloudinaryImage } from '@/utils/cloudinary.js'
import { formatPrice } from '@/utils/format.js'

function ProductCard({ product }) {
  return (
    <Link to={`/products/${product._id}`} className="card">
      <div className="card-image">
        {product.image ? <img src={cloudinaryImage(product.image, { width: 600 })} alt={product.name} loading="lazy" /> : <span>No Image</span>}
      </div>
      <div className="card-body">
        <h3>{product.name}</h3>
        <p className="price">{formatPrice(product.price)}</p>
      </div>
    </Link>
  )
}

export default ProductCard
