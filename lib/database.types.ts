export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: Database["public"]["Enums"]["profile_role"];
          level: Database["public"]["Enums"]["se_level"];
          manager_id: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role?: Database["public"]["Enums"]["profile_role"];
          level?: Database["public"]["Enums"]["se_level"];
          manager_id?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      onboarding_plans: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          is_template: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          is_template?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["onboarding_plans"]["Insert"]>;
        Relationships: [];
      };
      plan_steps: {
        Row: {
          id: string;
          plan_id: string;
          title: string;
          description: string | null;
          step_type: Database["public"]["Enums"]["plan_step_type"];
          sort_order: number;
          content_url: string | null;
          content_asset_id: string | null;
          challenge_id: string | null;
          simulation_template_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          title: string;
          description?: string | null;
          step_type: Database["public"]["Enums"]["plan_step_type"];
          sort_order: number;
          content_url?: string | null;
          content_asset_id?: string | null;
          challenge_id?: string | null;
          simulation_template_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["plan_steps"]["Insert"]>;
        Relationships: [];
      };
      plan_assignments: {
        Row: {
          id: string;
          plan_id: string;
          user_id: string;
          mentor_id: string | null;
          assigned_by: string | null;
          start_date: string;
          target_completion: string | null;
          status: Database["public"]["Enums"]["assignment_status"];
          progress_percent: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          user_id: string;
          mentor_id?: string | null;
          assigned_by?: string | null;
          start_date?: string;
          target_completion?: string | null;
          status?: Database["public"]["Enums"]["assignment_status"];
          progress_percent?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["plan_assignments"]["Insert"]>;
        Relationships: [];
      };
      plan_assignment_steps: {
        Row: {
          id: string;
          assignment_id: string;
          plan_step_id: string;
          status: Database["public"]["Enums"]["assignment_status"];
          due_date: string | null;
          completed_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          assignment_id: string;
          plan_step_id: string;
          status?: Database["public"]["Enums"]["assignment_status"];
          due_date?: string | null;
          completed_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["plan_assignment_steps"]["Insert"]>;
        Relationships: [];
      };
      challenges: {
        Row: {
          id: string;
          title: string;
          description: string;
          steps: Json;
          success_criteria: Json;
          linked_solutions: string[];
          difficulty: Database["public"]["Enums"]["difficulty"];
          estimated_minutes: number;
          created_by: string | null;
          is_ai_generated: boolean;
          ai_metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          steps?: Json;
          success_criteria?: Json;
          linked_solutions?: string[];
          difficulty?: Database["public"]["Enums"]["difficulty"];
          estimated_minutes?: number;
          created_by?: string | null;
          is_ai_generated?: boolean;
          ai_metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["challenges"]["Insert"]>;
        Relationships: [];
      };
      challenge_submissions: {
        Row: {
          id: string;
          user_id: string;
          challenge_id: string;
          status: Database["public"]["Enums"]["assignment_status"];
          evidence_files: string[];
          reflection_text: string | null;
          manager_grade: number | null;
          manager_feedback: string | null;
          ai_suggested_score: number | null;
          submitted_at: string | null;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          challenge_id: string;
          status?: Database["public"]["Enums"]["assignment_status"];
          evidence_files?: string[];
          reflection_text?: string | null;
          manager_grade?: number | null;
          manager_feedback?: string | null;
          ai_suggested_score?: number | null;
          submitted_at?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["challenge_submissions"]["Insert"]>;
        Relationships: [];
      };
      simulation_assignments: {
        Row: {
          id: string;
          template_id: string | null;
          assigned_to: string;
          assigned_by: string | null;
          persona: string;
          vertical: string;
          solution_focus: string;
          difficulty: Database["public"]["Enums"]["difficulty"];
          status: Database["public"]["Enums"]["assignment_status"];
          session_data: Json;
          transcript: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          template_id?: string | null;
          assigned_to: string;
          assigned_by?: string | null;
          persona: string;
          vertical: string;
          solution_focus: string;
          difficulty?: Database["public"]["Enums"]["difficulty"];
          status?: Database["public"]["Enums"]["assignment_status"];
          session_data?: Json;
          transcript?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["simulation_assignments"]["Insert"]>;
        Relationships: [];
      };
      coaching_cards: {
        Row: {
          id: string;
          simulation_assignment_id: string | null;
          user_id: string;
          structured_output: Json;
          se_reflection: string | null;
          manager_review_status: Database["public"]["Enums"]["review_status"];
          manager_comments: string | null;
          manager_grade: number | null;
          is_practice: boolean;
          sent_to_manager_at: string | null;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          simulation_assignment_id?: string | null;
          user_id: string;
          structured_output: Json;
          se_reflection?: string | null;
          manager_review_status?: Database["public"]["Enums"]["review_status"];
          manager_comments?: string | null;
          manager_grade?: number | null;
          is_practice?: boolean;
          sent_to_manager_at?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["coaching_cards"]["Insert"]>;
        Relationships: [];
      };
      activity_logs: {
        Row: {
          id: string;
          user_id: string;
          actor_id: string | null;
          event_type: string;
          title: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          actor_id?: string | null;
          event_type: string;
          title: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["activity_logs"]["Insert"]>;
        Relationships: [];
      };
      competencies: {
        Row: {
          id: string;
          name: string;
          category: string;
          description: string | null;
          rubric: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category: string;
          description?: string | null;
          rubric?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["competencies"]["Insert"]>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          body: string;
          action_url: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          body: string;
          action_url?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
        Relationships: [];
      };
      simulation_templates: {
        Row: {
          id: string;
          name: string;
          persona: string;
          vertical: string;
          solution_focus: string;
          difficulty: Database["public"]["Enums"]["difficulty"];
          prompt_body: string;
          practice_rounds_before_submit: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          persona: string;
          vertical: string;
          solution_focus: string;
          difficulty?: Database["public"]["Enums"]["difficulty"];
          prompt_body: string;
          practice_rounds_before_submit?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["simulation_templates"]["Insert"]>;
        Relationships: [];
      };
      content_assets: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          storage_path: string;
          content_type: string | null;
          linked_solutions: string[];
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          storage_path: string;
          content_type?: string | null;
          linked_solutions?: string[];
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["content_assets"]["Insert"]>;
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          target_type: string;
          target_id: string | null;
          details: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          action: string;
          target_type: string;
          target_id?: string | null;
          details?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Insert"]>;
        Relationships: [];
      };
      development_plans: {
        Row: {
          id: string;
          user_id: string;
          manager_id: string | null;
          year: number;
          status: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          manager_id?: string | null;
          year: number;
          status?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["development_plans"]["Insert"]>;
        Relationships: [];
      };
      development_goals: {
        Row: {
          id: string;
          plan_id: string;
          competency_id: string | null;
          title: string;
          description: string | null;
          evidence_type: string;
          sort_order: number;
          overall_status: Database["public"]["Enums"]["goal_status"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          competency_id?: string | null;
          title: string;
          description?: string | null;
          evidence_type?: string;
          sort_order?: number;
          overall_status?: Database["public"]["Enums"]["goal_status"];
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["development_goals"]["Insert"]>;
        Relationships: [];
      };
      goal_quarterly_reviews: {
        Row: {
          id: string;
          goal_id: string;
          quarter: string;
          year: number;
          due_date: string;
          status: Database["public"]["Enums"]["goal_status"];
          se_evidence: string | null;
          se_evidence_url: string | null;
          manager_comments: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          goal_id: string;
          quarter: string;
          year: number;
          due_date: string;
          status?: Database["public"]["Enums"]["goal_status"];
          se_evidence?: string | null;
          se_evidence_url?: string | null;
          manager_comments?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["goal_quarterly_reviews"]["Insert"]>;
        Relationships: [];
      };
      deal_prep_sessions: {
        Row: {
          id: string;
          user_id: string;
          account_name: string;
          industry: string;
          solutions: string[];
          account_context: string | null;
          prep_output: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          account_name: string;
          industry: string;
          solutions?: string[];
          account_context?: string | null;
          prep_output?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["deal_prep_sessions"]["Insert"]>;
        Relationships: [];
      };
      shadow_meeting_logs: {
        Row: {
          id: string;
          user_id: string;
          assignment_step_id: string | null;
          meeting_date: string;
          customer_name: string | null;
          notes: string;
          takeaways: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          assignment_step_id?: string | null;
          meeting_date?: string;
          customer_name?: string | null;
          notes: string;
          takeaways?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["shadow_meeting_logs"]["Insert"]>;
        Relationships: [];
      };
      mentor_review_requests: {
        Row: {
          id: string;
          user_id: string;
          mentor_id: string | null;
          assignment_step_id: string | null;
          topic: string;
          se_notes: string | null;
          mentor_feedback: string | null;
          status: string;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          mentor_id?: string | null;
          assignment_step_id?: string | null;
          topic: string;
          se_notes?: string | null;
          mentor_feedback?: string | null;
          status?: string;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["mentor_review_requests"]["Insert"]>;
        Relationships: [];
      };
      manager_coaching_notes: {
        Row: {
          id: string;
          manager_id: string;
          se_user_id: string;
          notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          manager_id: string;
          se_user_id: string;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["manager_coaching_notes"]["Insert"]>;
        Relationships: [];
      };
      readiness_certifications: {
        Row: {
          id: string;
          user_id: string;
          certification_type: Database["public"]["Enums"]["certification_type"];
          status: Database["public"]["Enums"]["certification_status"];
          evidence_text: string | null;
          evidence_url: string | null;
          approved_by: string | null;
          approved_at: string | null;
          manager_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          certification_type: Database["public"]["Enums"]["certification_type"];
          status?: Database["public"]["Enums"]["certification_status"];
          evidence_text?: string | null;
          evidence_url?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          manager_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["readiness_certifications"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_profile_subtree: {
        Args: { root_profile_id: string };
        Returns: { id: string }[];
      };
      can_access_profile: {
        Args: { target_profile_id: string };
        Returns: boolean;
      };
      insert_audit_log: {
        Args: {
          p_action: string;
          p_target_type: string;
          p_target_id?: string;
          p_details?: Json;
        };
        Returns: string;
      };
      recalculate_plan_progress: {
        Args: { p_assignment_id: string };
        Returns: undefined;
      };
    };
    CompositeTypes: {
      [_ in never]: never;
    };
    Enums: {
      profile_role:
        | "basic_se"
        | "senior_se"
        | "advisory_solutions_consultant"
        | "mentor"
        | "manager"
        | "director"
        | "admin";
      se_level: "Basic" | "Senior" | "Advisory";
      plan_step_type:
        | "content_review"
        | "challenge"
        | "simulation"
        | "shadow_meeting_log"
        | "mentor_review"
        | "custom";
      assignment_status:
        | "not_started"
        | "in_progress"
        | "submitted"
        | "under_review"
        | "reviewed"
        | "completed";
      difficulty: "foundational" | "intermediate" | "advanced";
      review_status: "pending" | "reviewed" | "needs_revision";
      goal_status: "not_started" | "on_track" | "at_risk" | "achieved";
      certification_type:
        | "solo_discovery"
        | "executive_demo"
        | "competitive_bakeoff"
        | "customer_workshop"
        | "advisory_readiness";
      certification_status: "not_started" | "submitted" | "approved" | "revoked";
    };
  };
};
