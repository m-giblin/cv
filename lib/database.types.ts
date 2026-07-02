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
          challenge_id?: string | null;
          simulation_template_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["plan_steps"]["Insert"]>;
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
      };
      simulation_assignments: {
        Row: {
          id: string;
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
          sent_to_manager_at?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["coaching_cards"]["Insert"]>;
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
      };
      competencies: {
        Row: {
          id: string;
          name: string;
          category: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category: string;
          description?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["competencies"]["Insert"]>;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          body: string;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          body: string;
          read_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
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
      review_status: "pending" | "reviewed";
    };
  };
};
