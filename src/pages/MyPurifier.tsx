import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

interface Msg {
  ok: boolean;
  text: string;
}
interface Device {
  id: string;
  role: "owner" | "member";
}
interface ApiReply {
  devices?: Device[];
  code?: string;
  expiresInHours?: number;
}

const card = "rounded-2xl border border-[#1e3a5f] bg-[#111d35] p-5 space-y-3";
const input =
  "w-full rounded-lg border border-[#1e3a5f] bg-[#0a1628] px-3 py-2 text-sm text-white outline-none focus:border-cyan-500";

export default function MyPurifier() {
  const { user, loading, enabled, signIn, signOut } = useAuth();
  const [params, setParams] = useSearchParams();
  const [deviceId, setDeviceId] = useState((params.get("d") ?? "").toUpperCase());
  const [code, setCode] = useState(params.get("c") ?? "");
  const [msg, setMsg] = useState<Msg | null>(null);
  const [busy, setBusy] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [shared, setShared] = useState<{ id: string; code: string; hours: number } | null>(null);

  const call = useCallback(
    async (path: string, body?: unknown) => {
      if (!user) throw new Error("Please sign in first");
      const token = await user.getIdToken();
      const res = await fetch(path, {
        method: body ? "POST" : "GET",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      return data as ApiReply;
    },
    [user]
  );

  const loadDevices = useCallback(async () => {
    try {
      const data = await call("/api/my-devices");
      setDevices(data.devices ?? []);
    } catch {
      setDevices([]);
    }
  }, [call]);

  useEffect(() => {
    if (user) void loadDevices();
  }, [user, loadDevices]);

  async function handleSignIn() {
    try {
      await signIn();
    } catch {
      setMsg({
        ok: false,
        text: "Sign-in failed. Check that this site's address is in Firebase Authorized domains.",
      });
    }
  }

  async function claim() {
    setBusy(true);
    setMsg(null);
    try {
      await call("/api/claim-device", {
        deviceId: deviceId.trim().toUpperCase(),
        code: code.trim(),
      });
      setMsg({ ok: true, text: `Purifier linked. Its alerts will be emailed to ${user?.email}.` });
      setCode("");
      setParams({}, { replace: true });
      await loadDevices();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not link the purifier" });
    } finally {
      setBusy(false);
    }
  }

  async function createShare(id: string) {
    setMsg(null);
    try {
      const data = await call("/api/share-code", { deviceId: id });
      setShared({ id, code: data.code ?? "", hours: data.expiresInHours ?? 24 });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not create a share code" });
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-5 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-white">My Purifier</h1>
        <p className="text-sm text-gray-400">
          Sign in and link your purifier so its alerts are emailed to you.
        </p>
      </div>

      {!enabled && (
        <div className={card}>
          <p className="text-sm text-gray-300">
            Sign-in is not configured on this build. The rest of the dashboard works as a guest.
          </p>
        </div>
      )}

      {enabled && loading && <p className="text-sm text-gray-400">Checking sign-in…</p>}

      {enabled && !loading && !user && (
        <div className={card}>
          <p className="text-sm text-gray-300">
            Sign in with Google. We store only your email address and account ID, never a password.
          </p>
          <button
            onClick={handleSignIn}
            className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-300 hover:bg-cyan-500/20"
          >
            Sign in with Google
          </button>
        </div>
      )}

      {enabled && !loading && user && (
        <>
          <div className={card}>
            <p className="text-sm text-gray-300">
              Signed in as <span className="font-semibold text-white">{user.email}</span>
            </p>
            <button onClick={() => void signOut()} className="text-xs text-gray-400 underline">
              Sign out
            </button>
          </div>

          <div className={card}>
            <h2 className="text-sm font-semibold text-white">Link a purifier</h2>
            <p className="text-xs text-gray-400">
              Enter the device ID and a code: the claim code printed on the purifier, or a share
              code from its owner.
            </p>
            <input
              className={input}
              placeholder="Device ID, for example FP-A1B2C3"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value.toUpperCase())}
            />
            <input
              className={input}
              placeholder="Claim code or share code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button
              onClick={claim}
              disabled={busy || !deviceId || !code}
              className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-50"
            >
              {busy ? "Linking…" : "Link purifier"}
            </button>
          </div>

          <div className={card}>
            <h2 className="text-sm font-semibold text-white">Your purifiers</h2>
            {devices.length === 0 ? (
              <p className="text-xs text-gray-400">None linked yet.</p>
            ) : (
              <ul className="space-y-3 text-sm text-gray-200">
                {devices.map((d) => (
                  <li key={d.id} className="space-y-1">
                    <div className="flex items-center justify-between gap-3">
                      <span>
                        {d.id}{" "}
                        <span className="text-xs text-gray-400">
                          ({d.role === "owner" ? "owner" : "shared with you"})
                        </span>
                      </span>
                      {d.role === "owner" && (
                        <button
                          onClick={() => void createShare(d.id)}
                          className="text-xs text-cyan-300 underline"
                        >
                          Create share code
                        </button>
                      )}
                    </div>
                    {shared && shared.id === d.id && (
                      <p className="text-xs text-emerald-300">
                        Share code: <span className="font-mono">{shared.code}</span>. It works once
                        and expires in {shared.hours} hours. Give it, with the device ID {d.id}, to
                        the person you want to add.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {msg && (
        <p className={`text-sm ${msg.ok ? "text-emerald-300" : "text-red-300"}`}>{msg.text}</p>
      )}
    </div>
  );
}