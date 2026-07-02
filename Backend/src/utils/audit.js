const supabase = require("../config/supabase");

async function logAudit({ req, action, resourceType, resourceId, beforeState, afterState, scopeContext }) {
  const actor = req?.user || {};
  const payload = {
    actor_user_id: actor.id || null,
    actor_role: actor.role || null,
    action,
    resource_type: resourceType,
    resource_id: resourceId || null,
    before_state: beforeState || null,
    after_state: afterState || null,
    scope_context: scopeContext || null,
    request_id: req?.headers?.["x-request-id"] || null,
    ip_address: req?.ip || null,
    user_agent: req?.headers?.["user-agent"] || null,
  };

  const { error } = await supabase.from("audit_logs").insert(payload);
  if (error) {
    // Keep audit best-effort to avoid blocking business flow when table is not initialized.
    console.warn("Audit log warning:", error.message);
  }
}

module.exports = { logAudit };
