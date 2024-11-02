"use client";

import { useEffect, useState, useCallback } from "react";
import { API_BASE_URL, authFetch } from "@/lib/api";
import { Button, Badge, Spinner, Modal, Input, Textarea, Select } from "@/components/ui";
import { Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "@/i18n/locale-context";

interface Sponsor {
  id: string;
  name: string;
  logo: string | null;
  tier: string | null;
  website: string | null;
  description: string | null;
  contact_email: string | null;
  is_active: boolean;
  started_at: string;
  ended_at: string | null;
}

const TIERS = ["Platinum", "Gold", "Silver", "Bronze"];

export default function AdminSponsorsPage() {
  const [data, setData] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [edit, setEdit] = useState<Sponsor | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    authFetch(`${API_BASE_URL}/api/v1/sponsors?limit=100`)
      .then((r) => r.json())
      .then((env: { data?: Sponsor[] }) => {
        const all = env.data ?? [];
        return Promise.all(
          all.map((s) =>
            authFetch(`${API_BASE_URL}/api/v1/sponsors/${s.id}`)
              .then((r) => r.json())
              .then((e2: { data?: Sponsor }) => e2.data ?? s)
              .catch(() => s)
          )
        );
      })
      .then((full) => setData(full))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const id = setTimeout(fetchData, 0);
    return () => clearTimeout(id);
  }, [fetchData]);

  const toggleActive = async (id: string, current: boolean) => {
    await authFetch(`${API_BASE_URL}/api/v1/sponsors/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !current }),
    });
    fetchData();
  };

  const softDelete = async (id: string) => {
    await authFetch(`${API_BASE_URL}/api/v1/sponsors/${id}`, { method: "DELETE" });
    fetchData();
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="font-display text-2xl font-bold text-ink">Sponsors</h1>
        <Button size="sm" onClick={() => setShowAdd(true)}>+ Add Sponsor</Button>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-sunken text-left text-xs font-medium uppercase tracking-wide text-ink-faint">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">Website</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Started</th>
                <th className="px-4 py-3 w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.map((s) => (
                <tr key={s.id} className="hover:bg-sunken/50">
                  <td className="px-4 py-3 font-medium text-ink">{s.name}</td>
                  <td className="px-4 py-3">
                    {s.tier ? <Badge tone={s.tier === "Platinum" ? "accent" : s.tier === "Gold" ? "gold" : s.tier === "Silver" ? "neutral" : "info"}>{s.tier}</Badge> : "-"}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {s.website ? (
                      <a href={s.website} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                        {s.website.replace(/^https?:\/\//, "").slice(0, 30)}
                      </a>
                    ) : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={s.is_active ? "success" : "neutral"}>
                      {s.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-ink-faint text-xs">
                    {new Date(s.started_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEdit(s)}
                        className="rounded p-1.5 text-ink-faint hover:bg-hover hover:text-ink cursor-pointer"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => toggleActive(s.id, s.is_active)}
                        className="rounded p-1.5 text-ink-faint hover:bg-hover hover:text-ink cursor-pointer"
                        title="Toggle active"
                      >
                        <Badge tone={s.is_active ? "neutral" : "success"}>{s.is_active ? "Deactivate" : "Activate"}</Badge>
                      </button>
                      <button
                        onClick={() => softDelete(s.id)}
                        className="rounded p-1.5 text-ink-faint hover:bg-danger/10 hover:text-danger cursor-pointer"
                        title="Soft delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Sponsor">
        <AddSponsorForm onClose={() => { setShowAdd(false); fetchData(); }} />
      </Modal>

      <Modal open={!!edit} onClose={() => setEdit(null)} title="Edit Sponsor">
        {edit && <EditSponsorForm sponsor={edit} onClose={() => { setEdit(null); fetchData(); }} />}
      </Modal>
    </div>
  );
}

function AddSponsorForm({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const form = e.currentTarget as HTMLFormElement;
    const fd = new FormData(form);
    await authFetch(`${API_BASE_URL}/api/v1/sponsors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        tier: fd.get("tier"),
        website: fd.get("website"),
        description: fd.get("description"),
        contact_email: fd.get("contactEmail"),
      }),
    });
    setSaving(false);
    onClose();
  };

  return (
    <form onSubmit={save} className="space-y-4">
      <Input name="name" label="Name" required placeholder="Company name" />
      <Input name="website" label="Website" placeholder="https://..." />
      <Select name="tier" label="Tier" defaultValue="">
        <option value="" disabled>Select tier</option>
        {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
      </Select>
      <Textarea name="description" label={t("admin.description")} />
      <Input name="contactEmail" type="email" label={t("admin.contactEmail")} />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" type="button" onClick={onClose}>{t("common.cancel")}</Button>
        <Button loading={saving} type="submit">{t("admin.addSponsor")}</Button>
      </div>
    </form>
  );
}

function EditSponsorForm({ sponsor, onClose }: { sponsor: Sponsor; onClose: () => void }) {
  const { t } = useTranslation();
  const [name, setName] = useState(sponsor.name);
  const [tier, setTier] = useState(sponsor.tier ?? "");
  const [description, setDescription] = useState(sponsor.description ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await authFetch(`${API_BASE_URL}/api/v1/sponsors/${sponsor.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, tier, description }),
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-ink-soft">Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-md border border-line bg-raised px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none" />
      </div>
      <div>
        <label className="block text-sm font-medium text-ink-soft">Tier</label>
        <select value={tier} onChange={(e) => setTier(e.target.value)} className="mt-1 w-full rounded-md border border-line bg-raised px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none">
          <option value="">None</option>
          {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-ink-soft">Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1 w-full rounded-md border border-line bg-raised px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
        <Button loading={saving} onClick={save}>{t("common.save")}</Button>
      </div>
    </div>
  );
}
