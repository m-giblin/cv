/** Review item shapes shared by the manager inbox and the server loader. */
type SubmissionReviewItem = {
  kind: "submission";
  id: string;
  userId?: string;
  title: string;
  personName: string;
  reflectionText?: string | null;
  submittedAt?: string | null;
};

type CoachingReviewItem = {
  kind: "coaching";
  id: string;
  userId?: string;
  title: string;
  personName: string;
  score: number;
  strengths: string[];
  gaps: string[];
  recommendedImprovements: string[];
  managerSummary: string;
  seReflection?: string | null;
  transcript?: string;
  simulationLabel?: string;
  submittedAt?: string | null;
};

export type ReviewItem = SubmissionReviewItem | CoachingReviewItem;
