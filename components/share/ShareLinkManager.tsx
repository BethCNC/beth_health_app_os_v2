"use client";

import { FormEvent, useMemo, useState } from "react";

interface ShareLinkResponse {
  id: string;
  token: string;
  expiresAt: string;
  scope: {
    includeDocuments: boolean;
    includeTimeline: boolean;
    includeSnapshot: boolean;
  };
}

export function ShareLinkManager({
  initialLinks,
  baseUrl
}: {
  initialLinks: ShareLinkResponse[];
  baseUrl: string;
}): React.JSX.Element {
  const [links, setLinks] = useState<ShareLinkResponse[]>(initialLinks);
  const [password, setPassword] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCreated, setLastCreated] = useState<{ token: string; password: string } | null>(null);

  const cleanedBaseUrl = useMemo(() => baseUrl.replace(/\/$/, ""), [baseUrl]);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    try {
      setBusy(true);
      setError(null);
      const response = await fetch("/api/share-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          expiresInDays,
          initiatedBy: "beth",
          scope: {
            includeDocuments: true,
            includeTimeline: true,
            includeSnapshot: true
          }
        })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Failed to create share link");
      }

      const created = (await response.json()) as ShareLinkResponse;
      setLinks((prev) => [created, ...prev]);
      setLastCreated({ token: created.token, password });
      setPassword("");
      setExpiresInDays(7);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unknown error";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <article className="rounded-xl border border-[#CCD3DD] bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Create provider link</h2>
        <p className="mt-1 text-sm text-[#556273]">Generate an expiring link protected by password.</p>

        <form className="mt-4 space-y-3" onSubmit={onSubmit}>
          <label className="block text-sm font-medium">
            Password
            <input
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-lg border border-[#C8D0DD] bg-white px-3 py-2"
              type="password"
            />
          </label>

          <label className="block text-sm font-medium">
            Expires in days
            <input
              min={1}
              max={30}
              value={expiresInDays}
              onChange={(event) => setExpiresInDays(Number(event.target.value))}
              className="mt-1 w-full rounded-lg border border-[#C8D0DD] bg-white px-3 py-2"
              type="number"
            />
          </label>

          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-[#0E2A4D] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Creating..." : "Create link"}
          </button>
        </form>

        {error ? <p className="mt-3 rounded-lg border border-[#F2B4B4] bg-[#FEF2F2] px-3 py-2 text-sm text-[#9F1D1D]">{error}</p> : null}

        {lastCreated ? (
          <div className="mt-4 rounded-lg border border-[#B8D7C8] bg-[#F0FBF5] p-3 text-sm">
            <p className="font-semibold">Latest link ready</p>
            <a
              href={`${cleanedBaseUrl}/c/${lastCreated.token}?password=${encodeURIComponent(lastCreated.password)}`}
              className="mt-1 inline-block text-[#1D4ED8] underline"
            >
              Open clinician view
            </a>
          </div>
        ) : null}
      </article>

      <article className="rounded-xl border border-[#CCD3DD] bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Active links</h2>
        <p className="mt-1 text-sm text-[#556273]">Links below are clickable for local testing.</p>

        <ul className="mt-4 space-y-2 text-sm">
          {links.length === 0 ? <li className="text-[#556273]">No links created yet.</li> : null}
          {links.map((link) => (
            <li key={link.id} className="rounded-lg border border-[#D1D7E0] bg-white p-3">
              <p className="font-semibold">{link.id}</p>
              <a href={`${cleanedBaseUrl}/c/${link.token}`} className="text-[#1D4ED8] underline">
                {cleanedBaseUrl}/c/{link.token}
              </a>
              <p className="text-xs text-[#556273]">Expires: {new Date(link.expiresAt).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}
