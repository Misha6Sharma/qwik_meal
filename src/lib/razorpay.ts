export const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => {
      resolve(true);
    };
    script.onerror = () => {
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

export const createRazorpayOrder = async (amount: number) => {
  const response = await fetch("/api/razorpay/order", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount }),
  });
  
  if (!response.ok) {
    throw new Error("Failed to create Razorpay Order");
  }
  
  return response.json();
};

export const verifyRazorpayPayment = async (data: any) => {
  const response = await fetch("/api/razorpay/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error("Payment signature verification failed");
  }
  return response.json();
};

export const checkRazorpayOrderStatus = async (orderId: string) => {
  const response = await fetch(`/api/razorpay/status/${orderId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch order status");
  }
  return response.json();
};

export const handleRazorpayCheckout = (options: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    let isHandled = false;

    const rzpOptions = {
      ...options,
      handler: async (response: any) => {
        isHandled = true;
        try {
          await verifyRazorpayPayment(response);
          resolve(response);
        } catch (error) {
          reject(error);
        }
      },
      modal: {
        ondismiss: async function() {
          isHandled = true;
          if (options.order_id) {
            // Check if perhaps payment was made via UPI intent but callback was lost
            try {
              const statusData = await checkRazorpayOrderStatus(options.order_id);
              if (statusData.status === "paid" || statusData.status === "captured") {
                // Recover payment
                resolve({ razorpay_payment_id: `reconciled_${options.order_id}` });
                return;
              }
            } catch (e) {
              console.warn("Polling failed", e);
            }
            reject(new Error("Payment cancelled by user"));
          }
        }
      }
    };

    const rzp = new (window as any).Razorpay(rzpOptions);
    
    // Background polling for UPI intent drops where handler is missed but modal remains open
    if (options.order_id) {
      const pollInterval = setInterval(async () => {
        if (isHandled) {
          clearInterval(pollInterval);
          return;
        }
        try {
          const statusData = await checkRazorpayOrderStatus(options.order_id);
          if (statusData.status === "paid" || statusData.status === "captured") {
            isHandled = true;
            clearInterval(pollInterval);
            resolve({ razorpay_payment_id: `reconciled_${options.order_id}` });
            try { rzp.close(); } catch (err) {}
          }
        } catch (e) {
          // Ignore polling errors
        }
      }, 3000);
    }
    
    rzp.on('payment.failed', function (response: any) {
      isHandled = true;
      if (options.onPaymentFailed) {
        options.onPaymentFailed(response);
      } else {
        alert("Payment failed: " + response.error.description);
      }
      reject(new Error(response.error.description || "Payment Failed"));
    });

    rzp.open();
  });
};
