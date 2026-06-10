import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { dbService } from '../../src/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_secret) {
    console.error('Server misconfiguration: missing Razorpay secret');
    return res.redirect(302, '/user/campaign-orders?payment=error&reason=config');
  }

  try {
    const hmac = crypto.createHmac('sha256', key_secret);
    hmac.update((razorpay_order_id || '') + '|' + (razorpay_payment_id || ''));
    const generated_signature = hmac.digest('hex');

    if (generated_signature === razorpay_signature) {
      console.log('Valid signature in callback. Updating order...');
      if (razorpay_order_id) {
        const order = await dbService.getOrderByPaymentReference(razorpay_order_id);
        if (order) {
          if (order.status === 'PENDING_PAYMENT') {
            await dbService.updateOrder(order.id, {
              status: 'PROCESSING',
              paymentStatus: 'PAID'
            });
            console.log(`✅ Order ${order.id} marked PAID.`);
          }
        }
      }
      return res.redirect(302, '/user/campaign-orders?payment=success');
    } else {
      console.error('Signature mismatch in callback!');
      return res.redirect(302, '/user/campaign-orders?payment=error&reason=invalid_signature');
    }
  } catch (error) {
    console.error('Callback error:', error);
    return res.redirect(302, '/user/campaign-orders?payment=error&reason=server_error');
  }
}
