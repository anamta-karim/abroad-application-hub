export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type RecordType = "program" | "scholarship";
export type ApplicationStatus =
  | "researching"
  | "preparing"
  | "submitted"
  | "interview"
  | "offer_received"
  | "rejected"
  | "withdrawn";

export type VerificationState = "unreviewed" | "partially_reviewed" | "confirmed";
export type SourceType = "webpage" | "pdf" | "pasted_text";
export type IngestionStatus = "queued" | "processing" | "ready" | "needs_review" | "failed";
export type FactType =
  | "eligibility"
  | "deadline"
  | "document"
  | "funding"
  | "application_step"
  | "interview"
  | "other";

export type ReviewState = "suggested" | "confirmed" | "edited" | "rejected";
export type Confidence = "clear" | "uncertain";
export type RequirementStatus =
  | "not_started"
  | "in_progress"
  | "requested"
  | "ready"
  | "submitted"
  | "expired"
  | "not_applicable";

export type TaskStatus = "open" | "in_progress" | "done" | "dismissed";
export type MessageRole = "user" | "assistant" | "system";
export type ReminderStatus = "watching" | "opened" | "converted" | "dismissed";

export type OpeningReminder = {
  id: string;
  user_id: string;
  title: string;
  record_type: RecordType;
  institution_or_provider: string | null;
  expected_open_date: string;
  target_cycle: string | null;
  official_url: string | null;
  notes: string | null;
  status: ReminderStatus;
  converted_application_id: string | null;
  created_at: string;
  updated_at: string;
};

export type DegreeLevel = "high_school" | "bachelors" | "masters" | "phd";

export type AcademicProfileRow = {
  user_id: string;
  highest_degree: DegreeLevel | null;
  gpa: number | null;
  gpa_scale: number | null;
  ielts_overall: number | null;
  ielts_min_band: number | null;
  toefl_ibt: number | null;
  pte_academic: number | null;
  duolingo: number | null;
  gre_total: number | null;
  gmat_total: number | null;
  work_experience_years: number | null;
  created_at: string;
  updated_at: string;
};

export type UsageKind = "ai" | "fetch" | "feedback";

export type LetterStatus = "to_ask" | "asked" | "agreed" | "submitted" | "declined";

export type RecommenderRow = {
  id: string;
  user_id: string;
  name: string;
  role: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type RecommendationRequestRow = {
  id: string;
  user_id: string;
  recommender_id: string;
  application_id: string;
  status: LetterStatus;
  asked_on: string | null;
  due_on: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Builds a table's Insert/Update shapes from its Row: columns in Required must
 * be supplied on insert, every other column has a database default or is nullable.
 */
type TableFrom<Row extends Record<string, unknown>, Required extends keyof Row> = {
  Row: Row;
  Insert: { [K in Required]: Row[K] } & { [K in Exclude<keyof Row, Required>]?: Row[K] };
  Update: { [K in keyof Row]?: Row[K] };
  Relationships: [];
};

export interface CalendarFeedEvent {
  kind: string;
  item_id: string;
  event_date: string;
  title: string;
  detail: string | null;
  application_id: string | null;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      applications: {
        Row: {
          id: string;
          user_id: string;
          record_type: RecordType;
          title: string;
          institution_or_provider: string | null;
          country: string | null;
          degree_level: string | null;
          field_of_study: string | null;
          study_period: string | null;
          status: ApplicationStatus;
          deadline: string | null;
          official_url: string | null;
          summary: string | null;
          user_notes: string | null;
          verification_state: VerificationState;
          archived_at: string | null;
          cost_currency: string | null;
          tuition_per_year: number | null;
          living_cost_per_year: number | null;
          application_fee: number | null;
          funding_per_year: number | null;
          duration_years: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          record_type: RecordType;
          title: string;
          institution_or_provider?: string | null;
          country?: string | null;
          degree_level?: string | null;
          field_of_study?: string | null;
          study_period?: string | null;
          status?: ApplicationStatus;
          deadline?: string | null;
          official_url?: string | null;
          summary?: string | null;
          user_notes?: string | null;
          verification_state?: VerificationState;
          archived_at?: string | null;
          cost_currency?: string | null;
          tuition_per_year?: number | null;
          living_cost_per_year?: number | null;
          application_fee?: number | null;
          funding_per_year?: number | null;
          duration_years?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          record_type?: RecordType;
          title?: string;
          institution_or_provider?: string | null;
          country?: string | null;
          degree_level?: string | null;
          field_of_study?: string | null;
          study_period?: string | null;
          status?: ApplicationStatus;
          deadline?: string | null;
          official_url?: string | null;
          summary?: string | null;
          user_notes?: string | null;
          verification_state?: VerificationState;
          archived_at?: string | null;
          cost_currency?: string | null;
          tuition_per_year?: number | null;
          living_cost_per_year?: number | null;
          application_fee?: number | null;
          funding_per_year?: number | null;
          duration_years?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      application_links: {
        Row: {
          id: string;
          user_id: string;
          program_application_id: string;
          scholarship_application_id: string;
          relationship_note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          program_application_id: string;
          scholarship_application_id: string;
          relationship_note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          program_application_id?: string;
          scholarship_application_id?: string;
          relationship_note?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "application_links_program_application_id_fkey";
            columns: ["program_application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "application_links_scholarship_application_id_fkey";
            columns: ["scholarship_application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["id"];
          },
        ];
      };
      sources: {
        Row: {
          id: string;
          user_id: string;
          application_id: string;
          source_type: SourceType;
          display_name: string;
          source_url: string | null;
          storage_path: string | null;
          mime_type: string | null;
          file_size_bytes: number | null;
          ingestion_status: IngestionStatus;
          retrieved_at: string | null;
          content_hash: string | null;
          error_code: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          application_id: string;
          source_type: SourceType;
          display_name: string;
          source_url?: string | null;
          storage_path?: string | null;
          mime_type?: string | null;
          file_size_bytes?: number | null;
          ingestion_status?: IngestionStatus;
          retrieved_at?: string | null;
          content_hash?: string | null;
          error_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          application_id?: string;
          source_type?: SourceType;
          display_name?: string;
          source_url?: string | null;
          storage_path?: string | null;
          mime_type?: string | null;
          file_size_bytes?: number | null;
          ingestion_status?: IngestionStatus;
          retrieved_at?: string | null;
          content_hash?: string | null;
          error_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      source_snapshots: {
        Row: {
          id: string;
          user_id: string;
          source_id: string;
          version: number;
          raw_text: string | null;
          title: string | null;
          retrieved_at: string;
          content_hash: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          source_id: string;
          version: number;
          raw_text?: string | null;
          title?: string | null;
          retrieved_at?: string;
          content_hash: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          source_id?: string;
          version?: number;
          raw_text?: string | null;
          title?: string | null;
          retrieved_at?: string;
          content_hash?: string;
        };
        Relationships: [];
      };
      source_chunks: {
        Row: {
          id: string;
          user_id: string;
          source_id: string;
          snapshot_id: string;
          application_id: string;
          chunk_index: number;
          page_number: number | null;
          section_heading: string | null;
          content: string;
          embedding: number[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          source_id: string;
          snapshot_id: string;
          application_id: string;
          chunk_index: number;
          page_number?: number | null;
          section_heading?: string | null;
          content: string;
          embedding?: number[] | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          source_id?: string;
          snapshot_id?: string;
          application_id?: string;
          chunk_index?: number;
          page_number?: number | null;
          section_heading?: string | null;
          content?: string;
          embedding?: number[] | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "source_chunks_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "sources";
            referencedColumns: ["id"];
          },
        ];
      };
      extracted_facts: {
        Row: {
          id: string;
          user_id: string;
          application_id: string;
          source_id: string;
          fact_type: FactType;
          label: string;
          value: Json;
          citation_chunk_id: string | null;
          review_state: ReviewState;
          confidence: Confidence;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          application_id: string;
          source_id: string;
          fact_type: FactType;
          label: string;
          value: Json;
          citation_chunk_id?: string | null;
          review_state?: ReviewState;
          confidence?: Confidence;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          application_id?: string;
          source_id?: string;
          fact_type?: FactType;
          label?: string;
          value?: Json;
          citation_chunk_id?: string | null;
          review_state?: ReviewState;
          confidence?: Confidence;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      document_requirements: {
        Row: {
          id: string;
          user_id: string;
          application_id: string;
          requirement_fact_id: string | null;
          document_type: string;
          notes: string | null;
          status: RequirementStatus;
          due_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          application_id: string;
          requirement_fact_id?: string | null;
          document_type: string;
          notes?: string | null;
          status?: RequirementStatus;
          due_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          application_id?: string;
          requirement_fact_id?: string | null;
          document_type?: string;
          notes?: string | null;
          status?: RequirementStatus;
          due_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "document_requirements_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["id"];
          },
        ];
      };
      user_documents: {
        Row: {
          id: string;
          user_id: string;
          document_type: string;
          display_name: string;
          storage_path: string | null;
          expires_on: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          document_type: string;
          display_name: string;
          storage_path?: string | null;
          expires_on?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          document_type?: string;
          display_name?: string;
          storage_path?: string | null;
          expires_on?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      requirement_document_links: {
        Row: {
          id: string;
          user_id: string;
          requirement_id: string;
          user_document_id: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          requirement_id: string;
          user_document_id: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          requirement_id?: string;
          user_document_id?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          application_id: string;
          title: string;
          description: string | null;
          due_date: string | null;
          status: TaskStatus;
          source_fact_id: string | null;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          application_id: string;
          title: string;
          description?: string | null;
          due_date?: string | null;
          status?: TaskStatus;
          source_fact_id?: string | null;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          application_id?: string;
          title?: string;
          description?: string | null;
          due_date?: string | null;
          status?: TaskStatus;
          source_fact_id?: string | null;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["id"];
          },
        ];
      };
      status_history: {
        Row: {
          id: string;
          user_id: string;
          application_id: string;
          from_status: string | null;
          to_status: string;
          changed_at: string;
          note: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          application_id: string;
          from_status?: string | null;
          to_status: string;
          changed_at?: string;
          note?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          application_id?: string;
          from_status?: string | null;
          to_status?: string;
          changed_at?: string;
          note?: string | null;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          user_id: string;
          application_id: string;
          title: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          application_id: string;
          title?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          application_id?: string;
          title?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          user_id: string;
          conversation_id: string;
          role: MessageRole;
          content: string;
          service_status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          conversation_id: string;
          role: MessageRole;
          content: string;
          service_status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          conversation_id?: string;
          role?: MessageRole;
          content?: string;
          service_status?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      message_citations: {
        Row: {
          id: string;
          user_id: string;
          message_id: string;
          source_id: string;
          chunk_id: string | null;
          page_number: number | null;
          section_heading: string | null;
          quote: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          message_id: string;
          source_id: string;
          chunk_id?: string | null;
          page_number?: number | null;
          section_heading?: string | null;
          quote?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          message_id?: string;
          source_id?: string;
          chunk_id?: string | null;
          page_number?: number | null;
          section_heading?: string | null;
          quote?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      ingestion_jobs: {
        Row: {
          id: string;
          user_id: string;
          source_id: string;
          job_type: string;
          status: "queued" | "running" | "succeeded" | "failed";
          attempts: number;
          started_at: string | null;
          finished_at: string | null;
          safe_error_code: string | null;
          idempotency_key: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          source_id: string;
          job_type: string;
          status?: "queued" | "running" | "succeeded" | "failed";
          attempts?: number;
          started_at?: string | null;
          finished_at?: string | null;
          safe_error_code?: string | null;
          idempotency_key?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          source_id?: string;
          job_type?: string;
          status?: "queued" | "running" | "succeeded" | "failed";
          attempts?: number;
          started_at?: string | null;
          finished_at?: string | null;
          safe_error_code?: string | null;
          idempotency_key?: string | null;
        };
        Relationships: [];
      };
      opening_reminders: TableFrom<OpeningReminder, "user_id" | "title" | "record_type" | "expected_open_date">;
      calendar_feeds: TableFrom<{ user_id: string; token: string; created_at: string }, "user_id" | "token">;
      reminder_settings: TableFrom<
        { user_id: string; email_enabled: boolean; created_at: string; updated_at: string },
        "user_id"
      >;
      reminder_log: TableFrom<
        { id: string; user_id: string; item_key: string; sent_on: string; created_at: string },
        "user_id" | "item_key"
      >;
      usage_counters: TableFrom<{ user_id: string; day: string; kind: UsageKind; count: number }, "user_id" | "kind">;
      academic_profiles: TableFrom<AcademicProfileRow, "user_id">;
      recommenders: TableFrom<RecommenderRow, "user_id" | "name">;
      recommendation_requests: Omit<
        TableFrom<RecommendationRequestRow, "user_id" | "recommender_id" | "application_id">,
        "Relationships"
      > & {
        Relationships: [
          {
            foreignKeyName: "recommendation_requests_recommender_id_fkey";
            columns: ["recommender_id"];
            isOneToOne: false;
            referencedRelation: "recommenders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recommendation_requests_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["id"];
          },
        ];
      };
      feedback: TableFrom<
        { id: string; user_id: string; page: string | null; message: string; created_at: string },
        "user_id" | "message"
      >;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      calendar_feed_events: { Args: { feed_token: string }; Returns: CalendarFeedEvent[] };
      consume_usage: { Args: { usage_kind: UsageKind; daily_limit: number }; Returns: boolean };
      owns_application: { Args: { target_id: string }; Returns: boolean };
      owns_source: { Args: { target_id: string }; Returns: boolean };
      owns_snapshot: { Args: { target_id: string }; Returns: boolean };
      owns_chunk: { Args: { target_id: string }; Returns: boolean };
      owns_fact: { Args: { target_id: string }; Returns: boolean };
      owns_conversation: { Args: { target_id: string }; Returns: boolean };
      owns_message: { Args: { target_id: string }; Returns: boolean };
      owns_requirement: { Args: { target_id: string }; Returns: boolean };
      owns_user_document: { Args: { target_id: string }; Returns: boolean };
      owns_recommender: { Args: { target_id: string }; Returns: boolean };
    };
    Enums: {
      record_type: RecordType;
      application_status: ApplicationStatus;
      verification_state: VerificationState;
      source_type: SourceType;
      ingestion_status: IngestionStatus;
      fact_type: FactType;
      review_state: ReviewState;
      confidence: Confidence;
      requirement_status: RequirementStatus;
      task_status: TaskStatus;
      message_role: MessageRole;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

/** Row type of any public table, e.g. Tables<"applications">. */
export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type ApplicationRow = Tables<"applications">;
