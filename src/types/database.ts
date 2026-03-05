export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          theme_preference: string | null
          ai_search_depth: string | null
          ai_auto_clarify: boolean | null
          connected_accounts: Json | null
          plan: string | null
          search_credits_remaining: number | null
          search_credits_purchased: number | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          theme_preference?: string | null
          ai_search_depth?: string | null
          ai_auto_clarify?: boolean | null
          connected_accounts?: Json | null
          plan?: string | null
          search_credits_remaining?: number | null
          search_credits_purchased?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          theme_preference?: string | null
          ai_search_depth?: string | null
          ai_auto_clarify?: boolean | null
          connected_accounts?: Json | null
          plan?: string | null
          search_credits_remaining?: number | null
          search_credits_purchased?: number | null
          created_at?: string
        }
      }
      briefs: {
        Row: {
          id: string
          user_id: string
          mode: "simple" | "detailed"
          raw_prompt: string | null
          name: string | null
          category: string | null
          normalized_brief: Json | null
          weights: Json | null
          status: "draft" | "clarifying" | "running" | "complete" | "error" | "cancelled"
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          mode: "simple" | "detailed"
          raw_prompt?: string | null
          name?: string | null
          category?: string | null
          normalized_brief?: Json | null
          weights?: Json | null
          status?: "draft" | "clarifying" | "running" | "complete" | "error" | "cancelled"
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          mode?: "simple" | "detailed"
          raw_prompt?: string | null
          name?: string | null
          category?: string | null
          normalized_brief?: Json | null
          weights?: Json | null
          status?: "draft" | "clarifying" | "running" | "complete" | "error" | "cancelled"
          created_at?: string
          updated_at?: string
        }
      }
      brief_questions: {
        Row: {
          id: string
          brief_id: string
          questions: Json
          answers: Json | null
          confidence_before: number | null
          created_at: string
        }
        Insert: {
          id?: string
          brief_id: string
          questions: Json
          answers?: Json | null
          confidence_before?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          brief_id?: string
          questions?: Json
          answers?: Json | null
          confidence_before?: number | null
          created_at?: string
        }
      }
      runs: {
        Row: {
          id: string
          brief_id: string
          status: "running" | "complete" | "error" | "cancelled"
          confidence_overall: number | null
          notes: Json | null
          search_queries: Json | null
          shortlist: Json | null
          started_at: string | null
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          brief_id: string
          status?: "running" | "complete" | "error" | "cancelled"
          confidence_overall?: number | null
          notes?: Json | null
          search_queries?: Json | null
          shortlist?: Json | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          brief_id?: string
          status?: "running" | "complete" | "error" | "cancelled"
          confidence_overall?: number | null
          notes?: Json | null
          search_queries?: Json | null
          shortlist?: Json | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
      }
      results: {
        Row: {
          id: string
          run_id: string
          brief_id: string
          origin: string
          company_name: string
          website_url: string
          contact_url: string | null
          contact_email: string | null
          geography: string | null
          services: Json | null
          industries: Json | null
          pricing_signals: Json | null
          portfolio_signals: Json | null
          evidence_links: Json | null
          score_overall: number
          score_breakdown: Json | null
          reasoning_summary: string
          reasoning_detailed: Json | null
          confidence: number
          created_at: string
        }
        Insert: {
          id?: string
          run_id: string
          brief_id: string
          origin?: string
          company_name: string
          website_url: string
          contact_url?: string | null
          contact_email?: string | null
          geography?: string | null
          services?: Json | null
          industries?: Json | null
          pricing_signals?: Json | null
          portfolio_signals?: Json | null
          evidence_links?: Json | null
          score_overall: number
          score_breakdown?: Json | null
          reasoning_summary: string
          reasoning_detailed?: Json | null
          confidence: number
          created_at?: string
        }
        Update: {
          id?: string
          run_id?: string
          brief_id?: string
          origin?: string
          company_name?: string
          website_url?: string
          contact_url?: string | null
          contact_email?: string | null
          geography?: string | null
          services?: Json | null
          industries?: Json | null
          pricing_signals?: Json | null
          portfolio_signals?: Json | null
          evidence_links?: Json | null
          score_overall?: number
          score_breakdown?: Json | null
          reasoning_summary?: string
          reasoning_detailed?: Json | null
          confidence?: number
          created_at?: string
        }
      }
      chat_threads: {
        Row: {
          id: string
          user_id: string
          title: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          created_at?: string
          updated_at?: string
        }
      }
      chat_messages: {
        Row: {
          id: string
          thread_id: string
          role: "user" | "assistant"
          content: string
          attachments: Json
          brief_refs: Json
          created_at: string
        }
        Insert: {
          id?: string
          thread_id: string
          role: "user" | "assistant"
          content: string
          attachments?: Json
          brief_refs?: Json
          created_at?: string
        }
        Update: {
          id?: string
          thread_id?: string
          role?: "user" | "assistant"
          content?: string
          attachments?: Json
          brief_refs?: Json
          created_at?: string
        }
      }
      analytics_daily: {
        Row: {
          id: string
          user_id: string
          date: string
          total_briefs: number
          completed_briefs: number
          failed_briefs: number
          avg_score: number | null
          avg_confidence: number | null
          miss_reasons: Json
          missed_opportunities: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          total_briefs?: number
          completed_briefs?: number
          failed_briefs?: number
          avg_score?: number | null
          avg_confidence?: number | null
          miss_reasons?: Json
          missed_opportunities?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          total_briefs?: number
          completed_briefs?: number
          failed_briefs?: number
          avg_score?: number | null
          avg_confidence?: number | null
          miss_reasons?: Json
          missed_opportunities?: number
          created_at?: string
        }
      }
      analytics_recommendations: {
        Row: {
          id: string
          user_id: string
          date: string
          recommendations: Json
          model_used: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          recommendations: Json
          model_used?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          recommendations?: Json
          model_used?: string | null
          created_at?: string
        }
      }
      search_purchases: {
        Row: {
          id: string
          user_id: string
          credits: number
          amount_cents: number
          currency: string
          status: string
          payment_intent_id: string | null
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          credits: number
          amount_cents: number
          currency?: string
          status?: string
          payment_intent_id?: string | null
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          credits?: number
          amount_cents?: number
          currency?: string
          status?: string
          payment_intent_id?: string | null
          created_at?: string
          completed_at?: string | null
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      brief_mode: "simple" | "detailed"
      brief_status: "draft" | "clarifying" | "running" | "complete" | "error" | "cancelled"
      run_status: "running" | "complete" | "error" | "cancelled"
    }
    CompositeTypes: Record<string, never>
  }
}
