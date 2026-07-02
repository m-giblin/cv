import { Database, KeyRound, LockKeyhole, Upload, UsersRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getDashboardData } from "@/lib/demo-data";

export default function AdminPage() {
  const data = getDashboardData("matt");

  return (
    <AppShell>
      <div className="space-y-8">
        <section>
          <Badge tone="red">Admin</Badge>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">Platform configuration</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Manage users and hierarchy, configure AI providers, import prompt libraries, and prepare content assets for onboarding plans.
          </p>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UsersRound className="h-5 w-5 text-blue-600" />
                User and hierarchy management
              </CardTitle>
              <CardDescription>Profiles are tied to Supabase Auth users and governed by manager_id recursion.</CardDescription>
            </CardHeader>
            <div className="space-y-3">
              {data.profiles.map((profile) => {
                const manager = data.profiles.find((candidate) => candidate.id === profile.managerId);

                return (
                  <div className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-[1fr_0.8fr_0.8fr] md:items-center" key={profile.id}>
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{profile.fullName}</p>
                      <p className="text-xs text-slate-500">{profile.email}</p>
                    </div>
                    <Badge>{profile.level}</Badge>
                    <p className="text-sm text-slate-500">Mgr: {manager?.fullName ?? "None"}</p>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-blue-600" />
                AI provider settings
              </CardTitle>
              <CardDescription>Bring-your-own-key configuration. Store production secrets in Supabase Vault or Vercel environment variables.</CardDescription>
            </CardHeader>
            <form className="space-y-4">
              <label className="block space-y-2 text-sm font-medium text-slate-700">
                Primary provider
                <select className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm">
                  <option>xAI Grok</option>
                  <option>OpenAI</option>
                </select>
              </label>
              <label className="block space-y-2 text-sm font-medium text-slate-700">
                Model
                <Input defaultValue="grok-3-mini" />
              </label>
              <label className="block space-y-2 text-sm font-medium text-slate-700">
                API key reference
                <Input defaultValue="XAI_API_KEY" type="password" />
              </label>
              <Button className="w-full">
                <LockKeyhole className="h-4 w-4" />
                Save encrypted configuration
              </Button>
            </form>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-blue-600" />
                Content and assets
              </CardTitle>
              <CardDescription>Store pitch decks, solution briefs, examples, and submitted evidence in Supabase Storage.</CardDescription>
            </CardHeader>
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <Upload className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-3 text-sm font-medium text-slate-700">Upload placeholder</p>
              <p className="mt-1 text-xs text-slate-500">Metadata should link content to competencies, plans, and challenge topics.</p>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-600" />
                Prompt and template management
              </CardTitle>
              <CardDescription>Simulation prompts are modular so existing vertical prompts can be dropped in safely.</CardDescription>
            </CardHeader>
            <form className="space-y-4">
              <label className="block space-y-2 text-sm font-medium text-slate-700">
                Template name
                <Input defaultValue="Healthcare CISO - Shadow AI and privileged reviews" />
              </label>
              <label className="block space-y-2 text-sm font-medium text-slate-700">
                Prompt body
                <Textarea defaultValue="Stay in character as a healthcare CISO. Push on audit evidence, clinical data access, AI tool governance, and implementation effort. Ask concise follow-up questions and require business outcomes." />
              </label>
              <Button className="w-full">Save prompt template</Button>
            </form>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
