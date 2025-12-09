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
    const budgetId = url.searchParams.get("id");

    // Check if user is lead
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();
    
    const isLead = roleData?.role === "lead";

    switch (req.method) {
      case "GET": {
        console.log("Fetching budgets for user:", user.id);
        const { data, error } = await supabase
          .from("budgets")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching budgets:", error);
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "POST": {
        if (!isLead) {
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const body = await req.json();
        console.log("Creating budget:", body);

        const { data, error } = await supabase.from("budgets").insert({
          ...body,
          created_by: user.id,
        }).select().single();

        if (error) {
          console.error("Error creating budget:", error);
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ data }), {
          status: 201,
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

        if (!budgetId) {
          return new Response(JSON.stringify({ error: "Budget ID required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const body = await req.json();
        console.log("Updating budget:", budgetId, body);

        const { data, error } = await supabase
          .from("budgets")
          .update(body)
          .eq("id", budgetId)
          .select()
          .single();

        if (error) {
          console.error("Error updating budget:", error);
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "DELETE": {
        if (!isLead) {
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (!budgetId) {
          return new Response(JSON.stringify({ error: "Budget ID required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        console.log("Deleting budget:", budgetId);

        const { error } = await supabase
          .from("budgets")
          .delete()
          .eq("id", budgetId);

        if (error) {
          console.error("Error deleting budget:", error);
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
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
