import express from 'express';
import cors from 'cors';
import { courierRouter } from '../server/routes/courier';
import paymentRouter from '../server/routes/payment';
import { trackingRouter } from '../server/routes/tracking';
import adminStaffRouter from '../server/routes/adminStaff';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'houseofmahi-api' });
});

app.use('/courier', courierRouter);
app.use('/payment', paymentRouter);
app.use('/tracking', trackingRouter);
app.use('/admin/staff', adminStaffRouter);

export default app;
