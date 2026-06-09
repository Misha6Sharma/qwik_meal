import type { VercelRequest, VercelResponse } from '@vercel/node';
import Razorpay from 'razorpay';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { orderId } = req.query;
    
    if (!orderId || typeof orderId !== 'string') {
      return res.status(400).json({ error: 'orderId is required' });
    }

    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    
    if (!key_id || !key_secret) {
      return res.status(500).json({ error: 'Razorpay credentials are not configured on the server.' });
    }

    const instance = new Razorpay({ key_id, key_secret });
    const order = await instance.orders.fetch(orderId);
    
    return res.status(200).json({ status: order.status });
  } catch (error) {
    console.error('Fetch order status error:', error);
    return res.status(500).json({ error: 'Failed to fetch order status' });
  }
}
