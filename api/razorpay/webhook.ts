import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { dbService } from '../../src/db';

export const config = {
  api: {
    bodyParser: false,
  },
};

const getRawBody = async (req: VercelRequest): Promise<string> => {
  return new Promise((resolve, reject) => {
    let rawBody = '';
    req.on('data', chunk => {
      rawBody += chunk.toString();
    });
    req.on('end', () => resolve(rawBody));
    req.on('error', reject);
  });
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('RAZORPAY_WEBHOOK_SECRET is not configured.');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  const signature = req.headers['x-razorpay-signature'] as string;
  if (!signature) {
    console.error('Missing Razorpay signature.');
    return res.status(400).json({ error: 'Missing signature' });
  }

  let rawBody: string;
  try {
    rawBody = await getRawBody(req);
  } catch (err) {
    console.error('Error reading raw request body', err);
    return res.status(500).json({ error: 'Failed to read request body' });
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      console.error('Invalid signature. Webhook rejected.');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    console.log(`Received secure Razorpay webhook event: ${event}`);

    // We can handle either payment.captured or order.paid 
    // Both signify that the user has successfully finalized payment.
    if (event === 'payment.captured' || event === 'order.paid') {
      const entity = payload.payload.payment?.entity || payload.payload.order?.entity;
      // We stored the Razorpay order ID in db's 'paymentReference'
      // Depending on the event, the order id might be 'order_id' or 'id'
      const razorpayOrderId = entity.order_id || entity.id; 
      
      if (razorpayOrderId) {
        console.log(`Looking up DB order with paymentReference (Razorpay Order ID): ${razorpayOrderId}`);
        
        // This queries Firebase safely from the Vercel server backend
        const order = await dbService.getOrderByPaymentReference(razorpayOrderId);
        
        if (order) {
          console.log(`Found DB order: ${order.id}. Current status: ${order.status}`);
          
          if (order.status === 'PENDING_PAYMENT') {
            await dbService.updateOrder(order.id, {
               status: 'PROCESSING',
               paymentStatus: 'PAID',
               updatedAt: new Date().toISOString()
            });
            console.log(`✅ Webhook updated DB order ${order.id} to PROCESSING and PAID.`);
          } else {
            console.log(`ℹ️ Order ${order.id} is already in status: ${order.status}. Ignored.`);
          }
        } else {
          console.warn(`⚠️ No matching DB order found for paymentReference: ${razorpayOrderId}`);
        }
      } else {
        console.warn(`⚠️ No razorpay order ID could be parsed from the webhook entity.`);
      }
    }

    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}
