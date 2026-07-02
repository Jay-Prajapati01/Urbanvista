const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn("Missing SUPABASE_URL or SUPABASE_ANON_KEY/SUPABASE_KEY in .env — exporting a safe stub Supabase client for local development.");

  const stubResult = { data: null, error: new Error("Supabase not configured") };

  const stubQuery = () => ({
    select: () => ({ limit: () => Promise.resolve(stubResult), maybeSingle: () => Promise.resolve(stubResult) }),
    insert: () => Promise.resolve(stubResult),
    update: () => Promise.resolve(stubResult),
    delete: () => Promise.resolve(stubResult),
    eq: () => ({ limit: () => Promise.resolve(stubResult), maybeSingle: () => Promise.resolve(stubResult) }),
  });

  const stubClient = {
    from: (_table) => stubQuery(),
    rpc: () => Promise.resolve(stubResult),
  };

  module.exports = stubClient;
} else {
  const supabase = createClient(supabaseUrl, supabaseKey);
  module.exports = supabase;
}
