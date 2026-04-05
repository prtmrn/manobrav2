/**
 * Types générés depuis votre schéma Supabase.
 * Pour les régénérer automatiquement :
 *   npx supabase gen types typescript --project-id <project-id> > types/database.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "client" | "artisan";

export type Metier =
  | "Serrurier"
  | "Plombier"
  | "Chauffagiste"
  | "Électricien"
  | "Vitrier"
  | "Ramoneur"
  | "Frigoriste"
  | "Dépanneur"
  | "Autre";

export type ReservationStatut =
  | "en_attente"
  | "confirme"
  | "en_cours"
  | "termine"
  | "annule";

export interface Database {
  public: {
    Tables: {
      // ── Table unifiée des rôles (migration 001) ──────────────────────────
      profiles: {
        Row: { id: string; role: UserRole; created_at: string };
        Insert: { id: string; role: UserRole; created_at?: string };
        Update: { id?: string; role?: UserRole; created_at?: string };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };

      // ── Profils artisans (migrations 002 + 004) ───────────────────────
      profiles_artisans: {
        Row: {
          id: string;
          nom: string | null;
          prenom: string | null;
          bio: string | null;
          metier: Metier | null;
          adresse: string | null;
          ville: string | null;
          code_postal: string | null;
          latitude: number | null;
          longitude: number | null;
          photo_url: string | null;
          actif: boolean;
          abonnement_pro: boolean;
          note_moyenne: number;
          nombre_avis: number;
          created_at: string;
          stripe_account_id: string | null;
          stripe_onboarding_complete: boolean;
        };
        Insert: {
          id: string;
          nom?: string | null;
          prenom?: string | null;
          bio?: string | null;
          metier?: Metier | null;
          adresse?: string | null;
          ville?: string | null;
          code_postal?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          photo_url?: string | null;
          actif?: boolean;
          abonnement_pro?: boolean;
          note_moyenne?: number;
          nombre_avis?: number;
          created_at?: string;
          stripe_account_id?: string | null;
          stripe_onboarding_complete?: boolean;
        };
        Update: {
          id?: string;
          nom?: string | null;
          prenom?: string | null;
          bio?: string | null;
          metier?: Metier | null;
          adresse?: string | null;
          ville?: string | null;
          code_postal?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          photo_url?: string | null;
          actif?: boolean;
          abonnement_pro?: boolean;
          note_moyenne?: number;
          nombre_avis?: number;
          created_at?: string;
          stripe_account_id?: string | null;
          stripe_onboarding_complete?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_artisans_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };

      // ── Profils clients (migration 002) ──────────────────────────────────
      profiles_clients: {
        Row: {
          id: string;
          nom: string | null;
          prenom: string | null;
          adresse: string | null;
          ville: string | null;
          code_postal: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          nom?: string | null;
          prenom?: string | null;
          adresse?: string | null;
          ville?: string | null;
          code_postal?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          nom?: string | null;
          prenom?: string | null;
          adresse?: string | null;
          ville?: string | null;
          code_postal?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_clients_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };

      // ── Services (migration 002) ──────────────────────────────────────────
      services: {
        Row: {
          id: string;
          artisan_id: string;
          titre: string;
          description: string | null;
          prix: number | null;
          duree_minutes: number | null;
          categorie: string | null;
          actif: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          artisan_id: string;
          titre: string;
          description?: string | null;
          prix?: number | null;
          duree_minutes?: number | null;
          categorie?: string | null;
          actif?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          artisan_id?: string;
          titre?: string;
          description?: string | null;
          prix?: number | null;
          duree_minutes?: number | null;
          categorie?: string | null;
          actif?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "services_artisan_id_fkey";
            columns: ["artisan_id"];
            isOneToOne: false;
            referencedRelation: "profiles_artisans";
            referencedColumns: ["id"];
          }
        ];
      };

      // ── Avis clients (migrations 004 + 010) ──────────────────────────────────
      avis: {
        Row: {
          id: string;
          /** Réservation liée (migration 010 — unique par reservation) */
          reservation_id: string | null;
          artisan_id: string;
          client_id: string | null;
          /** Nom d'affichage — nullable depuis migration 010 */
          nom_client: string | null;
          note: number;
          commentaire: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          reservation_id?: string | null;
          artisan_id: string;
          client_id?: string | null;
          nom_client?: string | null;
          note: number;
          commentaire?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          reservation_id?: string | null;
          artisan_id?: string;
          client_id?: string | null;
          nom_client?: string | null;
          note?: number;
          commentaire?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "avis_artisan_id_fkey";
            columns: ["artisan_id"];
            isOneToOne: false;
            referencedRelation: "profiles_artisans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "avis_reservation_id_fkey";
            columns: ["reservation_id"];
            isOneToOne: true;
            referencedRelation: "reservations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "avis_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "profiles_clients";
            referencedColumns: ["id"];
          }
        ];
      };

      // ── Favoris clients (migration 010) ───────────────────────────────────────
      favoris: {
        Row: {
          client_id: string;
          artisan_id: string;
          created_at: string;
        };
        Insert: {
          client_id: string;
          artisan_id: string;
          created_at?: string;
        };
        Update: {
          client_id?: string;
          artisan_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "favoris_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "profiles_clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "favoris_artisan_id_fkey";
            columns: ["artisan_id"];
            isOneToOne: false;
            referencedRelation: "profiles_artisans";
            referencedColumns: ["id"];
          }
        ];
      };

      // ── Disponibilités hebdomadaires (migration 005) ──────────────────────
      disponibilites: {
        Row: {
          id: string;
          artisan_id: string;
          /** 0 = lundi … 6 = dimanche */
          jour_semaine: number;
          /** Format "HH:MM:SS" */
          heure_debut: string;
          /** Format "HH:MM:SS" */
          heure_fin: string;
          actif: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          artisan_id: string;
          jour_semaine: number;
          heure_debut: string;
          heure_fin: string;
          actif?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          artisan_id?: string;
          jour_semaine?: number;
          heure_debut?: string;
          heure_fin?: string;
          actif?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "disponibilites_artisan_id_fkey";
            columns: ["artisan_id"];
            isOneToOne: false;
            referencedRelation: "profiles_artisans";
            referencedColumns: ["id"];
          }
        ];
      };

      // ── Indisponibilités ponctuelles (migration 005) ──────────────────────
      indisponibilites: {
        Row: {
          id: string;
          artisan_id: string;
          /** Format "YYYY-MM-DD" */
          date_debut: string;
          /** Format "YYYY-MM-DD" */
          date_fin: string;
          motif: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          artisan_id: string;
          date_debut: string;
          date_fin: string;
          motif?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          artisan_id?: string;
          date_debut?: string;
          date_fin?: string;
          motif?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "indisponibilites_artisan_id_fkey";
            columns: ["artisan_id"];
            isOneToOne: false;
            referencedRelation: "profiles_artisans";
            referencedColumns: ["id"];
          }
        ];
      };

      // ── Réservations (migration 006) ─────────────────────────────────────────
      reservations: {
        Row: {
          id: string;
          client_id: string;
          artisan_id: string;
          service_id: string | null;
          /** Format "YYYY-MM-DD" */
          date: string;
          /** Format "HH:MM:SS" */
          heure_debut: string;
          /** Format "HH:MM:SS" */
          heure_fin: string;
          /** "en_attente" | "confirme" | "en_cours" | "termine" | "annule" */
          statut: ReservationStatut;
          adresse_intervention: string | null;
          note_client: string | null;
          montant_total: number | null;
          commission_plateforme: number | null;
          montant_artisan: number | null;
          stripe_payment_intent_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          artisan_id: string;
          service_id?: string | null;
          date: string;
          heure_debut: string;
          heure_fin: string;
          statut?: ReservationStatut;
          adresse_intervention?: string | null;
          note_client?: string | null;
          montant_total?: number | null;
          commission_plateforme?: number | null;
          montant_artisan?: number | null;
          stripe_payment_intent_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          artisan_id?: string;
          service_id?: string | null;
          date?: string;
          heure_debut?: string;
          heure_fin?: string;
          statut?: ReservationStatut;
          adresse_intervention?: string | null;
          note_client?: string | null;
          montant_total?: number | null;
          commission_plateforme?: number | null;
          montant_artisan?: number | null;
          stripe_payment_intent_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reservations_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "profiles_clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reservations_artisan_id_fkey";
            columns: ["artisan_id"];
            isOneToOne: false;
            referencedRelation: "profiles_artisans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reservations_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {

      reservations_detail: {
        Row: {
          id: string | null;
          date: string | null;
          heure_debut: string | null;
          heure_fin: string | null;
          statut: ReservationStatut | null;
          adresse_intervention: string | null;
          note_client: string | null;
          montant_total: number | null;
          commission_plateforme: number | null;
          montant_artisan: number | null;
          stripe_payment_intent_id: string | null;
          created_at: string | null;
          updated_at: string | null;
          client_id: string | null;
          client_nom: string | null;
          client_prenom: string | null;
          client_telephone: string | null;
          client_photo_url: string | null;
          artisan_id: string | null;
          artisan_nom: string | null;
          artisan_prenom: string | null;
          artisan_metier: string | null;
          artisan_ville: string | null;
          artisan_photo_url: string | null;
          service_id: string | null;
          service_titre: string | null;
          service_prix: number | null;
          service_duree_minutes: number | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      planning_hebdomadaire: {
        Row: {
          id: string | null;
          artisan_id: string | null;
          nom: string | null;
          prenom: string | null;
          metier: string | null;
          ville: string | null;
          jour_libelle: string | null;
          jour_semaine: number | null;
          heure_debut: string | null;
          heure_fin: string | null;
          actif: boolean | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Functions: {
      est_disponible: {
        Args: { p_artisan_id: string; p_date: string };
        Returns: boolean;
      };
      creneaux_disponibles: {
        Args: { p_artisan_id: string; p_date: string };
        Returns: Array<{ id: string; heure_debut: string; heure_fin: string }>;
      };

      creneaux_reserves: {
        Args: { p_artisan_id: string; p_date: string };
        Returns: Array<{
          reservation_id: string;
          heure_debut: string;
          heure_fin: string;
          statut: ReservationStatut;
        }>;
      };
    };
    Enums: { user_role: UserRole };
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
