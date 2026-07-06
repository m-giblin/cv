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
          unlocked_segment_max: number;
          program_id: string | null;
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
          unlocked_segment_max?: number;
          program_id?: string | null;
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
          target_level: Database["public"]["Enums"]["se_level"] | null;
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
          target_level?: Database["public"]["Enums"]["se_level"] | null;
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
          asset_type: string;
          project_tags: string[];
          module_tags: string[];
          is_link_only: boolean;
          version: number;
          superseded_by: string | null;
          last_verified_at: string | null;
          health_status: string;
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
          asset_type?: string;
          project_tags?: string[];
          module_tags?: string[];
          is_link_only?: boolean;
          version?: number;
          superseded_by?: string | null;
          last_verified_at?: string | null;
          health_status?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["content_assets"]["Insert"]>;
        Relationships: [];
      };
      corpus_asset_feedback: {
        Row: {
          id: string;
          content_asset_id: string;
          user_id: string;
          is_confusing: boolean;
          comment: string | null;
          status: string;
          admin_note: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          content_asset_id: string;
          user_id: string;
          is_confusing?: boolean;
          comment?: string | null;
          status?: string;
          admin_note?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["corpus_asset_feedback"]["Insert"]>;
        Relationships: [];
      };
      corpus_routing_rules: {
        Row: {
          id: string;
          tag: string;
          destination_type: string;
          destination_address: string;
          label: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tag: string;
          destination_type: string;
          destination_address: string;
          label?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["corpus_routing_rules"]["Insert"]>;
        Relationships: [];
      };
      corpus_qa_inquiries: {
        Row: {
          id: string;
          user_id: string;
          content_asset_id: string | null;
          question: string;
          asset_tags: string[];
          routed_destination_type: string | null;
          routed_destination_address: string | null;
          confidence_score: number | null;
          draft_answer: string | null;
          source_urls: string[];
          escalated_at: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          content_asset_id?: string | null;
          question: string;
          asset_tags?: string[];
          routed_destination_type?: string | null;
          routed_destination_address?: string | null;
          confidence_score?: number | null;
          draft_answer?: string | null;
          source_urls?: string[];
          escalated_at?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["corpus_qa_inquiries"]["Insert"]>;
        Relationships: [];
      };
      release_courses: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          project_tag: string;
          plan_id: string | null;
          lab_mode: string | null;
          pitch_topic: string | null;
          corpus_tag_filters: string[];
          slack_announce_channel: string | null;
          created_by: string | null;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          project_tag: string;
          plan_id?: string | null;
          lab_mode?: string | null;
          pitch_topic?: string | null;
          corpus_tag_filters?: string[];
          slack_announce_channel?: string | null;
          created_by?: string | null;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["release_courses"]["Insert"]>;
        Relationships: [];
      };
      enablement_programs: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          segment_count: number;
          cert_valid_months: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          segment_count?: number;
          cert_valid_months?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["enablement_programs"]["Insert"]>;
        Relationships: [];
      };
      enablement_program_segments: {
        Row: {
          id: string;
          program_id: string;
          segment_index: number;
          plan_id: string;
        };
        Insert: {
          id?: string;
          program_id: string;
          segment_index: number;
          plan_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["enablement_program_segments"]["Insert"]>;
        Relationships: [];
      };
      segment_certificates: {
        Row: {
          id: string;
          assignment_id: string;
          user_id: string;
          program_id: string | null;
          segment_index: number;
          certificate_code: string;
          issued_at: string;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          assignment_id: string;
          user_id: string;
          program_id?: string | null;
          segment_index: number;
          certificate_code: string;
          issued_at?: string;
          expires_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["segment_certificates"]["Insert"]>;
        Relationships: [];
      };
      segment_unlock_overrides: {
        Row: {
          id: string;
          assignment_id: string;
          unlocked_segment_max: number;
          reason: string;
          overridden_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          assignment_id: string;
          unlocked_segment_max: number;
          reason: string;
          overridden_by: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["segment_unlock_overrides"]["Insert"]>;
        Relationships: [];
      };
      plan_step_prerequisites: {
        Row: {
          id: string;
          plan_step_id: string;
          prerequisite_plan_step_id: string;
        };
        Insert: {
          id?: string;
          plan_step_id: string;
          prerequisite_plan_step_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["plan_step_prerequisites"]["Insert"]>;
        Relationships: [];
      };
      corpus_sme_answers: {
        Row: {
          id: string;
          question: string;
          answer: string;
          content_asset_id: string | null;
          project_tags: string[];
          confidence_score: number | null;
          source_feedback_id: string | null;
          created_by: string | null;
          published_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          question: string;
          answer: string;
          content_asset_id?: string | null;
          project_tags?: string[];
          confidence_score?: number | null;
          source_feedback_id?: string | null;
          created_by?: string | null;
          published_at?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["corpus_sme_answers"]["Insert"]>;
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
          meeting_type: string | null;
          deal_stage: string | null;
          attendees: string | null;
          meeting_date: string | null;
          competitors: string | null;
          debrief_notes: string | null;
          shared_with_manager: boolean;
          manager_comment: string | null;
          parent_session_id: string | null;
          account_key: string | null;
          version_number: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          account_name: string;
          industry: string;
          solutions?: string[];
          account_context?: string | null;
          prep_output?: Json;
          meeting_type?: string | null;
          deal_stage?: string | null;
          attendees?: string | null;
          meeting_date?: string | null;
          competitors?: string | null;
          debrief_notes?: string | null;
          shared_with_manager?: boolean;
          manager_comment?: string | null;
          parent_session_id?: string | null;
          account_key?: string | null;
          version_number?: number;
          created_at?: string;
          updated_at?: string;
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
      learn_module_progress: {
        Row: {
          id: string;
          user_id: string;
          module_id: string;
          completed_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          module_id: string;
          completed_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["learn_module_progress"]["Insert"]>;
        Relationships: [];
      };
      market_pulse_weeks: {
        Row: {
          week_id: string;
          questions: Json;
          source: string;
          created_at: string;
        };
        Insert: {
          week_id: string;
          questions: Json;
          source?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["market_pulse_weeks"]["Insert"]>;
        Relationships: [];
      };
      market_pulse_results: {
        Row: {
          id: string;
          user_id: string;
          week_id: string;
          score: number;
          total: number;
          answers: Json;
          submitted_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          week_id: string;
          score: number;
          total: number;
          answers?: Json;
          submitted_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["market_pulse_results"]["Insert"]>;
        Relationships: [];
      };
      integration_connections: {
        Row: {
          id: string;
          user_id: string;
          provider: string;
          access_token: string | null;
          refresh_token: string | null;
          expires_at: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider: string;
          access_token?: string | null;
          refresh_token?: string | null;
          expires_at?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["integration_connections"]["Insert"]>;
        Relationships: [];
      };
      isc_lab_interactions: {
        Row: {
          id: string;
          user_id: string;
          mode: string;
          query: string;
          account_name: string | null;
          reply_preview: string | null;
          sources: Json;
          model: string | null;
          provider: string | null;
          recommended_challenge_id: string | null;
          recommended_cert_type: string | null;
          saved_to_prep_session_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          mode: string;
          query: string;
          account_name?: string | null;
          reply_preview?: string | null;
          sources?: Json;
          model?: string | null;
          provider?: string | null;
          recommended_challenge_id?: string | null;
          recommended_cert_type?: string | null;
          saved_to_prep_session_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["isc_lab_interactions"]["Insert"]>;
        Relationships: [];
      };
      isc_lab_knowledge_chunks: {
        Row: {
          id: string;
          kind: string;
          url: string | null;
          title: string;
          body: string;
          tags: string[];
          source_fetched_at: string | null;
          content_version: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          kind: string;
          url?: string | null;
          title: string;
          body: string;
          tags?: string[];
          source_fetched_at?: string | null;
          content_version?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["isc_lab_knowledge_chunks"]["Insert"]>;
        Relationships: [];
      };
      isc_lab_precall_briefs: {
        Row: {
          id: string;
          user_id: string;
          deal_prep_session_id: string | null;
          account_name: string;
          meeting_date: string | null;
          brief_markdown: string;
          sources: Json;
          delivered_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          deal_prep_session_id?: string | null;
          account_name: string;
          meeting_date?: string | null;
          brief_markdown: string;
          sources?: Json;
          delivered_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["isc_lab_precall_briefs"]["Insert"]>;
        Relationships: [];
      };
      adaptive_probe_sessions: {
        Row: {
          id: string;
          user_id: string;
          status: string;
          focus_competencies: string[];
          responses: Json;
          competency_scores: Json;
          field_signal_score: number | null;
          recommended_actions: Json;
          started_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          status?: string;
          focus_competencies?: string[];
          responses?: Json;
          competency_scores?: Json;
          field_signal_score?: number | null;
          recommended_actions?: Json;
          started_at?: string;
          completed_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["adaptive_probe_sessions"]["Insert"]>;
        Relationships: [];
      };
      pitch_peer_reviews: {
        Row: {
          id: string;
          pitch_id: string;
          reviewer_id: string;
          clarity_score: number;
          storyline_score: number;
          differentiation_score: number;
          comment: string | null;
          endorsed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          pitch_id: string;
          reviewer_id: string;
          clarity_score: number;
          storyline_score: number;
          differentiation_score: number;
          comment?: string | null;
          endorsed?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["pitch_peer_reviews"]["Insert"]>;
        Relationships: [];
      };
      gamification_events: {
        Row: {
          id: string;
          user_id: string;
          event_type: string;
          points: number;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_type: string;
          points?: number;
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["gamification_events"]["Insert"]>;
        Relationships: [];
      };
      buyer_share_rooms: {
        Row: {
          id: string;
          token: string;
          user_id: string;
          prep_session_id: string | null;
          account_name: string;
          title: string;
          room_payload: Json;
          view_count: number;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          token: string;
          user_id: string;
          prep_session_id?: string | null;
          account_name: string;
          title: string;
          room_payload?: Json;
          view_count?: number;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["buyer_share_rooms"]["Insert"]>;
        Relationships: [];
      };
      buyer_share_events: {
        Row: {
          id: string;
          room_id: string;
          event_type: string;
          resource_label: string | null;
          viewer_fingerprint: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          event_type: string;
          resource_label?: string | null;
          viewer_fingerprint?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["buyer_share_events"]["Insert"]>;
        Relationships: [];
      };
      gong_call_intel: {
        Row: {
          id: string;
          user_id: string | null;
          account_name: string;
          account_key: string;
          call_count: number;
          avg_talk_ratio: number | null;
          objection_themes: Json;
          brief_summary: string | null;
          talk_track_hints: Json;
          risk_signals: Json;
          source: string;
          fetched_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          account_name: string;
          account_key: string;
          call_count?: number;
          avg_talk_ratio?: number | null;
          objection_themes?: Json;
          brief_summary?: string | null;
          talk_track_hints?: Json;
          risk_signals?: Json;
          source?: string;
          fetched_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["gong_call_intel"]["Insert"]>;
        Relationships: [];
      };
      pitch_submissions: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          evidence_path: string;
          reflection_text: string | null;
          target_type: Database["public"]["Enums"]["pitch_target_type"];
          target_id: string | null;
          status: string;
          manager_feedback: string | null;
          manager_grade: number | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          evidence_path: string;
          reflection_text?: string | null;
          target_type?: Database["public"]["Enums"]["pitch_target_type"];
          target_id?: string | null;
          status?: string;
          manager_feedback?: string | null;
          manager_grade?: number | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["pitch_submissions"]["Insert"]>;
        Relationships: [];
      };
      resource_engagement: {
        Row: {
          id: string;
          user_id: string;
          resource_label: string;
          resource_url: string | null;
          account_name: string | null;
          event_type: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          resource_label: string;
          resource_url?: string | null;
          account_name?: string | null;
          event_type: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["resource_engagement"]["Insert"]>;
        Relationships: [];
      };
      platform_settings: {
        Row: {
          id: string;
          provider: string;
          model: string;
          api_key_ciphertext: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          provider?: string;
          model?: string;
          api_key_ciphertext?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["platform_settings"]["Insert"]>;
        Relationships: [];
      };
      ai_usage_logs: {
        Row: {
          id: string;
          feature: string;
          provider: string | null;
          model: string | null;
          prompt_tokens: number;
          completion_tokens: number;
          total_tokens: number;
          user_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          feature: string;
          provider?: string | null;
          model?: string | null;
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
          user_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ai_usage_logs"]["Insert"]>;
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
          p_actor_id?: string;
        };
        Returns: string;
      };
      recalculate_plan_progress: {
        Args: { p_assignment_id: string };
        Returns: undefined;
      };
      search_isc_lab_chunks: {
        Args: { search_query: string; result_limit?: number };
        Returns: {
          id: string;
          kind: string;
          url: string | null;
          title: string;
          body: string;
          tags: string[] | null;
          rank: number;
          source_fetched_at: string | null;
          content_version: string | null;
        }[];
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
        | "deal_prep"
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
        | "advisory_readiness"
        | "agentic_fabric"
        | "ais_readiness"
        | "mcp_governance";
      certification_status: "not_started" | "submitted" | "approved" | "revoked";
      pitch_target_type: "challenge" | "certification" | "practice";
    };
  };
};
