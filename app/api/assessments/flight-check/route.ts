import { NextResponse } from "next/server";
import { z } from "zod";
import {
  FLIGHT_CHECK_QUESTION_COUNT,
  buildRecommendedActions,
  computeCompetencyScores,
  computeFieldSignalScore,
  evaluateAnswer,
  focusCompetenciesForUser,
  selectNextQuestion,
  type FlightCheckResponse,
} from "@/lib/assessments/flight-check-engine";
import { FLIGHT_CHECK_BANK } from "@/lib/assessments/flight-check-questions";
import { getDashboardData } from "@/lib/data/get-dashboard-data";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: active } = await supabase
    .from("adaptive_probe_sessions")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "in_progress")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (active) {
    const responses = (active.responses ?? []) as FlightCheckResponse[];
    const next = selectNextQuestion(active.focus_competencies ?? [], responses);
    return NextResponse.json({
      sessionId: active.id,
      focusCompetencies: active.focus_competencies,
      responses,
      question: next,
      progress: responses.length,
      total: FLIGHT_CHECK_QUESTION_COUNT,
    });
  }

  const { data: dashboardData } = await getDashboardData(user.id);
  const focusCompetencies = focusCompetenciesForUser(dashboardData, user.id);

  const { data: session, error } = await supabase
    .from("adaptive_probe_sessions")
    .insert({
      user_id: user.id,
      focus_competencies: focusCompetencies,
      responses: [],
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const next = selectNextQuestion(focusCompetencies, []);

  return NextResponse.json({
    sessionId: session.id,
    focusCompetencies,
    responses: [],
    question: next,
    progress: 0,
    total: FLIGHT_CHECK_QUESTION_COUNT,
  });
}

const answerSchema = z.object({
  sessionId: z.string().uuid(),
  questionId: z.string().min(2),
  answer: z.union([z.string(), z.number()]),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = answerSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const question = FLIGHT_CHECK_BANK.find((q) => q.id === parsed.data.questionId);
  if (!question) {
    return NextResponse.json({ error: "Unknown question" }, { status: 400 });
  }

  const { data: session } = await supabase
    .from("adaptive_probe_sessions")
    .select("*")
    .eq("id", parsed.data.sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!session || session.status !== "in_progress") {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const responses = [...((session.responses ?? []) as FlightCheckResponse[])];
  const correct = evaluateAnswer(question, parsed.data.answer);
  responses.push({
    questionId: question.id,
    answer: parsed.data.answer,
    correct,
    competency: question.competency,
    difficulty: question.difficulty,
  });

  const complete = responses.length >= FLIGHT_CHECK_QUESTION_COUNT;
  const competencyScores = computeCompetencyScores(responses);
  const fieldSignalScore = computeFieldSignalScore(responses);
  const recommendedActions = complete ? buildRecommendedActions(competencyScores) : [];

  const { error } = await supabase
    .from("adaptive_probe_sessions")
    .update({
      responses,
      competency_scores: competencyScores,
      field_signal_score: complete ? fieldSignalScore : null,
      recommended_actions: recommendedActions,
      status: complete ? "completed" : "in_progress",
      completed_at: complete ? new Date().toISOString() : null,
    })
    .eq("id", session.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (complete) {
    await supabase.from("gamification_events").insert({
      user_id: user.id,
      event_type: "flight_check_completed",
      points: Math.round(fieldSignalScore * 0.5),
      metadata: { fieldSignalScore, competencyScores },
    });
  }

  const next = complete ? null : selectNextQuestion(session.focus_competencies ?? [], responses);

  return NextResponse.json({
    correct,
    rubricHint: question.rubricHint,
    progress: responses.length,
    total: FLIGHT_CHECK_QUESTION_COUNT,
    complete,
    fieldSignalScore: complete ? fieldSignalScore : null,
    competencyScores: complete ? competencyScores : null,
    recommendedActions: complete ? recommendedActions : null,
    question: next,
  });
}
