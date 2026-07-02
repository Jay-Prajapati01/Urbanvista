const supabase = require("../src/config/supabase");

async function main() {
  const orderId = process.argv[2];
  const paymentId = process.argv[3] || `pay_${Date.now()}`;
  if (!orderId) {
    console.error("Usage: node mark-payment-captured.js <razorpay_order_id> [paymentId]");
    process.exit(1);
  }

  try {
    const { data, error } = await supabase
      .from('payments')
      .update({ status: 'captured', razorpay_payment_id: paymentId })
      .eq('razorpay_order_id', orderId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update payment:', error);
      process.exit(2);
    }

    console.log('Updated payment:', data.id);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(3);
  }
}

main();
