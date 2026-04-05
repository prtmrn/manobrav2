export type {
  Database,
  Tables,
  InsertTables,
  UpdateTables,
  UserRole,
  Metier,
  ReservationStatut,
} from "./database";

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string | undefined;
  created_at: string;
}

// ─── Profils ─────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  role: import("./database").UserRole;
  created_at: string;
}

export interface Profileartisan {
  id: string;
  nom: string | null;
  prenom: string | null;
  bio: string | null;
  metier: import("./database").Metier | null;
  adresse: string | null;
  ville: string | null;
  code_postal: string | null;
  latitude: number | null;
  longitude: number | null;
  photo_url: string | null;
  actif: boolean;
  note_moyenne: number;
  nombre_avis: number;
  created_at: string;
}

// ─── API Responses ───────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  data: T | null;
  error: string | null;
}

// ─── UI ──────────────────────────────────────────────────────────────────────

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";
