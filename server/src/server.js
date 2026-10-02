import 'dotenv/config';
import app from './app.js';
import { connectDB } from './config/db.js';

const PORT = process.env.PORT || 5000;
// MongoDB Atlas 주소(MONGODB_ATLAS_URL)가 있으면 그쪽을 쓰고, 없을 때만 로컬 주소(MONGODB_URI)를 사용
const MONGODB_URI = process.env.MONGODB_ATLAS_URL || process.env.MONGODB_URI;

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set. Check your .env file.');
  process.exit(1);
}

if (!MONGODB_URI) {
  console.error('MONGODB_ATLAS_URL or MONGODB_URI is not set. Check your .env file.');
  process.exit(1);
}

await connectDB(MONGODB_URI);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
