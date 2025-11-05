import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  email: string;
  organizationId: string;
  role: 'super_admin' | 'admin' | 'agent' | 'user';
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error("Authentication error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Parse request body
    const { email, organizationId, role }: InviteRequest = await req.json();

    // Validate inputs
    if (!email || !organizationId || !role) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, organizationId, role" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate role
    const validRoles = ['super_admin', 'admin', 'agent', 'user'];
    if (!validRoles.includes(role)) {
      return new Response(
        JSON.stringify({ error: "Invalid role. Must be one of: super_admin, admin, agent, user" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if user is admin of the organization
    const { data: membership, error: membershipError } = await supabaseClient
      .from("organization_memberships")
      .select("role, organization_id, organizations(name)")
      .eq("user_id", user.id)
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .single();

    if (membershipError || !membership) {
      console.error("Membership check error:", membershipError);
      return new Response(
        JSON.stringify({ error: "You are not a member of this organization" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (membership.role !== 'admin' && membership.role !== 'super_admin') {
      return new Response(
        JSON.stringify({ error: "Only admins can send invites" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const organizationName = membership.organizations?.name || "the organization";

    // Check if user already exists or has pending invite
    const { data: existingMembership, error: checkError } = await supabaseClient
      .from("organization_memberships")
      .select("id, status, user_id, profiles(email)")
      .eq("organization_id", organizationId)
      .or(`email.eq.${email},profiles.email.eq.${email}`)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking existing membership:", checkError);
      return new Response(
        JSON.stringify({ error: "Failed to check existing membership" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (existingMembership) {
      if (existingMembership.status === 'active') {
        return new Response(
          JSON.stringify({ error: "User is already a member of this organization" }),
          { status: 409, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Update existing pending invite
      const { data: updatedInvite, error: updateError } = await supabaseClient
        .from("organization_memberships")
        .update({
          role,
          invite_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          invited_by_id: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingMembership.id)
        .select("invite_token")
        .single();

      if (updateError || !updatedInvite) {
        console.error("Error updating invite:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update invite" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log("Updated existing invite for:", email);
    } else {
      // Create new pending membership with invite
      const { data: newInvite, error: insertError } = await supabaseClient
        .from("organization_memberships")
        .insert({
          email,
          organization_id: organizationId,
          role,
          status: 'pending',
          invited_by_id: user.id,
          invite_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          is_default: false,
        })
        .select("invite_token")
        .single();

      if (insertError || !newInvite) {
        console.error("Error creating invite:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to create invite" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log("Created new invite for:", email);
    }

    // Get the invite token for the email
    const { data: inviteData, error: tokenError } = await supabaseClient
      .from("organization_memberships")
      .select("invite_token")
      .eq("organization_id", organizationId)
      .eq("email", email)
      .eq("status", "pending")
      .single();

    if (tokenError || !inviteData?.invite_token) {
      console.error("Error getting invite token:", tokenError);
      return new Response(
        JSON.stringify({ error: "Failed to get invite token" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send email via SendGrid
    const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
    if (!SENDGRID_API_KEY) {
      console.error("SENDGRID_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const inviteLink = `${Deno.env.get("SUPABASE_URL")}/auth?invite=${inviteData.invite_token}`;

    const emailHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { color: #3B82F6; margin-bottom: 20px; }
    .content { font-size: 16px; line-height: 1.6; color: #374151; }
    .button { display: inline-block; background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 20px 0; }
    .footer { font-size: 14px; color: #6B7280; margin-top: 30px; padding-top: 30px; border-top: 1px solid #E5E7EB; }
    .small { font-size: 12px; color: #9CA3AF; }
  </style>
</head>
<body>
  <div class="container">
    <h1 class="header">You've been invited!</h1>
    <div class="content">
      <p>You've been invited to join <strong>${organizationName}</strong> as a <strong>${role}</strong>.</p>
      <p>Click the button below to accept your invitation and create your account:</p>
      <a href="${inviteLink}" class="button">Accept Invitation</a>
      <div class="footer">
        <p>This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.</p>
        <p class="small">If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${inviteLink}" style="color: #3B82F6; word-break: break-all;">${inviteLink}</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;

    const plainText = `You've been invited to join ${organizationName} as a ${role}.

Click the link below to accept your invitation and create your account:
${inviteLink}

This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.`;

    const sendgridBody = {
      personalizations: [
        {
          to: [{ email }],
        },
      ],
      from: { email: "noreply@qgfaycwsangsqzpveoup.supabase.co", name: organizationName },
      subject: `You've been invited to join ${organizationName}`,
      content: [
        { type: "text/plain", value: plainText },
        { type: "text/html", value: emailHTML },
      ],
    };

    console.log("Sending invitation email via SendGrid to:", email);
    const sgRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sendgridBody),
    });

    if (sgRes.status !== 202) {
      const errTxt = await sgRes.text();
      console.error("SendGrid error:", sgRes.status, errTxt);
      return new Response(
        JSON.stringify({ error: `Email service error: ${sgRes.status}` }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Email sent successfully via SendGrid");

    return new Response(
      JSON.stringify({
        success: true,
        message: `Invitation sent to ${email}`,
        inviteToken: inviteData.invite_token,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-organization-invite function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

Deno.serve(handler);
