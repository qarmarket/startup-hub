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
    const noteId = url.searchParams.get("id");

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();
    
    const isLead = roleData?.role === "lead";

    switch (req.method) {
      case "GET": {
        console.log("Fetching notes for user:", user.id);
        
        let query = supabase.from("notes").select("*").order("created_at", { ascending: false });
        
        // Non-leads can only see their own notes
        if (!isLead) {
          query = query.eq("created_by", user.id);
        }

        const { data, error } = await query;

        if (error) {
          console.error("Error fetching notes:", error);
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
        console.log("Creating note:", body);

        const { data, error } = await supabase.from("notes").insert({
          ...body,
          created_by: user.id,
        }).select().single();

        if (error) {
          console.error("Error creating note:", error);
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
        if (!noteId) {
          return new Response(JSON.stringify({ error: "Note ID required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Check if user can update this note
        const { data: note } = await supabase
          .from("notes")
          .select("created_by")
          .eq("id", noteId)
          .single();

        if (!isLead && note?.created_by !== user.id) {
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const body = await req.json();
        console.log("Updating note:", noteId, body);

        const { data, error } = await supabase
          .from("notes")
          .update(body)
          .eq("id", noteId)
          .select()
          .single();

        if (error) {
          console.error("Error updating note:", error);
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
        if (!noteId) {
          return new Response(JSON.stringify({ error: "Note ID required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Check if user can delete this note
        const { data: note } = await supabase
          .from("notes")
          .select("created_by")
          .eq("id", noteId)
          .single();

        if (!isLead && note?.created_by !== user.id) {
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        console.log("Deleting note:", noteId);

        const { error } = await supabase
          .from("notes")
          .delete()
          .eq("id", noteId);

        if (error) {
          console.error("Error deleting note:", error);
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
