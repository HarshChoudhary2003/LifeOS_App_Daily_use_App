import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { question, action } = await req.json();

    // Fetch user's notes for context
    const { data: notes, error: notesError } = await supabaseClient
      .from('notes')
      .select('title, content')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(20);

    if (notesError) {
      console.error('Error fetching notes:', notesError);
    }

    // Fetch learning goals for additional context
    const { data: goals, error: goalsError } = await supabaseClient
      .from('learning_goals')
      .select('title, description, progress, status')
      .eq('user_id', user.id);

    if (goalsError) {
      console.error('Error fetching goals:', goalsError);
    }

    // Build context from notes and goals
    const notesContext = notes?.map(n => `Note: ${n.title}\n${n.content || ''}`).join('\n\n') || '';
    const goalsContext = goals?.map(g => 
      `Learning Goal: ${g.title} (${g.progress}% complete, ${g.status})\n${g.description || ''}`
    ).join('\n\n') || '';

    let systemPrompt = '';
    let userPrompt = '';

    if (action === 'summarize') {
      systemPrompt = `You are a helpful learning assistant. Based on the user's notes and learning goals, provide a concise summary of their learning journey and key takeaways. Be encouraging and highlight progress.`;
      userPrompt = `Please summarize my learning based on these notes and goals:\n\n${notesContext}\n\n${goalsContext}`;
    } else {
      systemPrompt = `You are a knowledgeable assistant helping the user recall and understand information from their personal notes and learning goals. Answer questions based on the provided context. If the information isn't in their notes, say so politely and offer general guidance.`;
      userPrompt = `Context from my notes:\n${notesContext}\n\nMy learning goals:\n${goalsContext}\n\nQuestion: ${question}`;
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('AI gateway error');
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || 'No response generated.';

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Knowledge recall error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
