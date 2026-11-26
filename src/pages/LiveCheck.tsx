
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../lib/AuthContext";
import BaseLineCard from "../components/BaseLineCard";

interface Device {
  id: string;
  role: string;
}

interface Live {
  receivedAt: number;
  tdsIn: number;
  tdsOut: number;
  temp: number;
  turbidity: number;
  ph: number;
  flow: number;
  current: number;
  voltage: number;
  litres: number;
  pumpOn: boolean;
  stall: boolean;
  pumpType: string;
}

interface LiveReply {
  serverTime: number;
  live: Live | null;
}

const ROWS: [keyof Live, string, string][] = [
  ["current", "Pump current", "A"],
  ["voltage", "Supply voltage", "V"],
  ["flow", "Flow", "L/min"],
  ["litres", "Litres counted", "L"],
  ["tdsIn", "TDS inlet", "ppm"],
  ["tdsOut", "TDS outlet", "ppm"],
  ["temp", "Temperature", "°C"],
  ["turbidity", "Turbidity (approximate)", "NTU"],
  ["ph", "pH", ""],
  ["pumpOn", "Pump on", ""],
  ["stall", "Stall latched", ""],
];

export default function LiveCheck() {
  const { user, loading, enabled } = useAuth();

  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [data, setData] = useState<LiveReply | null>(null);
  const [error, setError] = useState("");

  const get = useCallback(
    async (path: string) => {
      if (!user) throw new Error("Please sign in first");

      const token = await user.getIdToken();

      const res = await fetch(path, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(body.error ?? `Error ${res.status}`);
      }

      return body;
    },
    [user]
  );

  useEffect(() => {
    if (!user) return;

    get("/api/my-devices")
      .then((d) => {
        const list: Device[] = d.devices ?? [];

        setDevices(list);

        if (list.length) {
          setDeviceId((cur) => cur || list[0].id);
        }
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Error")
      );
  }, [user, get]);

  useEffect(() => {
    if (!user || !deviceId) return;

    let stop = false;

    const tick = async () => {
      try {
        const d = await get(
          `/api/live?deviceId=${encodeURIComponent(deviceId)}`
        );

        if (!stop) {
          setData(d);
          setError("");
        }
      } catch (e) {
        if (!stop) {
          setError(e instanceof Error ? e.message : "Error");
        }
      }
    };

    void tick();

    const t = setInterval(tick, 3000);

    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [user, deviceId, get]);

  const live = data?.live ?? null;

  const ageS =
    live && data
      ? Math.round((data.serverTime - live.receivedAt) / 1000)
      : null;

  const online = ageS !== null && ageS < 20;

  return (
    <div className="mx-auto max-w-xl space-y-4 pb-24">
      <h1 className="text-2xl font-bold text-white">
        Live data check
      </h1>

      {!enabled && (
        <p className="text-sm text-gray-400">
          Sign-in is not configured on this build.
        </p>
      )}

      {enabled && loading && (
        <p className="text-sm text-gray-400">
          Checking sign-in…
        </p>
      )}

      {enabled && !loading && !user && (
        <p className="text-sm text-gray-300">
          Sign in on the My Purifier page first.
        </p>
      )}

      {user && (
        <>
          <select
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            className="rounded-lg border border-[#1e3a5f] bg-[#0a1628] px-3 py-2 text-sm text-white"
          >
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.id} ({d.role})
              </option>
            ))}
          </select>

          {!live && !error && (
            <p className="text-sm text-gray-400">
              No data received yet from this purifier.
            </p>
          )}

          {live && (
            <p
              className={`text-sm font-semibold ${
                online ? "text-emerald-300" : "text-red-300"
              }`}
            >
              {online
                ? `LIVE · last update ${ageS}s ago`
                : `Device offline · last data ${ageS}s ago`}
            </p>
          )}

          {live && (
            <div className="rounded-2xl border border-[#1e3a5f] bg-[#111d35] p-4 text-sm">
              {ROWS.map(([k, label, unit]) => {
                const v = live[k];

                return (
                  <div
                    key={k}
                    className="flex justify-between border-b border-[#1e3a5f]/50 py-1 last:border-0"
                  >
                    <span className="text-gray-400">
                      {label}
                    </span>

                    <span className="font-semibold text-white">
                      {typeof v === "number"
                        ? v.toFixed(3)
                        : String(v)}{" "}
                      {unit}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {error && (
        <p className="text-sm text-red-300">{error}</p>
      )}

      <BaseLineCard />
    </div>
  );
}
