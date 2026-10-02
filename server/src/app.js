import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middlewares/errorHandler.js';

const app = express();

// 배포 환경(Heroku)은 라우터(프록시) 뒤에서 돌아가므로, 프록시 한 단계가 알려 주는 접속 IP(X-Forwarded-For)를 믿음
// 로컬에서는 프록시가 없어 헤더를 꾸며 보낼 수 있으므로 켜지 않음
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

// credentials: 다른 origin에서도 로그인 쿠키를 주고받을 수 있도록 허용
app.use(cors({ origin: process.env.CLIENT_URL || true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
