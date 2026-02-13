import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { listShareLinks } from "@/lib/repositories/store";
import { ShareLinkManager } from "@/components/share/ShareLinkManager";
import { headers } from "next/headers";

export default function SharePage(): React.JSX.Element {
  const links = listShareLinks().map((link) => ({
    id: link.id,
    token: link.token,
    expiresAt: link.expiresAt,
    scope: link.scope
  }));
  const requestHeaders = headers();
  const host = requestHeaders.get("host");
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? (host ? `${protocol}://${host}` : "http://localhost:3000");

  return (
    <AppShell
      title="Clinician Sharing"
      subtitle="Patient-controlled sharing with expiring links and password protection."
    >
      <Card title="Share controls" detail="Create links and open clinician view directly from this page.">
        <ShareLinkManager initialLinks={links} baseUrl={baseUrl} />
      </Card>
    </AppShell>
  );
}
