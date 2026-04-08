import type { Metadata } from "next";

export const metadata: Metadata = { title: "Emails | Admin Manobra" };
export const dynamic = "force-dynamic";

interface BrevoEmail {
  messageId: string;
  email: string;
  subject: string;
  date: string;
  status: string;
  tags: string[];
}

async function fetchBrevoEmails(): Promise<BrevoEmail[]> {
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/emails?limit=50&sort=desc", {
      headers: {
        "api-key": process.env.BREVO_API_KEY ?? "",
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.transactionalEmails ?? [];
  } catch {
    return [];
  }
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  delivered:  { label: "Délivré",   color: "text-green-400 bg-green-900/30 border-green-800" },
  opened:     { label: "Ouvert",    color: "text-brand-400 bg-brand-900/30 border-brand-800" },
  clicked:    { label: "Cliqué",    color: "text-blue-400 bg-blue-900/30 border-blue-800" },
  bounced:    { label: "Rejeté",    color: "text-red-400 bg-red-900/30 border-red-800" },
  blocked:    { label: "Bloqué",    color: "text-red-400 bg-red-900/30 border-red-800" },
  spam:       { label: "Spam",      color: "text-orange-400 bg-orange-900/30 border-orange-800" },
  unsubscribed: { label: "Désabo.", color: "text-gray-400 bg-gray-800 border-gray-700" },
  sent:       { label: "Envoyé",    color: "text-gray-300 bg-gray-800 border-gray-700" },
  request:    { label: "En cours",  color: "text-yellow-400 bg-yellow-900/30 border-yellow-800" },
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default async function AdminEmailsPage() {
  const emails = await fetchBrevoEmails();

  const stats = {
    total: emails.length,
    delivered: emails.filter(e => e.status === "delivered" || e.status === "opened" || e.status === "clicked").length,
    opened: emails.filter(e => e.status === "opened" || e.status === "clicked").length,
    bounced: emails.filter(e => e.status === "bounced" || e.status === "blocked").length,
  };

  const tauxDelivraison = stats.total > 0 ? ((stats.delivered / stats.total) * 100).toFixed(1) : "N/A";
  const tauxOuverture = stats.delivered > 0 ? ((stats.opened / stats.delivered) * 100).toFixed(1) : "N/A";

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Emails</h1>
        <p className="text-sm text-gray-400 mt-1">Historique des 50 derniers emails transactionnels via Brevo</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Emails envoyés", value: stats.total, color: "text-white" },
          { label: "Délivrés", value: stats.delivered, color: "text-green-400" },
          { label: "Taux délivraison", value: `${tauxDelivraison}%`, color: "text-brand-400" },
          { label: "Taux ouverture", value: `${tauxOuverture}%`, color: "text-blue-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-sm text-white mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        {emails.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            Aucun email trouvé — vérifiez la clé API Brevo.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Destinataire</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Sujet</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {emails.map((e) => {
                const statut = STATUS_CONFIG[e.status] ?? { label: e.status, color: "text-gray-400 bg-gray-800 border-gray-700" };
                return (
                  <tr key={e.messageId} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 text-gray-300 text-sm">{e.email}</td>
                    <td className="px-4 py-3 text-white text-sm max-w-[300px] truncate">{e.subject}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{fmtDate(e.date)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${statut.color}`}>
                        {statut.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
