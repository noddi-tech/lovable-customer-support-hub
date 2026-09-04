import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, sentry-trace, baggage, traceparent, tracestate, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-supabase-api-version, x-app-version, x-requested-with, accept, accept-profile, content-profile, prefer, range, x-region",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Create Supabase client with the user's token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Verify the user is a super admin
    const token = authHeader.replace("Bearer ", "")
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid authorization token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Check if user is super admin
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)

    const isSuperAdmin = roles?.some((r) => r.role === "super_admin")
    if (!isSuperAdmin) {
      return new Response(JSON.stringify({ error: "Super admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const method = req.method
    const url = new URL(req.url)

    if (method === "GET" && url.searchParams.get("mode") === "duplicates") {
      // List emails with >1 auth.users row (cause of GoTrue linking-domain error).
      const { data, error } = await supabaseAdmin.rpc("admin_list_duplicate_auth_emails")
      if (error) {
        console.error("admin_list_duplicate_auth_emails failed:", error)
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
      return new Response(JSON.stringify({ success: true, duplicates: data ?? [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (method === "GET") {
      // List orphaned auth users (users in auth.users without profiles)
      console.log("Fetching orphaned auth users...")

      // Get all auth users
      const { data: authUsers, error: authUsersError } = await supabaseAdmin.auth.admin.listUsers({
        perPage: 1000,
      })

      if (authUsersError) {
        console.error("Error fetching auth users:", authUsersError)
        return new Response(JSON.stringify({ error: "Failed to fetch auth users" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      // Get all profile user_ids
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from("profiles")
        .select("user_id")

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError)
        return new Response(JSON.stringify({ error: "Failed to fetch profiles" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      const profileUserIds = new Set(profiles?.map((p) => p.user_id) || [])

      // Find orphaned users
      const orphanedUsers = authUsers.users
        .filter((u) => !profileUserIds.has(u.id))
        .map((u) => ({
          id: u.id,
          email: u.email,
          created_at: u.created_at,
        }))

      console.log(
        `Found ${orphanedUsers.length} orphaned users out of ${authUsers.users.length} total auth users`,
      )

      return new Response(
        JSON.stringify({
          success: true,
          orphaned_users: orphanedUsers,
          total_auth_users: authUsers.users.length,
          total_profiles: profiles?.length || 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    if (method === "POST") {
      const body = await req.json()
      const { action, user_ids } = body

      if (action === "delete") {
        if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
          return new Response(JSON.stringify({ error: "user_ids array is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          })
        }

        console.log(`Deleting ${user_ids.length} orphaned users...`)

        const results = {
          deleted: [] as string[],
          already_deleted: [] as string[],
          errors: [] as { id: string; error: string }[],
        }

        for (const userId of user_ids) {
          try {
            const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
            if (deleteError) {
              // Treat "user not found" as already deleted (success)
              if (
                deleteError.message?.toLowerCase().includes("not found") ||
                deleteError.message?.toLowerCase().includes("user not found") ||
                (deleteError as any).status === 404
              ) {
                results.already_deleted.push(userId)
              } else {
                results.errors.push({ id: userId, error: deleteError.message })
              }
            } else {
              results.deleted.push(userId)
            }
          } catch (e) {
            const errMsg = String(e).toLowerCase()
            if (errMsg.includes("not found") || errMsg.includes("404")) {
              results.already_deleted.push(userId)
            } else {
              results.errors.push({ id: userId, error: String(e) })
            }
          }
        }

        console.log(
          `Deleted ${results.deleted.length} users, ${results.already_deleted.length} already deleted, ${results.errors.length} errors`,
        )

        return new Response(
          JSON.stringify({
            success: true,
            deleted_count: results.deleted.length,
            already_deleted_count: results.already_deleted.length,
            error_count: results.errors.length,
            errors: results.errors,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        )
      }

      if (action === "merge") {
        // Merge a duplicate auth user into a canonical one, then delete the dup.
        // Resolves "Multiple accounts with the same email ... linking domain".
        const from: string | undefined = body.from
        const to: string | undefined = body.to
        if (!from || !to || from === to) {
          return new Response(
            JSON.stringify({ error: "from and to (distinct user ids) are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          )
        }

        // Sanity: both must currently exist and share the same email.
        const [{ data: fromUser }, { data: toUser }] = await Promise.all([
          supabaseAdmin.auth.admin.getUserById(from),
          supabaseAdmin.auth.admin.getUserById(to),
        ])
        if (!fromUser?.user || !toUser?.user) {
          return new Response(JSON.stringify({ error: "from and to must both exist" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          })
        }
        const fEmail = (fromUser.user.email ?? "").toLowerCase()
        const tEmail = (toUser.user.email ?? "").toLowerCase()
        if (!fEmail || fEmail !== tEmail) {
          return new Response(
            JSON.stringify({ error: `refusing merge: emails differ (${fEmail} vs ${tEmail})` }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          )
        }

        console.log(`Merging user ${from} -> ${to} (${tEmail})`)
        const { data: moved, error: mergeError } = await supabaseAdmin.rpc(
          "admin_merge_user_records",
          { p_from: from, p_to: to },
        )
        if (mergeError) {
          console.error("admin_merge_user_records failed:", mergeError)
          return new Response(JSON.stringify({ error: mergeError.message, stage: "reassign" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          })
        }

        // Data reassigned; remove the now-empty duplicate (cascades its auth rows).
        const { error: delError } = await supabaseAdmin.auth.admin.deleteUser(from)
        if (delError && !delError.message?.toLowerCase().includes("not found")) {
          return new Response(JSON.stringify({ error: delError.message, stage: "delete", moved }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          })
        }

        return new Response(JSON.stringify({ success: true, from, to, email: tEmail, moved }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      return new Response(JSON.stringify({ error: 'Invalid action. Use "delete" or "merge"' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Error in admin-cleanup-users:", error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})
