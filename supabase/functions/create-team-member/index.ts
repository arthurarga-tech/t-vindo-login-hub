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
    const { email, password, role, establishment_id, name, phone } = body;

    // --- Comprehensive input validation ---
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!email || !password || !role || !establishment_id || !name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, password, role, establishment_id, name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (typeof email !== "string" || email.length > 254 || !EMAIL_REGEX.test(email.trim())) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (typeof name !== "string" || name.trim().length === 0 || name.length > 100) {
      return new Response(
        JSON.stringify({ error: "Name must be between 1 and 100 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (phone !== undefined && phone !== null && phone !== "") {
      if (typeof phone !== "string" || phone.length > 20) {
        return new Response(
          JSON.stringify({ error: "Phone must be at most 20 characters" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (typeof establishment_id !== "string" || !UUID_REGEX.test(establishment_id)) {
      return new Response(
        JSON.stringify({ error: "Invalid establishment ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validRoles = ["manager", "attendant", "kitchen", "waiter"];
    if (typeof role !== "string" || !validRoles.includes(role)) {
      return new Response(
        JSON.stringify({ error: `Invalid role. Must be one of: ${validRoles.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (typeof password !== "string" || password.length < 6 || password.length > 128) {
      return new Response(
        JSON.stringify({ error: "Password must be between 6 and 128 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // --- Rate limiting: max 5 team member creations per user per hour ---
    const rateLimitWindow = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabaseAdmin
      .from("rate_limit_logs")
      .select("id", { count: "exact", head: true })
      .eq("identifier", callerId)
      .eq("action", "create_team_member")
      .gte("created_at", rateLimitWindow);

    if ((recentCount ?? 0) >= 5) {
      return new Response(
        JSON.stringify({ error: "Limite de criação de membros atingido. Aguarde uma hora e tente novamente." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log this attempt
    await supabaseAdmin
      .from("rate_limit_logs")
      .insert({ identifier: callerId, action: "create_team_member" });

    // Verify caller is owner of this establishment
    const { data: establishment, error: estError } = await supabaseAdmin
      .from("establishments")
      .select("id, name, owner_id")
      .eq("id", establishment_id)
      .single();

    if (estError || !establishment) {
      return new Response(
        JSON.stringify({ error: "Establishment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (establishment.owner_id !== callerId) {
      return new Response(
        JSON.stringify({ error: "Only the establishment owner can add team members" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if email already exists as a member
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
      // Check if already a member of this establishment
      const { data: existingMember } = await supabaseAdmin
        .from("establishment_members")
        .select("id")
        .eq("establishment_id", establishment_id)
        .eq("user_id", existingUser.id)
        .maybeSingle();

      if (existingMember) {
        return new Response(
          JSON.stringify({ error: "Este email já é membro deste estabelecimento" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Create user via admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        establishment_name: establishment.name,
        invited_by: callerId,
        is_team_member: true,
      },
    });

    if (createError) {
      // If user already exists in auth but not as member, we can still add them
      if (createError.message?.includes("already been registered") && existingUser) {
        // Add existing user as member
        const { error: memberError } = await supabaseAdmin
          .from("establishment_members")
          .insert({
            establishment_id,
            user_id: existingUser.id,
            role,
          });

        if (memberError) {
          return new Response(
            JSON.stringify({ error: "Erro ao adicionar membro: " + memberError.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Update profile to link to this establishment
        await supabaseAdmin
          .from("profiles")
          .update({
            establishment_id,
            establishment_name: name,
            phone: phone || null,
          })
          .eq("user_id", existingUser.id);

        return new Response(
          JSON.stringify({
            success: true,
            message: "Usuário existente adicionado como membro",
            user_id: existingUser.id,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Erro ao criar usuário: " + createError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newUserId = newUser.user.id;

    // The handle_new_user trigger will create establishment + member + profile for the new user.
    // We need to remove that auto-created establishment and member, then add the correct ones.

    // Wait a moment for trigger to complete
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Delete the auto-created establishment membership
    await supabaseAdmin
      .from("establishment_members")
      .delete()
      .eq("user_id", newUserId);

    // Delete the auto-created establishment (the one where this user is owner)
    await supabaseAdmin
      .from("establishments")
      .delete()
      .eq("owner_id", newUserId);

    // Create the correct membership
    const { error: memberError } = await supabaseAdmin
      .from("establishment_members")
      .insert({
        establishment_id,
        user_id: newUserId,
        role,
      });

    if (memberError) {
      return new Response(
        JSON.stringify({ error: "Erro ao criar membro: " + memberError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update the profile to link to the correct establishment
    await supabaseAdmin
      .from("profiles")
      .update({
        establishment_id,
        establishment_name: name,
        phone: phone || null,
      })
      .eq("user_id", newUserId);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Membro criado com sucesso",
        user_id: newUserId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in create-team-member:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
