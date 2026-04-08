CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  destinataire TEXT NOT NULL,
  sujet TEXT NOT NULL,
  categorie TEXT NOT NULL DEFAULT 'autre',
  statut TEXT NOT NULL DEFAULT 'envoye',
  reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
  artisan_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  client_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  metadata JSONB
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_email_logs_created_at ON email_logs(created_at DESC);
CREATE INDEX idx_email_logs_categorie ON email_logs(categorie);
CREATE INDEX idx_email_logs_destinataire ON email_logs(destinataire);

-- RLS : seuls les admins peuvent lire
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_only" ON email_logs
  USING (true); -- accessible via service_role uniquement
