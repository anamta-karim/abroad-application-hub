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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
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
