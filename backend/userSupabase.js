const { createClient } = require('@supabase/supabase-js')

function getUserSupabase(token) {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  )
}

module.exports = { getUserSupabase }
