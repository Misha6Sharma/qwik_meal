import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { dbService } from '../../src/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('VERIFY PAYMENT API CALLED');
  console.log('Request Received:', req.body);
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (!key_secret) {
      console.error('No key secret available for verification');
      return res.status(500).json({ error: 'Server misconfiguration: missing Razorpay secret' });
    }

    const hmac = crypto.createHmac('sha256', key_secret);
    hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
    const generated_signature = hmac.digest('hex');

    console.log(`Expected signature: ${generated_signature}, Received: ${razorpay_signature}`);

    if (generated_signature === razorpay_signature) {
      console.log('SIGNATURE VERIFIED');
      
      // Update order in Firestore server-side
      try {
        if (razorpay_order_id) {
          const order = await dbService.getOrderByPaymentReference(razorpay_order_id);
          if (order) {
            if (order.status === 'PENDING_PAYMENT') {
              await dbService.updateOrder(order.id, {
                status: 'PROCESSING',
                paymentStatus: 'PAID',
                updatedAt: new Date().toISOString()
              });
              console.log(`✅ Server verification updated DB order ${order.id} to PROCESSING and PAID.`);
            } else {
              console.log(`ℹ️ Order ${order.id} is already in status: ${order.status}. Ignored.`);
            }
          } else {
            console.warn(`⚠️ No matching DB order found for paymentReference: ${razorpay_order_id}`);
          }
        }
      } catch (dbError) {
        console.error('Failed to update order in Firestore during verification:', dbError);
        // We still return 200 below because the payment IS verified, 
        // and webhooks/client might also try to update the order.
      }

      return res.status(200).json({ verified: true });
    } else {
      console.error('Signature mismatch error!');
      return res.status(400).json({ error: 'Invalid signature' });
    }
  } catch (error) {
    console.error('Verification error:', error);
    return res.status(500).json({ error: 'Verification failed' });
  }
}
