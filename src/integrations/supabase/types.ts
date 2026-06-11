export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      answers: {
        Row: {
          attempt_id: string
          benar: boolean | null
          id: string
          jawaban_siswa: string | null
          question_id: string
          updated_at: string
        }
        Insert: {
          attempt_id: string
          benar?: boolean | null
          id?: string
          jawaban_siswa?: string | null
          question_id: string
          updated_at?: string
        }
        Update: {
          attempt_id?: string
          benar?: boolean | null
          id?: string
          jawaban_siswa?: string | null
          question_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "exam_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_attempts: {
        Row: {
          exam_id: string
          id: string
          siswa_id: string
          skor: number | null
          status: Database["public"]["Enums"]["attempt_status"]
          waktu_mulai: string
          waktu_selesai: string | null
        }
        Insert: {
          exam_id: string
          id?: string
          siswa_id: string
          skor?: number | null
          status?: Database["public"]["Enums"]["attempt_status"]
          waktu_mulai?: string
          waktu_selesai?: string | null
        }
        Update: {
          exam_id?: string
          id?: string
          siswa_id?: string
          skor?: number | null
          status?: Database["public"]["Enums"]["attempt_status"]
          waktu_mulai?: string
          waktu_selesai?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_attempts_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_questions: {
        Row: {
          exam_id: string
          id: string
          question_id: string
          urutan: number
        }
        Insert: {
          exam_id: string
          id?: string
          question_id: string
          urutan?: number
        }
        Update: {
          exam_id?: string
          id?: string
          question_id?: string
          urutan?: number
        }
        Relationships: [
          {
            foreignKeyName: "exam_questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          acak_opsi: boolean
          acak_soal: boolean
          created_at: string
          durasi_menit: number
          id: string
          judul: string
          pembuat_id: string | null
          status: Database["public"]["Enums"]["exam_status"]
          subject_id: string
          token: string
          waktu_mulai: string
          waktu_selesai: string
        }
        Insert: {
          acak_opsi?: boolean
          acak_soal?: boolean
          created_at?: string
          durasi_menit?: number
          id?: string
          judul: string
          pembuat_id?: string | null
          status?: Database["public"]["Enums"]["exam_status"]
          subject_id: string
          token: string
          waktu_mulai?: string
          waktu_selesai?: string
        }
        Update: {
          acak_opsi?: boolean
          acak_soal?: boolean
          created_at?: string
          durasi_menit?: number
          id?: string
          judul?: string
          pembuat_id?: string | null
          status?: Database["public"]["Enums"]["exam_status"]
          subject_id?: string
          token?: string
          waktu_mulai?: string
          waktu_selesai?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          kelas: string | null
          nama: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          id: string
          kelas?: string | null
          nama?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          id?: string
          kelas?: string | null
          nama?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      questions: {
        Row: {
          bobot: number
          created_at: string
          gambar_url: string | null
          id: string
          kunci_jawaban: string
          opsi_jawaban: Json
          pembuat_id: string | null
          pertanyaan: string
          subject_id: string
          tingkat_kesulitan: string
          tipe: Database["public"]["Enums"]["question_type"]
        }
        Insert: {
          bobot?: number
          created_at?: string
          gambar_url?: string | null
          id?: string
          kunci_jawaban: string
          opsi_jawaban?: Json
          pembuat_id?: string | null
          pertanyaan: string
          subject_id: string
          tingkat_kesulitan?: string
          tipe?: Database["public"]["Enums"]["question_type"]
        }
        Update: {
          bobot?: number
          created_at?: string
          gambar_url?: string | null
          id?: string
          kunci_jawaban?: string
          opsi_jawaban?: Json
          pembuat_id?: string | null
          pertanyaan?: string
          subject_id?: string
          tingkat_kesulitan?: string
          tipe?: Database["public"]["Enums"]["question_type"]
        }
        Relationships: [
          {
            foreignKeyName: "questions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          created_at: string
          id: string
          nama_mapel: string
        }
        Insert: {
          created_at?: string
          id?: string
          nama_mapel: string
        }
        Update: {
          created_at?: string
          id?: string
          nama_mapel?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "guru" | "siswa"
      attempt_status: "berlangsung" | "selesai"
      exam_status: "draft" | "aktif" | "selesai"
      question_type: "pg" | "esai"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "guru", "siswa"],
      attempt_status: ["berlangsung", "selesai"],
      exam_status: ["draft", "aktif", "selesai"],
      question_type: ["pg", "esai"],
    },
  },
} as const
