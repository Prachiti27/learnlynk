// LearnLynk Tech Test - Task 3: Edge Function create-task

// Deno + Supabase Edge Functions style
// Docs reference: https://supabase.com/docs/guides/functions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type CreateTaskPayload = {
  application_id: string;
  task_type: string;
  due_at: string;
};

const VALID_TYPES = ["call", "email", "review"];

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json()) as Partial<CreateTaskPayload>;
    const { application_id, task_type, due_at } = body;

    // TODO: validate application_id, task_type, due_at
    // - check task_type in VALID_TYPES
    // - parse due_at and ensure it's in the future

    // TODO: insert into tasks table using supabase client

    // Example:
    // const { data, error } = await supabase
    //   .from("tasks")
    //   .insert({ ... })
    //   .select()
    //   .single();

    // TODO: handle error and return appropriate status code

    // Example successful response:
    // return new Response(JSON.stringify({ success: true, task_id: data.id }), {
    //   status: 200,
    //   headers: { "Content-Type": "application/json" },
    // });

    if (!application_id || !task_type || !due_at) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 4000 }
      );
    }

    if (!VALID_TYPES.includes(task_type)) {
      return new Response(
        JSON.stringify({ error: "Invalid task type" }),
        { status: 400 }
      );
    }

    const dueDate = new Date(due_at);

    if (isNaN(dueDate.getTime()) || dueDate <= new Date()) {
      return new Response(
        JSON.stringify({ error: "due_at must be a future date" }),
        { status: 400 }
      );
    }

    const { data, error } = await supabase.from("tasks").insert({
      related_id: application_id,
      type: task_type,
      due_at: dueDate.toISOString(),
      title: `${task_type} task`,
      tenant_id: "system"
    }).select().single();

    if (error) {
      throw error;
    }

    await supabase.channel("tasks").send({
      type: "broadcast",
      event: "task.created",
      payload: { task_id: data.id },
    });

    return new Response(
      JSON.stringify({ success: true, task_id: data.id }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
