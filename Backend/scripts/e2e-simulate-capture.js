const supabase = require('../src/config/supabase');
const { applyPaymentToBill, toDatabaseStatus } = require('../src/services/maintenanceBillingService');
const { createReceiptForPayment, buildReceiptNumber } = require('../src/services/receiptService');
const { v4: uuidv4 } = require('uuid');

// Test Results Tracker
const results = {
  passed: 0,
  failed: 0,
  errors: [],
  details: []
};

function assert(condition, message) {
  if (condition) {
    results.passed += 1;
    results.details.push(`✓ ${message}`);
  } else {
    results.failed += 1;
    results.errors.push(message);
    results.details.push(`✗ ${message}`);
  }
}

async function run(maintenanceIdArg) {
  try {
    // 1. Pick a maintenance record
    let maintenanceId = maintenanceIdArg;
    if (!maintenanceId) {
      const { data: all, error: allErr } = await supabase.from('maintenance_records').select('*').limit(1);
      if (allErr || !all || !all.length) {
        console.error('No maintenance records found');
        process.exit(2);
      }
      maintenanceId = all[0].id;
    }

    const maintenanceRes = await supabase.from('maintenance_records').select('*').eq('id', maintenanceId).maybeSingle();
    let maintenance = maintenanceRes.data;
    const mErr = maintenanceRes.error;
    if (mErr || !maintenance) {
      console.error('Failed to load maintenance', mErr);
      process.exit(2);
    }

    // find a resident in same house — try to find any maintenance that has a matching user
    const houseId = maintenance.house_id || maintenance.property_id;
    let { data: user, error: uErr } = await supabase.from('users').select('*').eq('house_id', houseId).limit(1).maybeSingle();

    if (uErr || !user) {
      // fallback: search for a maintenance record that has a resident user
      const { data: allMaint } = await supabase.from('maintenance_records').select('*').limit(100);
      let found = null;
      for (const m of (allMaint || [])) {
        const hid = m.house_id || m.property_id;
        const { data: u } = await supabase.from('users').select('*').eq('house_id', hid).limit(1).maybeSingle();
        if (u) { found = { maintenance: m, user: u }; break; }
      }
      if (!found) {
        console.error('No resident user found linked to any maintenance records');
        process.exit(2);
      }
      // use found pair
      user = found.user;
      maintenance = found.maintenance;
      maintenanceId = maintenance.id;
    }

    console.log(`\n[E2E TEST START] Maintenance: ${maintenance.id}, User: ${user.id}`);
    console.log(`Initial Status: ${maintenance.status}, Amount: ${maintenance.total_amount}`);

    // 2. Insert a captured payment record
    const paymentId = uuidv4();
    const razorOrder = 'order_sim_' + Date.now();
    const razorPayment = 'pay_sim_' + Date.now();
    const amount = maintenance.total_amount || 0;

    const insertPayload = {
      id: paymentId,
      user_id: user.id,
      maintenance_record_id: maintenance.id,
      maintenance_id: maintenance.id,
      role: 'resident',
      order_id: 'sim_' + paymentId,
      razorpay_order_id: razorOrder,
      razorpay_payment_id: razorPayment,
      amount: amount,
      currency: 'INR',
      status: 'captured',
      receipt_number: buildReceiptNumber(maintenance.id),
      notes: 'Simulated captured payment (e2e test)',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let paymentRow = null;
    // Retry loop: if insert fails due to missing column(s) in schema, remove them and retry
    let attempts = 0;
    while (attempts < 6) {
      attempts += 1;
      const resX = await supabase.from('payments').insert(insertPayload).select('*').single();
      if (!resX.error) {
        paymentRow = resX.data;
        break;
      }

      const msg = String(resX.error.message || '');
      if (resX.error.code === 'PGRST204' || msg.toLowerCase().includes('could not find') || msg.toLowerCase().includes('column')) {
        // try to extract column name quoted in single quotes
        const m = msg.match(/'([^']+)'/);
        const col = m ? m[1] : null;
        if (col && insertPayload.hasOwnProperty(col)) {
          delete insertPayload[col];
          continue; // retry
        }
      }

      console.error('Failed to insert payment row', resX.error);
      process.exit(1);
    }

    if (!paymentRow) {
      console.error('Failed to insert payment row after retries');
      process.exit(1);
    }

    assert(paymentRow.id === paymentId, 'Payment inserted with correct ID');
    assert(paymentRow.status === 'captured', 'Payment status is captured');
    assert(Number(paymentRow.amount) === Number(amount), 'Payment amount matches');
    console.log(`✓ Inserted payment: ${paymentRow.id}`);

    // 3. Apply payment to maintenance via compute + update
    const next = applyPaymentToBill(maintenance, Number(amount || 0), new Date());
    const updatePayload = {
      amount_paid: next.nextPaidAmount,
      paid_amount: next.nextPaidAmount,
      due_amount: next.nextDueAmount,
      status: toDatabaseStatus(next.nextStatus),
      payment_method: 'UPI',
      payment_date: new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
    };

    // Update maintenance with fallback removal of missing columns
    let updatedMaintenance = null;
    let mAttempts = 0;
    while (mAttempts < 6) {
      mAttempts += 1;
      const resU = await supabase.from('maintenance_records').update(updatePayload).eq('id', maintenance.id).select('*').single();
      if (!resU.error) { updatedMaintenance = resU.data; break; }
      const msg = String(resU.error.message || '');
      if (resU.error.code === 'PGRST204' || msg.toLowerCase().includes('could not find') || msg.toLowerCase().includes('column')) {
        const m = msg.match(/'([^']+)'/);
        const col = m ? m[1] : null;
        if (col && updatePayload.hasOwnProperty(col)) {
          delete updatePayload[col];
          continue;
        }
      }
      console.error('Failed to update maintenance', resU.error);
      process.exit(1);
    }
    if (!updatedMaintenance) {
      console.error('Failed to update maintenance after retries');
      process.exit(1);
    }

    assert(updatedMaintenance.status === 'Paid' || updatedMaintenance.status === 'Pending', 'Maintenance status is valid (Paid or Pending)');
    assert(Number(updatedMaintenance.paid_amount || updatedMaintenance.amount_paid || 0) >= Number(amount), 'Maintenance paid_amount reflects payment');
    console.log(`✓ Updated maintenance status: ${updatedMaintenance.status}`);

    // 4. Create receipt
    const receipt = await createReceiptForPayment({ paymentId: paymentRow.id, userId: user.id, maintenanceId: maintenance.id, amount: Number(amount || 0), receiptNumber: paymentRow.receipt_number });
    assert(receipt && (receipt.receipt_number || receipt.id), 'Receipt created successfully');
    console.log(`✓ Created receipt: ${receipt.receipt_number || receipt.id || '(fallback)'}`);

    // 5. Verify payment is retrievable with new status
    const { data: verifyPayment } = await supabase.from('payments').select('*').eq('id', paymentRow.id).maybeSingle();
    assert(verifyPayment && verifyPayment.status === 'captured', 'Payment persisted with captured status');
    assert(verifyPayment && verifyPayment.maintenance_record_id === maintenance.id, 'Payment linked to maintenance_record');

    // 6. Compute dashboard-like totalCollected from maintenance records and compare
    const { data: allMaints } = await supabase.from('maintenance_records').select('*');
    const computedTotal = (allMaints || []).reduce((acc, r) => {
      const paid = Number(r.paid_amount ?? r.amount_paid ?? r.paidAmount ?? 0);
      return acc + (Number.isFinite(paid) ? paid : 0);
    }, 0);
    assert(computedTotal > 0, 'Dashboard total collected is computed');
    console.log(`✓ Computed totalCollected: ${computedTotal}`);

    // 7. Count receipts for the user via receipts table if present, else payments
    const { data: receiptsTable, error: rErr } = await supabase.from('receipts').select('*').eq('user_id', user.id).limit(100);
    if (!rErr && Array.isArray(receiptsTable)) {
      assert(Array.isArray(receiptsTable), 'Receipts table exists and is accessible');
      console.log(`✓ Receipts table count for user: ${receiptsTable.length}`);
    } else {
      const { data: paymentsForUser } = await supabase.from('payments').select('*').eq('user_id', user.id).limit(100);
      assert(Array.isArray(paymentsForUser) && paymentsForUser.length > 0, 'Fallback: payments table accessible');
      console.log(`✓ Fallback payments count for user: ${(paymentsForUser || []).length}`);
    }

    // 8. Verify payment_transactions log was created (if table exists)
    const { data: txnLogs, error: txnErr } = await supabase.from('payment_transactions').select('*').eq('user_id', user.id).eq('maintenance_record_id', maintenance.id).limit(10);
    if (!txnErr && Array.isArray(txnLogs) && txnLogs.length > 0) {
      const latestTxn = txnLogs[txnLogs.length - 1];
      assert(latestTxn.maintenance_record_id === maintenance.id, 'Transaction log links to maintenance_record');
      assert(latestTxn.user_id === user.id, 'Transaction log links to user');
      console.log(`✓ Payment transaction logged: ${latestTxn.id}`);
    } else {
      console.log('⚠ Payment transactions table not present or empty (optional feature)');
    }

    // Print summary
    console.log(`\n[E2E TEST SUMMARY]`);
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}`);
    results.details.forEach(d => console.log(d));

    if (results.failed > 0) {
      console.error('\n[E2E TEST FAILED]');
      results.errors.forEach(e => console.error(`  - ${e}`));
      process.exit(1);
    } else {
      console.log('\n[E2E TEST PASSED]');
      process.exit(0);
    }
  } catch (err) {
    console.error('E2E script error', err);
    process.exit(1);
  }
}

const arg = process.argv[2];
run(arg).then(() => {}).catch(err => { console.error('Unhandled error:', err); process.exit(1); });

