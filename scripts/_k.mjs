import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
const env = Object.fromEntries(readFileSync(".env.local","utf8").split("\n").filter(l=>l&&!l.startsWith("#")&&l.includes("=")).map(l=>{const i=l.indexOf("=");return [l.slice(0,i),l.slice(i+1).replace(/^"|"$/g,"")]}));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const K="1f417a64-a1b5-4c55-b430-65d9a9e172f8";
for (const [t,c] of [["plan_assignments","user_id"],["activity_logs","user_id"],["activity_logs","actor_id"],["manager_coaching_notes","se_user_id"],["notifications","user_id"],["audit_logs","target_id"],["question_attempts","user_id"],["simulation_assignments","assigned_to"],["challenge_submissions","user_id"],["coaching_cards","user_id"],["resource_engagement","user_id"]]) {
  const r = await db.from(t).select("*",{count:"exact",head:true}).eq(c,K); console.log(t,c,r.error?r.error.message.slice(0,40):r.count);
}
const n = (await db.from("notifications").select("user_id,title,body").ilike("body","%Kevin%")).data; console.log("notifs mentioning Kevin", n?.length, n?.map(x=>x.title));
