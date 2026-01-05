import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, message, conversationHistory, vision, values } = body;
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Get user context from Supabase
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Handle alignment check action
    if (action === 'alignment') {
      const [habitsRes, tasksRes, decisionsRes, moodRes] = await Promise.all([
        supabase.from('habit_logs').select('*, habits(name)').order('completed_at', { ascending: false }).limit(10),
        supabase.from('tasks').select('*').order('updated_at', { ascending: false }).limit(10),
        supabase.from('decisions').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('mood_logs').select('*').order('logged_at', { ascending: false }).limit(7),
      ]);

      const recentHabits = habitsRes.data?.map((h: any) => h.habits?.name).filter(Boolean) || [];
      const completedTasks = tasksRes.data?.filter((t: any) => t.status === 'done').map((t: any) => t.title) || [];
      const pendingTasks = tasksRes.data?.filter((t: any) => t.status === 'pending').map((t: any) => t.title) || [];
      const recentDecisions = decisionsRes.data?.map((d: any) => d.question) || [];
      const avgMood = moodRes.data?.length 
        ? (moodRes.data.reduce((acc: number, m: any) => acc + m.mood, 0) / moodRes.data.length).toFixed(1) 
        : 'N/A';

      const prompt = `You are a compassionate life coach helping someone align their daily actions with their future vision.

Their future vision: "${vision}"
Their core values: ${values?.join(', ') || 'Not specified'}

Recent activity:
- Habits practiced: ${recentHabits.join(', ') || 'None recorded'}
- Completed tasks: ${completedTasks.slice(0, 5).join(', ') || 'None'}
- Pending tasks: ${pendingTasks.slice(0, 5).join(', ') || 'None'}
- Recent decisions being considered: ${recentDecisions.join('; ') || 'None'}
- Average mood (1-5): ${avgMood}

Provide a brief, encouraging analysis (2-3 paragraphs) of how well their recent actions align with their vision. Be specific but kind. Highlight what's going well and gently suggest one or two areas for improvement. End with an encouraging note. Don't be preachy or judgmental.`;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI gateway error:', response.status, errorText);
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content || 'Unable to generate alignment check.';

      return new Response(JSON.stringify({ response: aiResponse }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Default: Chat mode
    // Fetch user's data for context
    const [tasksRes, habitsRes, habitLogsRes, expensesRes, decisionsRes] = await Promise.all([
      supabase.from("tasks").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("habits").select("*").eq("archived", false),
      supabase.from("habit_logs").select("*").gte("completed_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
      supabase.from("expenses").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("decisions").select("*").order("created_at", { ascending: false }).limit(20),
    ]);

    const tasks = tasksRes.data || [];
    const habits = habitsRes.data || [];
    const habitLogs = habitLogsRes.data || [];
    const expenses = expensesRes.data || [];
    const decisions = decisionsRes.data || [];

    // Calculate insights from data
    const pendingTasks = tasks.filter(t => t.status === "pending");
    const completedTasks = tasks.filter(t => t.status === "completed");
    const taskCompletionRate = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;
    
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const expensesByCategory: Record<string, number> = {};
    expenses.forEach(e => {
      expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + Number(e.amount);
    });
    
    const habitStreaks: Record<string, number> = {};
    habits.forEach(h => {
      const logs = habitLogs.filter(l => l.habit_id === h.id);
      habitStreaks[h.name] = logs.length;
    });

    // Build context summary
    const contextSummary = `
USER CONTEXT (Use this to personalize your responses):

TASKS:
- Total tasks: ${tasks.length}
- Pending: ${pendingTasks.length}
- Completed: ${completedTasks.length}
- Completion rate: ${taskCompletionRate}%
- Recent pending tasks: ${pendingTasks.slice(0, 5).map(t => `"${t.title}" (${t.category})`).join(", ") || "None"}
- Task categories breakdown: ${Object.entries(tasks.reduce((acc: Record<string, number>, t) => { acc[t.category] = (acc[t.category] || 0) + 1; return acc; }, {})).map(([k, v]) => `${k}: ${v}`).join(", ") || "None"}

HABITS (Last 30 days):
- Active habits: ${habits.length > 0 ? habits.map(h => h.name).join(", ") : "None created yet"}
- Habit completion this month: ${Object.entries(habitStreaks).map(([name, count]) => `${name}: ${count} days`).join(", ") || "No logs yet"}

EXPENSES (Recent):
- Total tracked: $${totalExpenses.toFixed(2)}
- By category: ${Object.entries(expensesByCategory).map(([k, v]) => `${k}: $${v.toFixed(2)}`).join(", ") || "None"}

DECISIONS:
- Past decisions analyzed: ${decisions.length}
- Recent topics: ${decisions.slice(0, 3).map(d => `"${d.question}"`).join(", ") || "None"}
`;

    const systemPrompt = `You are a thoughtful AI Life Coach within the LifeOS app. You help users improve their productivity, habits, and life decisions based on their actual data.

${contextSummary}

YOUR ROLE:
- Be a supportive, honest advisor - not a generic chatbot
- Give specific, actionable advice based on the user's actual data
- Be direct and practical - avoid motivational fluff
- Acknowledge patterns you notice in their behavior
- Suggest concrete next steps

GUIDELINES:
- Reference their actual tasks, habits, expenses when relevant
- If they ask about productivity, look at their task completion patterns
- If they ask about habits, reference their actual habit streaks
- If they ask about spending, reference their expense categories
- Be encouraging but honest - if there's room for improvement, say so kindly

SAFETY (Always follow these):
- Never give medical, legal, or professional financial advice
- Don't make guarantees about outcomes
- If asked about serious health or financial issues, suggest they consult a professional
- You're a helpful tool, not a replacement for professional help

TONE:
- Warm but direct
- Insightful, not preachy
- Like a thoughtful friend who happens to have access to their data
- Keep responses concise - aim for 2-4 paragraphs max unless they ask for detail`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(conversationHistory || []),
      { role: "user", content: message },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Failed to get AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Life coach error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
