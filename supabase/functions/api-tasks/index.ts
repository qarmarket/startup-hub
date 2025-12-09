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
    const taskId = url.searchParams.get("id");

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();
    
    const isLead = roleData?.role === "lead";

    switch (req.method) {
      case "GET": {
        console.log("Fetching tasks for user:", user.id);
        
        let query = supabase.from("tasks").select("*").order("created_at", { ascending: false });
        
        // Non-leads can only see their assigned or created tasks
        if (!isLead) {
          query = query.or(`assignee_user_id.eq.${user.id},created_by.eq.${user.id}`);
        }

        const { data, error } = await query;

        if (error) {
          console.error("Error fetching tasks:", error);
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
        const body = await req.json();
        console.log("Creating task:", body);

        const { data, error } = await supabase.from("tasks").insert({
          ...body,
          created_by: user.id,
        }).select().single();

        if (error) {
          console.error("Error creating task:", error);
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
        if (!taskId) {
          return new Response(JSON.stringify({ error: "Task ID required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Check if user can update this task
        const { data: task } = await supabase
          .from("tasks")
          .select("assignee_user_id, created_by")
          .eq("id", taskId)
          .single();

        if (!isLead && task?.assignee_user_id !== user.id && task?.created_by !== user.id) {
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const body = await req.json();
        console.log("Updating task:", taskId, body);

        const { data, error } = await supabase
          .from("tasks")
          .update(body)
          .eq("id", taskId)
          .select()
          .single();

        if (error) {
          console.error("Error updating task:", error);
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

        if (!taskId) {
          return new Response(JSON.stringify({ error: "Task ID required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        console.log("Deleting task:", taskId);

        const { error } = await supabase
          .from("tasks")
          .delete()
          .eq("id", taskId);

        if (error) {
          console.error("Error deleting task:", error);
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
