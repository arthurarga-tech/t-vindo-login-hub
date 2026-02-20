import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller identity
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = claimsData.claims.sub;

    const body = await req.json();
    const { member_id, user_id, establishment_id, name, phone, role, email, password } = body;

    // --- Comprehensive input validation ---
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!member_id || !user_id || !establishment_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: member_id, user_id, establishment_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!UUID_REGEX.test(member_id) || !UUID_REGEX.test(user_id) || !UUID_REGEX.test(establishment_id)) {
      return new Response(
        JSON.stringify({ error: "Invalid ID format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (name !== undefined && name !== null) {
      if (typeof name !== "string" || name.trim().length === 0 || name.length > 100) {
        return new Response(
          JSON.stringify({ error: "Name must be between 1 and 100 characters" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (phone !== undefined && phone !== null && phone !== "") {
      if (typeof phone !== "string" || phone.length > 20) {
        return new Response(
          JSON.stringify({ error: "Phone must be at most 20 characters" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (email !== undefined && email !== null) {
      if (typeof email !== "string" || email.length > 254 || !EMAIL_REGEX.test(email.trim())) {
        return new Response(
          JSON.stringify({ error: "Invalid email address" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is owner
    const { data: establishment, error: estError } = await supabaseAdmin
      .from("establishments")
      .select("id, owner_id")
      .eq("id", establishment_id)
      .single();

    if (estError || !establishment || establishment.owner_id !== callerId) {
      return new Response(
        JSON.stringify({ error: "Only the establishment owner can edit team members" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update role if provided
    if (role) {
      const validRoles = ["manager", "attendant", "kitchen", "waiter"];
      if (!validRoles.includes(role)) {
        return new Response(
          JSON.stringify({ error: `Invalid role. Must be one of: ${validRoles.join(", ")}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      await supabaseAdmin
        .from("establishment_members")
        .update({ role })
        .eq("id", member_id);
    }

    // Update profile (name, phone)
    const profileUpdate: Record<string, unknown> = {};
    if (name !== undefined) profileUpdate.establishment_name = name;
    if (phone !== undefined) profileUpdate.phone = phone || null;

    if (Object.keys(profileUpdate).length > 0) {
      await supabaseAdmin
        .from("profiles")
        .update(profileUpdate)
        .eq("user_id", user_id);
    }

    // Update auth user (email, password) via admin API
    const authUpdate: Record<string, unknown> = {};
    if (email) authUpdate.email = email;
    if (password) {
      if (password.length < 6) {
        return new Response(
          JSON.stringify({ error: "Password must be at least 6 characters" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      authUpdate.password = password;
    }

    if (Object.keys(authUpdate).length > 0) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(user_id, authUpdate);
      if (authError) {
        return new Response(
          JSON.stringify({ error: "Erro ao atualizar credenciais: " + authError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Membro atualizado com sucesso" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in update-team-member:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
