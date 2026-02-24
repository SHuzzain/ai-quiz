export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1";
  };
  public: {
    Tables: {
      courses: {
        Row: {
          created_at: string | null;
          description: string;
          id: string;
          image_url: string;
          name: string;
          price: number;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          description: string;
          id?: string;
          image_url: string;
          name: string;
          price: number;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          description?: string;
          id?: string;
          image_url?: string;
          name?: string;
          price?: number;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      lessons: {
        Row: {
          description: string | null;
          files: Json | null;
          id: string;
          title: string;
          updated_at: string | null;
          uploaded_at: string;
          uploaded_by: string;
        };
        Insert: {
          description?: string | null;
          files?: Json | null;
          id?: string;
          title: string;
          updated_at?: string | null;
          uploaded_at?: string;
          uploaded_by: string;
        };
        Update: {
          description?: string | null;
          files?: Json | null;
          id?: string;
          title?: string;
          updated_at?: string | null;
          uploaded_at?: string;
          uploaded_by?: string;
        };
        Relationships: [];
      };
      performance_metrics: {
        Row: {
          average_ai_score: number | null;
          average_basic_score: number | null;
          average_hint_usage: number | null;
          average_learning_engagement: number | null;
          average_time_efficiency: number | null;
          calculated_at: string | null;
          consistency_score: number | null;
          created_at: string | null;
          id: string;
          improvement_rate: number | null;
          strong_topics: string[] | null;
          student_id: string | null;
          test_id: string | null;
          total_attempts: number | null;
          updated_at: string | null;
          weak_topics: string[] | null;
        };
        Insert: {
          average_ai_score?: number | null;
          average_basic_score?: number | null;
          average_hint_usage?: number | null;
          average_learning_engagement?: number | null;
          average_time_efficiency?: number | null;
          calculated_at?: string | null;
          consistency_score?: number | null;
          created_at?: string | null;
          id?: string;
          improvement_rate?: number | null;
          strong_topics?: string[] | null;
          student_id?: string | null;
          test_id?: string | null;
          total_attempts?: number | null;
          updated_at?: string | null;
          weak_topics?: string[] | null;
        };
        Update: {
          average_ai_score?: number | null;
          average_basic_score?: number | null;
          average_hint_usage?: number | null;
          average_learning_engagement?: number | null;
          average_time_efficiency?: number | null;
          calculated_at?: string | null;
          consistency_score?: number | null;
          created_at?: string | null;
          id?: string;
          improvement_rate?: number | null;
          strong_topics?: string[] | null;
          student_id?: string | null;
          test_id?: string | null;
          total_attempts?: number | null;
          updated_at?: string | null;
          weak_topics?: string[] | null;
        };
        Relationships: [
          {
            foreignKeyName: "performance_metrics_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "performance_metrics_test_id_fkey";
            columns: ["test_id"];
            isOneToOne: false;
            referencedRelation: "tests";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string;
          grade: number | null;
          id: string;
          last_active_at: string;
          name: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email: string;
          grade?: number | null;
          id?: string;
          last_active_at?: string;
          name: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string;
          grade?: number | null;
          id?: string;
          last_active_at?: string;
          name?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      question_attempts: {
        Row: {
          ai_feedback: string | null;
          ai_score: number | null;
          answered_at: string | null;
          answered_on_first_attempt: boolean | null;
          attempt_history: Json | null;
          attempt_id: string;
          attempts_count: number | null;
          created_at: string | null;
          downloaded_at: string | null;
          generated_hints: string[] | null;
          hint_sequence: number[] | null;
          hints_used: number;
          id: string;
          is_correct: boolean;
          micro_learning_content: string | null;
          micro_learning_time_spent: number | null;
          micro_learning_viewed: boolean;
          micro_learning_viewed_before: boolean | null;
          must_study_before_retry: boolean | null;
          question_id: string;
          retries_after_study: number | null;
          showed_persistence: boolean | null;
          student_answer: string | null;
          study_material_downloaded: boolean | null;
          time_before_first_attempt: number | null;
          time_spent_on_hints: number | null;
          time_taken_seconds: number | null;
          updated_at: string | null;
          used_no_hints: boolean | null;
        };
        Insert: {
          ai_feedback?: string | null;
          ai_score?: number | null;
          answered_at?: string | null;
          answered_on_first_attempt?: boolean | null;
          attempt_history?: Json | null;
          attempt_id: string;
          attempts_count?: number | null;
          created_at?: string | null;
          downloaded_at?: string | null;
          generated_hints?: string[] | null;
          hint_sequence?: number[] | null;
          hints_used?: number;
          id?: string;
          is_correct?: boolean;
          micro_learning_content?: string | null;
          micro_learning_time_spent?: number | null;
          micro_learning_viewed?: boolean;
          micro_learning_viewed_before?: boolean | null;
          must_study_before_retry?: boolean | null;
          question_id: string;
          retries_after_study?: number | null;
          showed_persistence?: boolean | null;
          student_answer?: string | null;
          study_material_downloaded?: boolean | null;
          time_before_first_attempt?: number | null;
          time_spent_on_hints?: number | null;
          time_taken_seconds?: number | null;
          updated_at?: string | null;
          used_no_hints?: boolean | null;
        };
        Update: {
          ai_feedback?: string | null;
          ai_score?: number | null;
          answered_at?: string | null;
          answered_on_first_attempt?: boolean | null;
          attempt_history?: Json | null;
          attempt_id?: string;
          attempts_count?: number | null;
          created_at?: string | null;
          downloaded_at?: string | null;
          generated_hints?: string[] | null;
          hint_sequence?: number[] | null;
          hints_used?: number;
          id?: string;
          is_correct?: boolean;
          micro_learning_content?: string | null;
          micro_learning_time_spent?: number | null;
          micro_learning_viewed?: boolean;
          micro_learning_viewed_before?: boolean | null;
          must_study_before_retry?: boolean | null;
          question_id?: string;
          retries_after_study?: number | null;
          showed_persistence?: boolean | null;
          student_answer?: string | null;
          study_material_downloaded?: boolean | null;
          time_before_first_attempt?: number | null;
          time_spent_on_hints?: number | null;
          time_taken_seconds?: number | null;
          updated_at?: string | null;
          used_no_hints?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "question_attempts_attempt_id_fkey";
            columns: ["attempt_id"];
            isOneToOne: false;
            referencedRelation: "test_attempts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "question_attempts_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
        ];
      };
      question_bank: {
        Row: {
          answer: string;
          concepts: string[];
          created_at: string;
          created_by: string | null;
          difficulty: number;
          id: string;
          lesson_id: string | null;
          marks: number;
          title: string;
          topics: string[];
          updated_at: string;
          working: string | null;
        };
        Insert: {
          answer: string;
          concepts?: string[];
          created_at?: string;
          created_by?: string | null;
          difficulty: number;
          id?: string;
          lesson_id?: string | null;
          marks?: number;
          title: string;
          topics?: string[];
          updated_at?: string;
          working?: string | null;
        };
        Update: {
          answer?: string;
          concepts?: string[];
          created_at?: string;
          created_by?: string | null;
          difficulty?: number;
          id?: string;
          lesson_id?: string | null;
          marks?: number;
          title?: string;
          topics?: string[];
          updated_at?: string;
          working?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "question_bank_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ];
      };
      questions: {
        Row: {
          correct_answer: string;
          created_at: string | null;
          hints: string[];
          id: string;
          max_attempts_before_study: number | null;
          micro_learning: string;
          order: number;
          question_text: string;
          test_id: string;
          updated_at: string | null;
        };
        Insert: {
          correct_answer: string;
          created_at?: string | null;
          hints?: string[];
          id?: string;
          max_attempts_before_study?: number | null;
          micro_learning?: string;
          order?: number;
          question_text: string;
          test_id: string;
          updated_at?: string | null;
        };
        Update: {
          correct_answer?: string;
          created_at?: string | null;
          hints?: string[];
          id?: string;
          max_attempts_before_study?: number | null;
          micro_learning?: string;
          order?: number;
          question_text?: string;
          test_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "questions_test_id_fkey";
            columns: ["test_id"];
            isOneToOne: false;
            referencedRelation: "tests";
            referencedColumns: ["id"];
          },
        ];
      };
      test_attempts: {
        Row: {
          ai_score: number | null;
          ai_score_breakdown: Json | null;
          average_time_per_question: number | null;
          basic_score: number | null;
          completed_at: string | null;
          confidence_indicator: number | null;
          correct_answers: number;
          created_at: string | null;
          first_attempt_success_rate: number | null;
          forced_study_breaks: number | null;
          hint_dependency_rate: number | null;
          hints_used: number;
          id: string;
          learning_engagement_rate: number | null;
          mastery_achieved: boolean | null;
          persistence_score: number | null;
          questions_requiring_study: number | null;
          score: number | null;
          started_at: string;
          status: string;
          student_id: string;
          test_id: string;
          time_taken_seconds: number | null;
          total_questions: number;
          updated_at: string | null;
        };
        Insert: {
          ai_score?: number | null;
          ai_score_breakdown?: Json | null;
          average_time_per_question?: number | null;
          basic_score?: number | null;
          completed_at?: string | null;
          confidence_indicator?: number | null;
          correct_answers?: number;
          created_at?: string | null;
          first_attempt_success_rate?: number | null;
          forced_study_breaks?: number | null;
          hint_dependency_rate?: number | null;
          hints_used?: number;
          id?: string;
          learning_engagement_rate?: number | null;
          mastery_achieved?: boolean | null;
          persistence_score?: number | null;
          questions_requiring_study?: number | null;
          score?: number | null;
          started_at?: string;
          status?: string;
          student_id: string;
          test_id: string;
          time_taken_seconds?: number | null;
          total_questions?: number;
          updated_at?: string | null;
        };
        Update: {
          ai_score?: number | null;
          ai_score_breakdown?: Json | null;
          average_time_per_question?: number | null;
          basic_score?: number | null;
          completed_at?: string | null;
          confidence_indicator?: number | null;
          correct_answers?: number;
          created_at?: string | null;
          first_attempt_success_rate?: number | null;
          forced_study_breaks?: number | null;
          hint_dependency_rate?: number | null;
          hints_used?: number;
          id?: string;
          learning_engagement_rate?: number | null;
          mastery_achieved?: boolean | null;
          persistence_score?: number | null;
          questions_requiring_study?: number | null;
          score?: number | null;
          started_at?: string;
          status?: string;
          student_id?: string;
          test_id?: string;
          time_taken_seconds?: number | null;
          total_questions?: number;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "test_attempts_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "test_attempts_test_id_fkey";
            columns: ["test_id"];
            isOneToOne: false;
            referencedRelation: "tests";
            referencedColumns: ["id"];
          },
        ];
      };
      tests: {
        Row: {
          created_at: string;
          created_by: string;
          description: string;
          duration: number;
          id: string;
          lesson_id: string | null;
          question_count: number;
          scheduled_date: string;
          status: string;
          title: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          description?: string;
          duration?: number;
          id?: string;
          lesson_id?: string | null;
          question_count?: number;
          scheduled_date?: string;
          status?: string;
          title: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          description?: string;
          duration?: number;
          id?: string;
          lesson_id?: string | null;
          question_count?: number;
          scheduled_date?: string;
          status?: string;
          title?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tests_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_profiles_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "student";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "student"],
    },
  },
} as const;
