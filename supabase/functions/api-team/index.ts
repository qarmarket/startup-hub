import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    const action = url.searchParams.get("action");

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();
    
    const isLead = roleData?.role === "lead";

    switch (req.method) {
      case "GET": {
        console.log("Fetching team members");
        
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false });

        if (profilesError) {
          console.error("Error fetching profiles:", profilesError);
          return new Response(JSON.stringify({ error: profilesError.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: roles } = await supabase.from("user_roles").select("user_id, role");

        const membersWithRoles = (profiles || []).map((profile) => ({
          ...profile,
          role: roles?.find((r) => r.user_id === profile.id)?.role || "non_lead",
        }));

        return new Response(JSON.stringify({ data: membersWithRoles }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "POST": {
        if (!isLead) {
          return new Response(JSON.stringify({ error: "Forbidden: Only admins can create users" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const body = await req.json();
        const { email, password, full_name, role } = body;

        if (!email || !password) {
          return new Response(JSON.stringify({ error: "Email and password are required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        console.log("Creating new user:", email);

        // Create user in auth
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name },
        });

        if (createError) {
          console.error("Error creating user:", createError);
          return new Response(JSON.stringify({ error: createError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Update role if different from default
        if (role === "lead" && newUser.user) {
          const { error: roleError } = await supabase
            .from("user_roles")
            .update({ role: "lead" })
            .eq("user_id", newUser.user.id);

          if (roleError) {
            console.error("Error updating role:", roleError);
          }
        }

        console.log("User created successfully:", newUser.user?.id);

        return new Response(JSON.stringify({ data: newUser.user }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "DELETE": {
        if (!isLead) {
          return new Response(JSON.stringify({ error: "Forbidden: Only admins can delete users" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (!userId) {
          return new Response(JSON.stringify({ error: "User ID required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (userId === user.id) {
          return new Response(JSON.stringify({ error: "Cannot delete yourself" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        console.log("Deleting user:", userId);

        const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

        if (deleteError) {
          console.error("Error deleting user:", deleteError);
          return new Response(JSON.stringify({ error: deleteError.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        console.log("User deleted successfully");

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "PATCH": {
        if (!isLead) {
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (!userId) {
          return new Response(JSON.stringify({ error: "User ID required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const body = await req.json();
        
        if (action === "role") {
          console.log("Updating role for user:", userId, body);
          const { error } = await supabase
            .from("user_roles")
            .update({ role: body.role })
            .eq("user_id", userId);

          if (error) {
            console.error("Error updating role:", error);
            return new Response(JSON.stringify({ error: error.message }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } else if (action === "status") {
          console.log("Updating status for user:", userId, body);
          const { error } = await supabase
            .from("profiles")
            .update({ status: body.status })
            .eq("id", userId);

          if (error) {
            console.error("Error updating status:", error);
            return new Response(JSON.stringify({ error: error.message }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } else {
          return new Response(JSON.stringify({ error: "Invalid action" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
