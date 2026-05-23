"use client";

import { useEffect, useState } from "react";

type InviteRole = "manager" | "chef" | "kitchen_staff" | "driver";

type Invite = {
  id: string;
  companyId: string;
  invitedEmail: string;
  invitedName: string | null;
  role: string;
  status: string;
  temporaryPassword: string | null;
  createdAt: string | null;
};

type InviteResponse = {
  success: boolean;
  invites?: unknown[];
  data?: unknown[];
  error?: string;
};

type CreateInviteResponse = {
  success: boolean;
  invite?: unknown;
  user?: unknown;
  temporaryPassword?: string;
  message?: string;
  error?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function readNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function normalizeInvite(value: unknown): Invite | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readString(value.id);

  if (!id) {
    return null;
  }

  return {
    id,
    companyId: readString(value.companyId ?? value.company_id),
    invitedEmail: readString(value.invitedEmail ?? value.invited_email),
    invitedName: readNullableString(value.invitedName ?? value.invited_name),
    role: readString(value.role),
    status: readString(value.status),
    temporaryPassword: readNullableString(
      value.temporaryPassword ?? value.temporary_password,
    ),
    createdAt: readNullableString(value.createdAt ?? value.created_at),
  };
}

function formatRole(role: string): string {
  const roleMap: Record<string, string> = {
    manager: "Manager",
    chef: "Chef",
    kitchen_staff: "Kitchen Staff",
    driver: "Driver",
  };

  return roleMap[role] ?? role;
}

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export default function InvitesPage() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [fullName, setFullName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [role, setRole] = useState<InviteRole>("kitchen_staff");
  const [temporaryPassword, setTemporaryPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  async function loadInvites(): Promise<void> {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/invites", {
        cache: "no-store",
      });

      const data = (await response.json()) as InviteResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Failed to load invites.");
      }

      const source = Array.isArray(data.invites)
        ? data.invites
        : Array.isArray(data.data)
          ? data.data
          : [];

      const normalizedInvites = source
        .map((item) => normalizeInvite(item))
        .filter((item): item is Invite => item !== null);

      setInvites(normalizedInvites);
    } catch (caughtError) {
      const cleanMessage =
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong loading invites.";

      setError(cleanMessage);
    } finally {
      setLoading(false);
    }
  }

  async function createInvite(): Promise<void> {
    setSaving(true);
    setError("");
    setMessage("");
    setTemporaryPassword("");

    try {
      const response = await fetch("/api/invites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName,
          email,
          role,
        }),
      });

      const data = (await response.json()) as CreateInviteResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Failed to create invite.");
      }

      setMessage(data.message ?? "Staff invite created.");
      setTemporaryPassword(readString(data.temporaryPassword));
      setFullName("");
      setEmail("");
      setRole("kitchen_staff");

      await loadInvites();
    } catch (caughtError) {
      const cleanMessage =
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong creating invite.";

      setError(cleanMessage);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    void loadInvites();
  }, []);

  return (
    <main className="min-h-screen bg-[#f8f4ec] px-4 py-6 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl border border-[#eadfce] bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#a05a2c]">
            Staff Access
          </p>

          <h1 className="mt-2 text-3xl font-bold text-[#111827]">
            Invite Team Members
          </h1>

          <p className="mt-2 text-sm text-[#6b7280]">
            Add managers, chefs, kitchen staff, and drivers to this company
            workspace.
          </p>

          {error ? (
            <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </p>
          ) : null}

          {message ? (
            <p className="mt-4 rounded-2xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
              {message}
            </p>
          ) : null}
        </section>

        <section className="rounded-3xl border border-[#eadfce] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-[#111827]">
            Create Staff Login
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="text-sm font-semibold text-[#374151]">
                Staff Name
              </span>
              <input
                suppressHydrationWarning
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Chef Maria"
                className="mt-2 w-full rounded-2xl border border-[#eadfce] px-4 py-3 text-sm outline-none"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-[#374151]">
                Staff Email
              </span>
              <input
                suppressHydrationWarning
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="chef@restaurant.com"
                className="mt-2 w-full rounded-2xl border border-[#eadfce] px-4 py-3 text-sm outline-none"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-[#374151]">
                Role
              </span>
              <select
                suppressHydrationWarning
                value={role}
                onChange={(event) => setRole(event.target.value as InviteRole)}
                className="mt-2 w-full rounded-2xl border border-[#eadfce] px-4 py-3 text-sm outline-none"
              >
                <option value="manager">Manager</option>
                <option value="chef">Chef</option>
                <option value="kitchen_staff">Kitchen Staff</option>
                <option value="driver">Driver</option>
              </select>
            </label>
          </div>

          <button
            suppressHydrationWarning
            type="button"
            disabled={saving}
            onClick={() => void createInvite()}
            className="mt-6 rounded-2xl bg-[#111827] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Creating..." : "Create Staff Login"}
          </button>

          {temporaryPassword ? (
            <div className="mt-5 rounded-2xl border border-[#eadfce] bg-[#fbf7ef] p-4">
              <p className="text-sm font-semibold text-[#6b7280]">
                Temporary password
              </p>

              <p className="mt-1 text-2xl font-bold text-[#111827]">
                {temporaryPassword}
              </p>

              <p className="mt-1 text-sm text-[#6b7280]">
                Give this password to the staff member. They can login and see
                only this company workspace.
              </p>
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl border border-[#eadfce] bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <h2 className="text-xl font-bold text-[#111827]">
                Team Invites
              </h2>
              <p className="mt-1 text-sm text-[#6b7280]">
                Staff logins created for this restaurant workspace.
              </p>
            </div>

            <button
              suppressHydrationWarning
              type="button"
              onClick={() => void loadInvites()}
              className="rounded-2xl border border-[#eadfce] bg-white px-5 py-3 text-sm font-semibold text-[#111827]"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <p className="mt-4 rounded-2xl bg-[#fbf7ef] px-4 py-3 text-sm text-[#6b7280]">
              Loading invites...
            </p>
          ) : null}

          {!loading && invites.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-[#fbf7ef] px-4 py-3 text-sm text-[#6b7280]">
              No staff invites yet.
            </p>
          ) : null}

          {invites.length > 0 ? (
            <div className="mt-5 overflow-x-auto rounded-2xl border border-[#eadfce]">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-[#fbf7ef] text-[#6b7280]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Role</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">
                      Temporary Password
                    </th>
                    <th className="px-4 py-3 font-semibold">Created</th>
                  </tr>
                </thead>

                <tbody>
                  {invites.map((invite) => (
                    <tr key={invite.id} className="border-t border-[#eadfce]">
                      <td className="px-4 py-3 font-semibold text-[#111827]">
                        {invite.invitedName ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-[#111827]">
                        {invite.invitedEmail}
                      </td>
                      <td className="px-4 py-3 text-[#111827]">
                        {formatRole(invite.role)}
                      </td>
                      <td className="px-4 py-3 text-[#111827]">
                        {invite.status}
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#111827]">
                        {invite.temporaryPassword ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-[#111827]">
                        {formatDate(invite.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}