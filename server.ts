import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Razorpay from "razorpay";
import crypto from "crypto";

async function startServer() {
  const app = express();
  // Parse JSON bodies with raw body for webhooks
  app.use(express.json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf;
    }
  }));

  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Razorpay Integration
  app.post("/api/razorpay/order", async (req, res) => {
    try {
      const { amount, currency = "INR" } = req.body;
      
      const key_id = process.env.RAZORPAY_KEY_ID;
      const key_secret = process.env.RAZORPAY_KEY_SECRET;
      
      if (!key_id || !key_secret) {
        return res.status(500).json({ error: "Razorpay credentials are not configured on the server." });
      }

      const instance = new Razorpay({ key_id, key_secret });

      const options = {
        amount: Math.round(amount * 100), // amount in smallest currency unit
        currency,
        receipt: `receipt_${Date.now()}`,
      };

      const order = await instance.orders.create(options);
      res.json({ ...order, key_id });
    } catch (error) {
      console.error("Razorpay order creation failed:", error);
      res.status(500).json({ error: "Failed to create Razorpay order" });
    }
  });

  app.post("/api/razorpay/verify", (req, res) => {
    console.log("VERIFY PAYMENT API CALLED");
    console.log("Request Received:", req.body);
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
      const key_secret = process.env.RAZORPAY_KEY_SECRET;

      if (!key_secret) {
        console.error("No key secret available for verification");
        return res.status(500).json({ error: "Server misconfiguration: missing Razorpay secret" });
      }

      const hmac = crypto.createHmac('sha256', key_secret);
      hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
      const generated_signature = hmac.digest('hex');

      console.log(`Expected signature: ${generated_signature}, Received: ${razorpay_signature}`);

      if (generated_signature === razorpay_signature) {
        console.log("SIGNATURE VERIFIED");
        res.json({ verified: true });
      } else {
        console.error("Signature mismatch error!");
        res.status(400).json({ error: "Invalid signature" });
      }
    } catch (error) {
      console.error("Verification error:", error);
      res.status(500).json({ error: "Verification failed" });
    }
  });

  app.get("/api/razorpay/status/:orderId", async (req, res) => {
    try {
      const key_id = process.env.RAZORPAY_KEY_ID;
      const key_secret = process.env.RAZORPAY_KEY_SECRET;
      
      if (!key_id || !key_secret) {
        return res.status(500).json({ error: "Razorpay credentials are not configured on the server." });
      }

      const instance = new Razorpay({ key_id, key_secret });
      const order = await instance.orders.fetch(req.params.orderId);
      res.json({ status: order.status }); // e.g. "paid", "attempted", "created"
    } catch (error) {
      console.error("Fetch order status error:", error);
      res.status(500).json({ error: "Failed to fetch order status" });
    }
  });

  app.post("/api/razorpay/webhook", async (req: any, res) => {
    try {
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
      const signature = req.headers['x-razorpay-signature'];
      
      if (secret && signature) {
        const expectedSignature = crypto.createHmac('sha256', secret)
          .update(req.rawBody || JSON.stringify(req.body))
          .digest('hex');
          
        if (expectedSignature !== signature) {
           console.error("Webhook signature mismatch");
           return res.status(400).send("Invalid Signature");
        }
      }

      console.log("WEBHOOK RECEIVED:", req.body?.event);
      const event = req.body?.event;
      
      if (event === "payment.captured" || event === "order.paid") {
         const payment = req.body.payload.payment.entity;
         console.log("PAYMENT CAPTURED Event for Razorpay Order:", payment.order_id);
         console.log("Payment details:", payment);
         // In production, instantiate Firebase Admin SDK here to update the order
         // db.collection('orders').where('paymentReference', '==', payment.order_id)
         // .update({ paymentStatus: 'PAID', status: 'CONFIRMED' })
         console.log("ORDER RECONCILED AND MARKED PAID via webhook (Admin SDK placeholder)");
      }

      res.status(200).send("OK");
    } catch (err) {
      console.error("Webhook error:", err);
      res.status(500).send("Webhook Error");
    }
  });

  app.post("/api/razorpay/callback", async (req, res) => {
    // Razorpay posts payment details here when callback_url is used.
    // the callback_url in frontend will be /api/razorpay/callback?return_url=...
    const returnUrl = req.query.return_url as string || "/";
    res.redirect(`${returnUrl}?payment=success`);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
