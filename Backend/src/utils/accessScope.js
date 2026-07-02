const supabase = require("../config/supabase");

const EMPTY_SCOPE = {
  houseIds: [],
  blocks: [],
  assignmentTableReady: true,
  scopeType: "global",
};

function normalizeUnique(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function normalizeScopeValue(value) {
  return String(value || "").trim().toUpperCase();
}

function getMissingColumnFromError(error) {
  const message = String(error?.message || "");
  const match = message.match(/'([^']+)' column/);
  return match?.[1] || null;
}

async function loadSecretaryScope(secretaryUserId) {
  let assignedBlocksFromUser = [];
  const { data: secretaryUser, error: secretaryError } = await supabase
    .from("admin_users")
    .select("assigned_blocks")
    .eq("id", secretaryUserId)
    .maybeSingle();

  if (secretaryError) {
    const missingColumn = getMissingColumnFromError(secretaryError);
    if (missingColumn !== "assigned_blocks") {
      return {
        ...EMPTY_SCOPE,
        assignmentTableReady: false,
        error: secretaryError,
      };
    }
  } else {
    assignedBlocksFromUser = normalizeUnique(
      (secretaryUser?.assigned_blocks || []).map((block) => normalizeScopeValue(block))
    );
  }

  const { data: assignments, error: assignmentError } = await supabase
    .from("secretary_assignments")
    .select("assignment_type, house_id, block, is_active")
    .eq("secretary_user_id", secretaryUserId)
    .eq("is_active", true);

  if (assignmentError) {
    if (assignedBlocksFromUser.length) {
      const { data: blockHouses, error: houseError } = await supabase
        .from("houses")
        .select("id")
        .in("block", assignedBlocksFromUser);

      if (houseError) {
        return {
          houseIds: [],
          blocks: assignedBlocksFromUser,
          assignmentTableReady: true,
          error: houseError,
        };
      }

      return {
        houseIds: normalizeUnique((blockHouses || []).map((h) => h.id)),
        blocks: assignedBlocksFromUser,
        assignmentTableReady: true,
        scopeType: "block",
      };
    }

    return {
      ...EMPTY_SCOPE,
      assignmentTableReady: false,
      error: assignmentError,
    };
  }

  const flatHouseIds = normalizeUnique(
    (assignments || [])
      .filter((a) => a.assignment_type === "flat")
      .map((a) => a.house_id)
  );

  const assignmentBlocks = normalizeUnique(
    (assignments || [])
      .filter((a) => a.assignment_type === "block")
      .map((a) => normalizeScopeValue(a.block))
  );

  let houseIds = [...flatHouseIds];
  let blocks = normalizeUnique([...assignmentBlocks, ...assignedBlocksFromUser]);

  if (flatHouseIds.length) {
    const { data: flatHouses, error: flatHouseError } = await supabase
      .from("houses")
      .select("id, block")
      .in("id", flatHouseIds);

    if (flatHouseError) {
      return {
        houseIds,
        blocks,
        assignmentTableReady: true,
        error: flatHouseError,
      };
    }

    const flatBlocks = normalizeUnique((flatHouses || []).map((house) => normalizeScopeValue(house.block)));
    blocks = normalizeUnique([...blocks, ...flatBlocks]);
  }

  const scopeType = blocks.length ? "block" : houseIds.length ? "flat" : "empty";

  if (!blocks.length) {
    return {
      houseIds,
      blocks,
      assignmentTableReady: true,
      scopeType,
    };
  }

  const { data: blockHouses, error: houseError } = await supabase
    .from("houses")
    .select("id")
    .in("block", blocks);

  if (houseError) {
    return {
      houseIds,
      blocks,
      assignmentTableReady: true,
      error: houseError,
    };
  }

  const blockHouseIds = normalizeUnique((blockHouses || []).map((h) => h.id));

  return {
    houseIds: normalizeUnique([...houseIds, ...blockHouseIds]),
    blocks,
    assignmentTableReady: true,
    scopeType,
  };
}

function isScopedSecretary(req) {
  return req.user?.role === "secretary";
}

function canAccessHouse(req, houseId) {
  if (!houseId) return false;
  if (!isScopedSecretary(req)) return true;
  return (req.accessScope?.houseIds || []).includes(houseId);
}

function canCreateInBlock(req, block) {
  if (!isScopedSecretary(req)) return true;
  if (!block) return false;
  return (req.accessScope?.blocks || []).includes(normalizeScopeValue(block));
}

function canAccessBlock(req, block) {
  if (!block) return false;
  if (!isScopedSecretary(req)) return true;
  return (req.accessScope?.blocks || []).includes(normalizeScopeValue(block));
}

function filterRowsByHouseScope(req, rows, houseField = "house_id") {
  if (!isScopedSecretary(req)) return rows;
  const allowed = req.accessScope?.houseIds || [];
  if (!allowed.length) return [];
  return (rows || []).filter((row) => allowed.includes(row?.[houseField]));
}

function buildScopeContext(req, extra = {}) {
  return {
    role: req?.user?.role || null,
    secretaryUserId: req?.user?.id || null,
    assignmentTableReady: Boolean(req?.accessScope?.assignmentTableReady),
    scopeType: req?.accessScope?.scopeType || "global",
    houseIds: req?.accessScope?.houseIds || [],
    blocks: req?.accessScope?.blocks || [],
    ...extra,
  };
}

module.exports = {
  EMPTY_SCOPE,
  buildScopeContext,
  canAccessBlock,
  loadSecretaryScope,
  isScopedSecretary,
  canAccessHouse,
  canCreateInBlock,
  filterRowsByHouseScope,
};
