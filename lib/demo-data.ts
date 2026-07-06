import {
  ActivityLog,
  Challenge,
  ChallengeSubmission,
  CoachingCard,
  Competency,
  DashboardData,
  Notification,
  Profile,
  SimulationAssignment,
  UserPlan,
} from "@/lib/types";

export const profiles: Profile[] = [
  {
    id: "matt",
    email: "matt.giblin@sailpoint.com",
    fullName: "Matt Giblin",
    role: "director",
    level: "Advisory",
    managerId: null,
    createdAt: "2026-01-02T12:00:00.000Z",
  },
  {
    id: "priya",
    email: "priya.shah@sailpoint.com",
    fullName: "Priya Shah",
    role: "manager",
    level: "Advisory",
    managerId: "matt",
    createdAt: "2026-01-15T12:00:00.000Z",
  },
  {
    id: "jordan",
    email: "jordan.lee@sailpoint.com",
    fullName: "Jordan Lee",
    role: "senior_se",
    level: "Senior",
    managerId: "priya",
    createdAt: "2026-02-01T12:00:00.000Z",
  },
  {
    id: "alex",
    email: "alex.rivera@sailpoint.com",
    fullName: "Alex Rivera",
    role: "basic_se",
    level: "Basic",
    managerId: "priya",
    createdAt: "2026-03-03T12:00:00.000Z",
  },
  {
    id: "sam",
    email: "sam.nguyen@sailpoint.com",
    fullName: "Sam Nguyen",
    role: "mentor",
    level: "Advisory",
    managerId: "matt",
    createdAt: "2026-01-18T12:00:00.000Z",
  },
  {
    id: "casey",
    email: "casey.morgan@sailpoint.com",
    fullName: "Casey Morgan",
    role: "basic_se",
    level: "Basic",
    managerId: "jordan",
    createdAt: "2026-04-10T12:00:00.000Z",
  },
  {
    id: "john-barrett",
    email: "john.barrett@sailpoint.com",
    fullName: "John Barrett",
    role: "manager",
    level: "Senior",
    managerId: "matt",
    createdAt: "2026-05-01T12:00:00.000Z",
  },
  {
    id: "avery",
    email: "avery.brooks@example.com",
    fullName: "Avery Brooks",
    role: "basic_se",
    level: "Basic",
    managerId: "john-barrett",
    createdAt: "2026-05-10T12:00:00.000Z",
  },
  {
    id: "blake",
    email: "blake.chen@example.com",
    fullName: "Blake Chen",
    role: "basic_se",
    level: "Basic",
    managerId: "john-barrett",
    createdAt: "2026-05-10T12:00:00.000Z",
  },
  {
    id: "caleb",
    email: "caleb.diaz@example.com",
    fullName: "Caleb Diaz",
    role: "basic_se",
    level: "Basic",
    managerId: "john-barrett",
    createdAt: "2026-05-10T12:00:00.000Z",
  },
  {
    id: "dana",
    email: "dana.evans@example.com",
    fullName: "Dana Evans",
    role: "basic_se",
    level: "Basic",
    managerId: "john-barrett",
    createdAt: "2026-05-10T12:00:00.000Z",
  },
  {
    id: "ellis",
    email: "ellis.foster@example.com",
    fullName: "Ellis Foster",
    role: "basic_se",
    level: "Basic",
    managerId: "john-barrett",
    createdAt: "2026-05-10T12:00:00.000Z",
  },
  {
    id: "finn",
    email: "finn.grant@example.com",
    fullName: "Finn Grant",
    role: "basic_se",
    level: "Basic",
    managerId: "matt",
    createdAt: "2026-05-10T12:00:00.000Z",
  },
  {
    id: "gray",
    email: "gray.hayes@example.com",
    fullName: "Gray Hayes",
    role: "basic_se",
    level: "Basic",
    managerId: "matt",
    createdAt: "2026-05-10T12:00:00.000Z",
  },
  {
    id: "harper",
    email: "harper.ivan@example.com",
    fullName: "Harper Ivan",
    role: "basic_se",
    level: "Basic",
    managerId: "matt",
    createdAt: "2026-05-10T12:00:00.000Z",
  },
  {
    id: "indigo",
    email: "indigo.james@example.com",
    fullName: "Indigo James",
    role: "basic_se",
    level: "Basic",
    managerId: "matt",
    createdAt: "2026-05-10T12:00:00.000Z",
  },
  {
    id: "jules",
    email: "jules.kim@example.com",
    fullName: "Jules Kim",
    role: "basic_se",
    level: "Basic",
    managerId: "matt",
    createdAt: "2026-05-10T12:00:00.000Z",
  },
];

export const competencies: Competency[] = [
  {
    id: "workflows",
    name: "ISC Workflows and Forms",
    category: "Platform",
    description: "Can map business process automation to Identity Security Cloud workflows, forms, and transforms.",
  },
  {
    id: "sled",
    name: "SLED Vertical Knowledge",
    category: "Vertical",
    description: "Understands state, local, and education procurement, compliance, and identity lifecycle drivers.",
  },
  {
    id: "demo",
    name: "Executive Demo Storytelling",
    category: "Demo Skills",
    description: "Frames demos around customer outcomes instead of feature tours.",
  },
  {
    id: "objections",
    name: "Objection Handling - Shadow AI",
    category: "Discovery",
    description: "Handles AI governance, SaaS sprawl, and privileged access risk objections with concise evidence.",
  },
  {
    id: "connectors",
    name: "Entra ID / AD Connectors",
    category: "Technical",
    description: "Explains authoritative sources, aggregations, provisioning, and connector limits accurately.",
  },
];

export const plans: UserPlan[] = [
  {
    id: "plan-alex",
    userId: "alex",
    mentorId: "sam",
    name: "Basic SE 90-Day Identity Security Ramp",
    startDate: "2026-06-01",
    targetCompletion: "2026-09-15",
    status: "in_progress",
    progress: 54,
    steps: [
      {
        id: "step-1",
        title: "Review ISC core pitch deck",
        description: "Read the latest Identity Security Cloud positioning deck and record three discovery questions.",
        type: "content_review",
        order: 1,
        status: "completed",
        resourceUrl: "https://www.sailpoint.com/identity-library/",
      },
      {
        id: "step-2",
        title: "Entra ID connector challenge",
        description: "Explain aggregation and provisioning flow for an Entra ID + AD hybrid customer.",
        type: "challenge",
        order: 2,
        status: "submitted",
        dueDate: "2026-07-08",
      },
      {
        id: "step-3",
        title: "Healthcare CISO simulation",
        description: "Practice a 25-minute customer meeting focused on Shadow AI governance and privileged reviews.",
        type: "simulation",
        order: 3,
        status: "in_progress",
        dueDate: "2026-07-15",
      },
      {
        id: "step-4",
        title: "Mentor review gate",
        description: "Review coaching card outcomes and agree on the next two practice reps.",
        type: "mentor_review",
        order: 4,
        status: "not_started",
        dueDate: "2026-07-20",
      },
    ],
  },
  {
    id: "plan-jordan",
    userId: "jordan",
    mentorId: "sam",
    name: "Senior SE Advisory Readiness",
    startDate: "2026-05-20",
    targetCompletion: "2026-08-30",
    status: "in_progress",
    progress: 72,
    steps: [
      {
        id: "step-5",
        title: "Machine identity discovery workshop",
        description: "Build a discovery guide for machine identities, non-human access, and app ownership.",
        type: "challenge",
        order: 1,
        status: "reviewed",
      },
      {
        id: "step-6",
        title: "SLED advisory meeting simulation",
        description: "Run a role-play for a higher-ed IAM modernization initiative.",
        type: "simulation",
        order: 2,
        status: "completed",
      },
    ],
  },
  {
    id: "plan-casey",
    userId: "casey",
    mentorId: "jordan",
    name: "Foundational Demo Readiness",
    startDate: "2026-06-10",
    targetCompletion: "2026-10-01",
    status: "in_progress",
    progress: 28,
    steps: [
      {
        id: "step-7",
        title: "Shadow an ISC demo",
        description: "Log customer context, business pain, and what landed during the demo.",
        type: "shadow_meeting_log",
        order: 1,
        status: "completed",
      },
      {
        id: "step-8",
        title: "Build a five-minute access request story",
        description: "Demonstrate forms, access profiles, and approval policy in a concise customer story.",
        type: "challenge",
        order: 2,
        status: "in_progress",
      },
    ],
  },
];

export const challenges: Challenge[] = [
  {
    id: "challenge-entra",
    title: "Hybrid Entra ID Lifecycle Walkthrough",
    description: "Prepare a customer-ready explanation for moving from manual Joiner/Mover/Leaver work to ISC-driven access changes across Entra ID and AD.",
    steps: [
      "Map joiner, mover, and leaver events to ISC workflow triggers in your lab tenant.",
      "Document authoritative source settings for Entra ID and downstream AD correlation.",
      "Record a five-minute customer talk track covering timing, risk, and audit outcomes.",
    ],
    difficulty: "foundational",
    estimatedMinutes: 45,
    linkedSolutions: ["Identity Security Cloud", "Entra ID connector", "Workflows"],
    linkedResources: ["https://documentation.sailpoint.com/saas/help/setup/entra.html"],
    successCriteria: [
      "Explains authoritative source and aggregation timing accurately",
      "Connects workflow automation to customer business outcomes",
      "Names one limitation and one escalation path",
    ],
    isAiGenerated: false,
    createdBy: "sam",
  },
  {
    id: "challenge-shadow-ai",
    title: "Shadow AI Risk Discovery Brief",
    description: "Create five discovery questions and a two-slide talk track for a CISO concerned about unsanctioned AI tools and sensitive access.",
    steps: [
      "Research Shadow AI identity risks and list five discovery questions for a CISO workshop.",
      "Draft two slides: current-state risk and recommended ISC governance controls.",
      "Practice a three-minute executive opening that ties risk to measurable next steps.",
    ],
    difficulty: "intermediate",
    estimatedMinutes: 60,
    linkedSolutions: ["SailPoint AI Services", "Access certifications", "Privileged reviews"],
    linkedResources: ["https://www.sailpoint.com/products/agent-identity-security"],
    successCriteria: [
      "Frames Shadow AI as identity and access risk",
      "Uses a credible customer scenario",
      "Recommends a next step tied to measurable risk reduction",
    ],
    isAiGenerated: true,
    createdBy: "alex",
  },
];

export const submissions: ChallengeSubmission[] = [
  {
    id: "submission-1",
    userId: "alex",
    challengeId: "challenge-entra",
    status: "reviewed",
    reflectionText: "I can explain the connector flow and tied JML events to workflow triggers with customer-ready language.",
    managerGrade: 4,
    managerFeedback: "Solid lifecycle narrative. Tighten transform examples on the next one.",
    aiSuggestedScore: 82,
    submittedAt: "2026-07-01T18:20:00.000Z",
    reviewedAt: "2026-07-02T10:15:00.000Z",
  },
  {
    id: "submission-2",
    userId: "jordan",
    challengeId: "challenge-shadow-ai",
    status: "reviewed",
    reflectionText: "The persona pushed on AI policy ownership; I tied the answer back to access governance.",
    managerGrade: 4,
    managerFeedback: "Strong executive framing. Add a sharper quantified risk example next time.",
    aiSuggestedScore: 88,
    submittedAt: "2026-06-29T15:45:00.000Z",
    reviewedAt: "2026-06-30T11:10:00.000Z",
  },
];

export const simulations: SimulationAssignment[] = [
  {
    id: "sim-1",
    assignedTo: "alex",
    assignedBy: "priya",
    persona: "Healthcare CISO",
    vertical: "Healthcare",
    solutionFocus: "Shadow AI governance and privileged access reviews",
    difficulty: "intermediate",
    status: "in_progress",
    transcript: [
      {
        speaker: "persona",
        message: "Our clinicians are experimenting with AI tools. Why is this an identity problem instead of an IT policy problem?",
      },
      {
        speaker: "se",
        message: "Identity gives you the control plane to understand who has access to sensitive data and where risky access accumulates.",
      },
    ],
  },
  {
    id: "sim-2",
    assignedTo: "jordan",
    assignedBy: "matt",
    persona: "Higher Education CIO",
    vertical: "SLED",
    solutionFocus: "Lifecycle automation for students, faculty, and contractors",
    difficulty: "advanced",
    status: "completed",
    transcript: [
      {
        speaker: "persona",
        message: "We have seasonal identity spikes every semester. What makes this different from scripting against AD?",
      },
      {
        speaker: "se",
        message: "ISC adds governance, policy, certification context, and auditable controls around the automation.",
      },
    ],
  },
];

export const coachingCards: CoachingCard[] = [
  {
    id: "card-1",
    simulationAssignmentId: "sim-1",
    userId: "alex",
    strengths: [
      "Connected Shadow AI risk to identity governance quickly",
      "Used healthcare language without over-indexing on product names",
    ],
    gaps: [
      "Did not ask who owns approval policy for sensitive clinical applications",
      "Could quantify audit risk more clearly",
    ],
    recommendedImprovements: [
      "Open with one discovery question before offering the solution frame",
      "Use a concise example involving access certification and privileged review evidence",
    ],
    score: 78,
    linkedCompetencies: ["objections", "demo"],
    managerSummary:
      "Alex is progressing on persona language but should deepen discovery before solutioning in healthcare simulations.",
    seReflection: "I need to slow down and ask one more question before answering objections.",
    managerReviewStatus: "reviewed",
    isPractice: false,
    managerComments: "Strong healthcare framing. Quantify audit risk earlier next round.",
    managerGrade: 4,
    sentToManagerAt: "2026-07-01T20:00:00.000Z",
    reviewedAt: "2026-07-02T14:00:00.000Z",
  },
  {
    id: "card-2",
    simulationAssignmentId: "sim-2",
    userId: "jordan",
    strengths: [
      "Strong SLED examples for semester-based lifecycle events",
      "Clear distinction between scripts and governed automation",
    ],
    gaps: ["Could ask more about budget ownership and procurement timing"],
    recommendedImprovements: [
      "Add a close that proposes a scoped workshop with success criteria",
    ],
    score: 91,
    linkedCompetencies: ["sled", "workflows"],
    managerSummary: "Jordan delivered strong SLED-specific language and is ready for workshop shadowing with minor timing qualification improvements.",
    seReflection: "The SLED persona worked well; next time I will qualify timing earlier.",
    managerReviewStatus: "reviewed",
    isPractice: false,
    managerComments: "Ready for advisory-level customer workshop shadowing.",
    managerGrade: 5,
    sentToManagerAt: "2026-06-28T17:00:00.000Z",
    reviewedAt: "2026-06-30T14:30:00.000Z",
  },
];

export const activity: ActivityLog[] = [
  {
    id: "activity-1",
    userId: "alex",
    eventType: "challenge_submitted",
    title: "Submitted Hybrid Entra ID Lifecycle Walkthrough",
    metadata: { score: 82, status: "manager review" },
    createdAt: "2026-07-01T18:20:00.000Z",
  },
  {
    id: "activity-2",
    userId: "alex",
    eventType: "simulation_completed",
    title: "Completed Healthcare CISO simulation checkpoint",
    metadata: { persona: "Healthcare CISO", score: 78 },
    createdAt: "2026-07-01T20:00:00.000Z",
  },
  {
    id: "activity-3",
    userId: "jordan",
    eventType: "coaching_card_reviewed",
    title: "Manager reviewed SLED advisory coaching card",
    metadata: { grade: 5 },
    createdAt: "2026-06-30T14:30:00.000Z",
  },
  {
    id: "activity-4",
    userId: "casey",
    eventType: "plan_step_completed",
    title: "Logged first ISC demo shadow",
    metadata: { plan: "Foundational Demo Readiness" },
    createdAt: "2026-06-27T16:30:00.000Z",
  },
  {
    id: "activity-5",
    userId: "alex",
    eventType: "plan_assigned",
    title: "Assigned Basic SE 90-Day Identity Security Ramp",
    metadata: { mentor: "Sam Nguyen" },
    createdAt: "2026-06-01T13:00:00.000Z",
  },
];

export const notifications: Notification[] = [
  {
    id: "notification-1",
    userId: "priya",
    title: "Challenge ready for review",
    body: "Alex submitted Hybrid Entra ID Lifecycle Walkthrough.",
    readAt: null,
    createdAt: "2026-07-01T18:21:00.000Z",
  },
  {
    id: "notification-2",
    userId: "alex",
    title: "Coaching card created",
    body: "Healthcare CISO simulation coaching card was routed to Priya.",
    readAt: null,
    createdAt: "2026-07-01T20:02:00.000Z",
  },
];

export function getSubtree(profileId: string, allProfiles = profiles) {
  const descendants: Profile[] = [];
  const queue = allProfiles.filter((profile) => profile.managerId === profileId);

  while (queue.length > 0) {
    const next = queue.shift();

    if (!next) {
      continue;
    }

    descendants.push(next);
    queue.push(...allProfiles.filter((profile) => profile.managerId === next.id));
  }

  return descendants;
}

export function getDemoDashboardData(currentUserId = "priya"): DashboardData {
  const currentUser = profiles.find((profile) => profile.id === currentUserId) ?? profiles[0];
  const myOrg = getSubtree(currentUser.id);

  return {
    currentUser,
    myOrg,
    profiles,
    plans,
    challenges,
    submissions,
    simulations,
    coachingCards,
    activity,
    competencies,
    notifications,
  };
}
