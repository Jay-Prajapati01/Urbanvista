type RazorpayCheckoutSuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayCheckoutFailure = unknown;

type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: {
    name: string;
    email: string;
  };
  handler: (response: RazorpayCheckoutSuccess) => void;
  modal: {
    ondismiss: () => void;
  };
  theme: {
    color: string;
  };
};

type RazorpayInstance = {
  open: () => void;
};

type RazorpayConstructor = new (options: RazorpayCheckoutOptions) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

export function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
    document.body.appendChild(script);
  });
}

export function openRazorpayCheckout(options: {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  userName: string;
  userEmail: string;
  onSuccess: (response: RazorpayCheckoutSuccess) => void;
  onFailure: (error: RazorpayCheckoutFailure) => void;
}) {
  const Razorpay = window.Razorpay;
  if (!Razorpay) {
    throw new Error("Razorpay SDK is not available");
  }

  const rzp = new Razorpay({
    key: options.keyId,
    amount: options.amount,
    currency: options.currency,
    name: "UrbanVista Society",
    description: "Maintenance Payment",
    order_id: options.orderId,
    prefill: {
      name: options.userName,
      email: options.userEmail,
    },
    handler: options.onSuccess,
    modal: {
      ondismiss: () => options.onFailure("Payment cancelled"),
    },
    theme: {
      color: "#2563eb",
    },
  });
  rzp.open();
}
