const express = require("express");
const supabase = require("../config/supabase");
const { toCamelCase, toSnakeCase } = require("../utils/transform");
const { buildScopeContext, canAccessBlock, canAccessHouse, isScopedSecretary } = require("../utils/accessScope");
const { canPerformAction } = require("../utils/permissions");
const { logAudit } = require("../utils/audit");

const router = express.Router();

function isMissingTableError(error, tableName) {
  return (
    error &&
    error.code === "PGRST205" &&
    typeof error.message === "string" &&
    error.message.includes(`public.${tableName}`)
  );
}

function canAccessSettlementRow(req, row) {
  if (!isScopedSecretary(req)) return true;
  if (!row) return false;
  if (row.house_id && canAccessHouse(req, row.house_id)) return true;
  if (row.block && canAccessBlock(req, row.block)) return true;
  return false;
}

function normalizeText(value) {
  return String(value || "").trim();
}

function buildBatchPayload(body, actorUserId) {
  const dbPayload = toSnakeCase(body);
  return {
    scope_type: normalizeText(dbPayload.scope_type || dbPayload.scopeType || ""),
    house_id: dbPayload.house_id || null,
    block: normalizeText(dbPayload.block || "") || null,
    period_start: dbPayload.period_start || null,
    period_end: dbPayload.period_end || null,
    title: normalizeText(dbPayload.title || ""),
    notes: normalizeText(dbPayload.notes || "") || null,
    collected_amount: Number(dbPayload.collected_amount || dbPayload.collectedAmount || 0),
    expended_amount: Number(dbPayload.expended_amount || dbPayload.expendedAmount || 0),
    handover_amount: Number(dbPayload.handover_amount || dbPayload.handoverAmount || 0),
    status: normalizeText(dbPayload.status || "draft") || "draft",
    submitted_by_user_id: actorUserId,
    submitted_at: dbPayload.status === "submitted" ? new Date().toISOString() : null,
    reviewed_by_user_id: null,
    reviewed_at: null,
    rejection_reason: null,
  };
}

async function loadBatchById(batchId) {
  const { data, error } = await supabase
    .from("settlement_batches")
    .select("*")
    .eq("id", batchId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function loadBatchItems(batchId) {
  const { data, error } = await supabase
    .from("settlement_batch_items")
    .select("*")
    .eq("settlement_batch_id", batchId)
    .order("created_at", { ascending: true });

  if (error && !isMissingTableError(error, "settlement_batch_items")) throw error;
  return data || [];
}

async function enrichBatch(batch) {
  const items = await loadBatchItems(batch.id);
  return {
    ...toCamelCase(batch),
    items: toCamelCase(items),
  };
}

function filterBatchesForScope(req, batches) {
  if (!isScopedSecretary(req)) return batches;
  return (batches || []).filter((batch) => canAccessSettlementRow(req, batch));
}

router.get("/summary", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("settlement_batches")
      .select("id, status, collected_amount, expended_amount, handover_amount, house_id, block, scope_type, created_at");

    if (error) {
      if (isMissingTableError(error, "settlement_batches")) {
        return res.status(503).json({
          message: "Settlement tables are not initialized. Apply the phase 1 settlement migration first.",
        });
      }
      throw error;
    }

    const scoped = filterBatchesForScope(req, data || []);
    const summary = scoped.reduce(
      (acc, row) => {
        const status = row.status || "draft";
        acc.total += 1;
        acc.byStatus[status] = (acc.byStatus[status] || 0) + 1;
        acc.collectedAmount += Number(row.collected_amount || 0);
        acc.expendedAmount += Number(row.expended_amount || 0);
        acc.handoverAmount += Number(row.handover_amount || 0);
        return acc;
      },
      { total: 0, byStatus: {}, collectedAmount: 0, expendedAmount: 0, handoverAmount: 0 }
    );

    res.json(toCamelCase(summary));
  } catch (err) {
    console.error("Settlement summary error:", err);
    res.status(500).json({ message: "Failed to fetch settlement summary" });
  }
});

router.get("/", async (req, res) => {
  try {
    const { status } = req.query;

    let query = supabase
      .from("settlement_batches")
      .select("*")
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", String(status).trim());
    }

    const { data, error } = await query;
    if (error) {
      if (isMissingTableError(error, "settlement_batches")) {
        return res.status(503).json({
          message: "Settlement tables are not initialized. Apply the phase 1 settlement migration first.",
        });
      }
      throw error;
    }

    const scoped = filterBatchesForScope(req, data || []);
    res.json(toCamelCase(scoped));
  } catch (err) {
    console.error("List settlements error:", err);
    res.status(500).json({ message: "Failed to fetch settlements" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const batch = await loadBatchById(req.params.id);
    if (!batch) return res.status(404).json({ message: "Settlement batch not found" });
    if (!canAccessSettlementRow(req, batch)) {
      return res.status(403).json({ message: "Access denied for this settlement batch" });
    }

    res.json(await enrichBatch(batch));
  } catch (err) {
    console.error("Get settlement error:", err);
    if (isMissingTableError(err, "settlement_batches")) {
      return res.status(503).json({
        message: "Settlement tables are not initialized. Apply the phase 1 settlement migration first.",
      });
    }
    res.status(500).json({ message: "Failed to fetch settlement batch" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { user } = req;
    const scopeType = normalizeText(req.body.scopeType || req.body.scope_type);
    const houseId = req.body.houseId || req.body.house_id || null;
    const block = normalizeText(req.body.block || "") || null;

    if (!scopeType) {
      return res.status(400).json({ message: "scopeType is required" });
    }

    if (!houseId && !block) {
      return res.status(400).json({ message: "houseId or block is required" });
    }

    if (isScopedSecretary(req)) {
      if (houseId && !canAccessHouse(req, houseId)) {
        return res.status(403).json({ message: "House is outside your scope" });
      }
      if (block && !canAccessBlock(req, block)) {
        return res.status(403).json({ message: "Block is outside your scope" });
      }
    }

    const batchPayload = buildBatchPayload(
      {
        ...req.body,
        scopeType,
        houseId,
        block,
      },
      user?.id
    );

    const lineItems = Array.isArray(req.body.items) ? req.body.items : [];

    if (isScopedSecretary(req) && lineItems.length) {
      const unauthorizedItem = lineItems.find((item) => {
        const itemHouseId = item.houseId || item.house_id || null;
        if (!itemHouseId) return false;
        return !canAccessHouse(req, itemHouseId);
      });

      if (unauthorizedItem) {
        return res.status(403).json({
          message: "One or more settlement items target houses outside your assigned scope",
        });
      }
    }

    const { data: batch, error } = await supabase
      .from("settlement_batches")
      .insert(batchPayload)
      .select("*")
      .single();

    if (error) throw error;

    if (lineItems.length) {
      const itemPayload = lineItems.map((item) => ({
        settlement_batch_id: batch.id,
        item_type: normalizeText(item.itemType || item.item_type || "manual") || "manual",
        reference_table: normalizeText(item.referenceTable || item.reference_table || "") || null,
        reference_id: item.referenceId || item.reference_id || null,
        house_id: item.houseId || item.house_id || houseId,
        amount: Number(item.amount || 0),
        description: normalizeText(item.description || "") || null,
      }));

      const { error: itemError } = await supabase.from("settlement_batch_items").insert(itemPayload);
      if (itemError && !isMissingTableError(itemError, "settlement_batch_items")) {
        throw itemError;
      }
    }

    const created = await enrichBatch(batch);

    await logAudit({
      req,
      action: "settlement.create",
      resourceType: "settlement_batch",
      resourceId: batch.id,
      afterState: created,
      scopeContext: buildScopeContext(req, {
        settlementScopeType: scopeType,
      }),
    });

    res.status(201).json(created);
  } catch (err) {
    console.error("Create settlement error:", err);
    if (isMissingTableError(err, "settlement_batches")) {
      return res.status(503).json({
        message: "Settlement tables are not initialized. Apply the phase 1 settlement migration first.",
      });
    }
    res.status(500).json({ message: err.message || "Failed to create settlement batch" });
  }
});

router.post("/:id/submit", async (req, res) => {
  try {
    if (!canPerformAction(req.user?.role, "settlements", "submit")) {
      return res.status(403).json({ message: "Insufficient role permission" });
    }

    const batch = await loadBatchById(req.params.id);
    if (!batch) return res.status(404).json({ message: "Settlement batch not found" });
    if (!canAccessSettlementRow(req, batch)) {
      return res.status(403).json({ message: "Access denied for this settlement batch" });
    }

    const { data, error } = await supabase
      .from("settlement_batches")
      .update({
        status: "submitted",
        submitted_at: new Date().toISOString(),
        submitted_by_user_id: req.user?.id || batch.submitted_by_user_id,
      })
      .eq("id", req.params.id)
      .select("*")
      .single();

    if (error) throw error;

    const updated = await enrichBatch(data);

    await logAudit({
      req,
      action: "settlement.submit",
      resourceType: "settlement_batch",
      resourceId: req.params.id,
      beforeState: toCamelCase(batch),
      afterState: updated,
      scopeContext: buildScopeContext(req),
    });

    res.json(updated);
  } catch (err) {
    console.error("Submit settlement error:", err);
    if (isMissingTableError(err, "settlement_batches")) {
      return res.status(503).json({
        message: "Settlement tables are not initialized. Apply the phase 1 settlement migration first.",
      });
    }
    res.status(500).json({ message: err.message || "Failed to submit settlement batch" });
  }
});

router.post("/:id/approve", async (req, res) => {
  try {
    if (!canPerformAction(req.user?.role, "settlements", "approve")) {
      return res.status(403).json({ message: "Insufficient role permission" });
    }

    const batch = await loadBatchById(req.params.id);
    if (!batch) return res.status(404).json({ message: "Settlement batch not found" });

    const { data, error } = await supabase
      .from("settlement_batches")
      .update({
        status: "approved",
        reviewed_by_user_id: req.user?.id || null,
        reviewed_at: new Date().toISOString(),
        rejection_reason: null,
      })
      .eq("id", req.params.id)
      .select("*")
      .single();

    if (error) throw error;

    const updated = await enrichBatch(data);

    await logAudit({
      req,
      action: "settlement.approve",
      resourceType: "settlement_batch",
      resourceId: req.params.id,
      beforeState: toCamelCase(batch),
      afterState: updated,
      scopeContext: buildScopeContext(req),
    });

    res.json(updated);
  } catch (err) {
    console.error("Approve settlement error:", err);
    if (isMissingTableError(err, "settlement_batches")) {
      return res.status(503).json({
        message: "Settlement tables are not initialized. Apply the phase 1 settlement migration first.",
      });
    }
    res.status(500).json({ message: err.message || "Failed to approve settlement batch" });
  }
});

router.post("/:id/reject", async (req, res) => {
  try {
    if (!canPerformAction(req.user?.role, "settlements", "reject")) {
      return res.status(403).json({ message: "Insufficient role permission" });
    }

    const rejectionReason = normalizeText(req.body.rejectionReason || req.body.rejection_reason);
    const batch = await loadBatchById(req.params.id);
    if (!batch) return res.status(404).json({ message: "Settlement batch not found" });

    const { data, error } = await supabase
      .from("settlement_batches")
      .update({
        status: "rejected",
        reviewed_by_user_id: req.user?.id || null,
        reviewed_at: new Date().toISOString(),
        rejection_reason: rejectionReason || "Rejected by admin review",
      })
      .eq("id", req.params.id)
      .select("*")
      .single();

    if (error) throw error;

    const updated = await enrichBatch(data);

    await logAudit({
      req,
      action: "settlement.reject",
      resourceType: "settlement_batch",
      resourceId: req.params.id,
      beforeState: toCamelCase(batch),
      afterState: updated,
      scopeContext: buildScopeContext(req, {
        rejectionReason: rejectionReason || "Rejected by admin review",
      }),
    });

    res.json(updated);
  } catch (err) {
    console.error("Reject settlement error:", err);
    if (isMissingTableError(err, "settlement_batches")) {
      return res.status(503).json({
        message: "Settlement tables are not initialized. Apply the phase 1 settlement migration first.",
      });
    }
    res.status(500).json({ message: err.message || "Failed to reject settlement batch" });
  }
});

module.exports = router;