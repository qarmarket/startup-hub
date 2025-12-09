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

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();
    
    const isLead = roleData?.role === "lead";

    if (req.method === "GET") {
      console.log("Fetching dashboard stats for user:", user.id);

      // Fetch all stats in parallel
      const [budgetsRes, invoicesRes, tasksRes, notesRes, profilesRes, recentTasksRes] = 
        await Promise.all([
          supabase.from("budgets").select("status"),
          isLead 
            ? supabase.from("invoices").select("status")
            : supabase.from("invoices").select("status").eq("assigned_user_id", user.id),
          isLead
            ? supabase.from("tasks").select("status")
            : supabase.from("tasks").select("status").or(`assignee_user_id.eq.${user.id},created_by.eq.${user.id}`),
          isLead
            ? supabase.from("notes").select("id")
            : supabase.from("notes").select("id").eq("created_by", user.id),
          supabase.from("profiles").select("id"),
          isLead
            ? supabase.from("tasks").select("*").order("created_at", { ascending: false }).limit(5)
            : supabase.from("tasks").select("*").or(`assignee_user_id.eq.${user.id},created_by.eq.${user.id}`).order("created_at", { ascending: false }).limit(5),
        ]);

      const stats = {
        totalBudgets: budgetsRes.data?.length || 0,
        activeBudgets: budgetsRes.data?.filter((b) => b.status === "active").length || 0,
        totalInvoices: invoicesRes.data?.length || 0,
        unpaidInvoices: invoicesRes.data?.filter((i) => i.status === "unpaid").length || 0,
        totalTasks: tasksRes.data?.length || 0,
        pendingTasks: tasksRes.data?.filter((t) => t.status !== "done").length || 0,
        totalNotes: notesRes.data?.length || 0,
        teamMembers: profilesRes.data?.length || 0,
      };

      return new Response(JSON.stringify({ 
        data: { 
          stats, 
          recentTasks: recentTasksRes.data || [] 
        } 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
