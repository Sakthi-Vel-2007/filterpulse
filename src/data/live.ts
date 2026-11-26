import { useSyncExternalStore } from "react";
import { auth } from "../lib/firebase";
import { V_NOM } from "../model/load";
import { CAL, blend, estimatePhysics, stageFouling } from "../model/physicsEstimate";
import type { PhysicsEstimate } from "../model/physicsEstimate";
import type { PumpType, Reading, StageId } from "../types";

export type Mode = "simulated" | "live";
export type LiveStatus = "signed-out" | "no-device" | "waiting" | "live" | "offline" | "error";

export interface LiveDevice {
  id: string;
  role: string;
}

export interface LiveSnapshot {
  status: LiveStatus;
  message: string;
  devices: LiveDevice[];
  deviceId: string;
  reading: Reading | null;
  litres: number;
  pumpOn: boolean;
  stall: boolean;
  estimate: PhysicsEstimate | null;
  fouling: Record<StageId, number>;
  receivedAt: number; // server time of the latest reading (0 = none yet)
  serverTime: number; // server time at the last successful poll
  polledAt: number; // local time of the last successful poll
  baselineAt: number; // when the clean-filter baseline was recorded (0 = not recorded)
}

interface ApiLiveRow {
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
interface ApiLiveReply {
  serverTime: number;
  live: ApiLiveRow | null;
}
interface ApiDevicesReply {
  devices?: LiveDevice[];
}
interface Sample {
  normCurrent: number;
  flow25: number;
  rejection: number;
}

const POLL_MS = 4000;
export const OFFLINE_AFTER_MS = 25000;
const MODE_KEY = "fp_mode";
const DEVICE_KEY = "fp_device";
const BASELINE_KEY = "fp_baseline_";
const ZERO: Record<StageId, number> = { sediment: 0, uf: 0, ro: 0 };
const DEFAULT_CAL = { ...CAL };

function load(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage unavailable: ignore
  }
}
function remove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/* ------------------------------ mode ------------------------------ */

let mode: Mode = load(MODE_KEY) === "live" ? "live" : "simulated";
const modeListeners = new Set<() => void>();

export const getMode = (): Mode => mode;

function subscribeMode(l: () => void) {
  modeListeners.add(l);
  return () => {
    modeListeners.delete(l);
  };
}

export function useMode(): Mode {
  return useSyncExternalStore(subscribeMode, getMode, getMode);
}

export function setMode(next: Mode) {
  if (next === mode) return;
  mode = next;
  save(MODE_KEY, next);
  if (next === "live") startPolling();
  else stopPolling();
  modeListeners.forEach((l) => l());
}

/* --------------------------- live snapshot --------------------------- */

const EMPTY: LiveSnapshot = {
  status: "waiting",
  message: "Connecting…",
  devices: [],
  deviceId: "",
  reading: null,
  litres: 0,
  pumpOn: false,
  stall: false,
  estimate: null,
  fouling: ZERO,
  receivedAt: 0,
  serverTime: 0,
  polledAt: 0,
  baselineAt: 0,
};
let snapshot: LiveSnapshot = EMPTY;
const liveListeners = new Set<() => void>();

function patch(p: Partial<LiveSnapshot>) {
  snapshot = { ...snapshot, ...p };
  liveListeners.forEach((l) => l());
}
function subscribeLive(l: () => void) {
  liveListeners.add(l);
  return () => {
    liveListeners.delete(l);
  };
}
const getLive = (): LiveSnapshot => snapshot;

export function useLive(): LiveSnapshot {
  return useSyncExternalStore(subscribeLive, getLive, getLive);
}

/** How old the latest reading is, judged with the server's clock. null = no data yet. */
export function liveAgeMs(s: LiveSnapshot): number | null {
  if (!s.receivedAt || !s.serverTime) return null;
  return Math.max(0, s.serverTime - s.receivedAt + (Date.now() - s.polledAt));
}

/* ----------------------------- baseline ----------------------------- */

let recent: Sample[] = [];

/** Puts the measured clean-filter values into CAL (Live mode only). Returns when they were recorded. */
function applyCal(): number {
  Object.assign(CAL, DEFAULT_CAL);
  if (mode !== "live" || !snapshot.deviceId) return 0;
  const raw = load(BASELINE_KEY + snapshot.deviceId);
  if (!raw) return 0;
  try {
    const b = JSON.parse(raw) as {
      cleanCurrent?: number;
      cleanFlow?: number;
      rejClean?: number;
      recordedAt?: number;
    };
    if (typeof b.cleanCurrent === "number" && b.cleanCurrent > 0.05) CAL.cleanCurrent = b.cleanCurrent;
    if (typeof b.cleanFlow === "number" && b.cleanFlow > 0.05) CAL.cleanFlow = b.cleanFlow;
    if (typeof b.rejClean === "number" && b.rejClean > CAL.rejLimit + 3 && b.rejClean <= 100) {
      CAL.rejClean = b.rejClean;
    }
    return typeof b.recordedAt === "number" ? b.recordedAt : 0;
  } catch {
    return 0;
  }
}

export function recordBaseline(): { ok: boolean; text: string } {
  if (mode !== "live" || !snapshot.deviceId) {
    return { ok: false, text: "Switch to Live mode and select a purifier first." };
  }
  if (snapshot.status !== "live") return { ok: false, text: "The device is not reporting right now." };
  if (!snapshot.pumpOn) return { ok: false, text: "The pump must be running, with new cartridges fitted." };
  if (recent.length < 10) {
    return { ok: false, text: `Keep the pump running a little longer (${recent.length} of 10 readings so far).` };
  }
  const avg = (f: (x: Sample) => number) => recent.reduce((s, x) => s + f(x), 0) / recent.length;
  const cleanCurrent = avg((x) => x.normCurrent);
  const cleanFlow = avg((x) => x.flow25);
  const rejClean = avg((x) => x.rejection);
  if (!(cleanCurrent > 0.05)) {
    return { ok: false, text: "Pump current looks too low. Check the current sensor and wiring." };
  }
  const b = {
    cleanCurrent,
    cleanFlow: cleanFlow > 0.05 ? cleanFlow : DEFAULT_CAL.cleanFlow,
    rejClean: rejClean > DEFAULT_CAL.rejLimit + 3 && rejClean <= 100 ? rejClean : DEFAULT_CAL.rejClean,
    recordedAt: Date.now(),
  };
  save(BASELINE_KEY + snapshot.deviceId, JSON.stringify(b));
  patch({ baselineAt: applyCal() });
  return {
    ok: true,
    text: `Baseline saved: normalised current ${b.cleanCurrent.toFixed(3)} A, clean flow ${b.cleanFlow.toFixed(3)} L/min, clean RO rejection ${b.rejClean.toFixed(1)}%.`,
  };
}

export function clearBaseline() {
  if (snapshot.deviceId) remove(BASELINE_KEY + snapshot.deviceId);
  patch({ baselineAt: applyCal() });
}

/* ------------------------------ polling ------------------------------ */

let timer: ReturnType<typeof setInterval> | undefined;
let busy = false;
let lastUid = "";

function resetDeviceData() {
  recent = [];
  patch({
    reading: null,
    estimate: null,
    fouling: ZERO,
    litres: 0,
    pumpOn: false,
    stall: false,
    receivedAt: 0,
    serverTime: 0,
    polledAt: 0,
  });
}

async function authedGet<T>(path: string): Promise<T> {
  const user = auth?.currentUser;
  if (!user) throw new Error("signed-out");
  const token = await user.getIdToken();
  const res = await fetch(path, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(body.error ?? `Error ${res.status}`);
  return body as unknown as T;
}

function toReading(l: ApiLiveRow): Reading {
  const pumpType: PumpType = l.pumpType === "BLDC" ? "BLDC" : "DC";
  return {
    ts: l.receivedAt,
    tdsIn: l.tdsIn,
    tdsOut: l.tdsOut,
    temp: l.temp,
    turbidity: l.turbidity,
    ph: l.ph,
    flow: l.flow,
    current: l.current,
    // if the 24 V sense input is not connected it reads about 0 V: fall back to nominal
    voltage: l.voltage >= 5 ? l.voltage : V_NOM,
    pumpType,
  };
}

async function poll(): Promise<void> {
  if (busy || mode !== "live") return;
  if (typeof document !== "undefined" && document.hidden) return;
  busy = true;
  try {
    if (!auth) {
      patch({ status: "error", message: "Sign-in is not configured on this build." });
      return;
    }
    const user = auth.currentUser;
    if (!user) {
      if (lastUid) resetDeviceData();
      lastUid = "";
      patch({ status: "signed-out", message: "Sign in on My Purifier to see live data.", devices: [], deviceId: "" });
      return;
    }
    if (user.uid !== lastUid) {
      lastUid = user.uid;
      resetDeviceData();
      patch({ devices: [], deviceId: "" });
    }

    if (!snapshot.deviceId) {
      const d = await authedGet<ApiDevicesReply>("/api/my-devices");
      const list = d.devices ?? [];
      if (list.length === 0) {
        patch({ status: "no-device", message: "No purifier is linked to this account.", devices: [] });
        return;
      }
      const stored = load(DEVICE_KEY);
      const chosen = list.find((x) => x.id === stored)?.id ?? list[0].id;
      patch({ devices: list, deviceId: chosen });
      patch({ baselineAt: applyCal() });
    }

    const data = await authedGet<ApiLiveReply>(`/api/live?deviceId=${encodeURIComponent(snapshot.deviceId)}`);
    const l = data.live;
    const now = Date.now();
    if (!l) {
      patch({
        status: "waiting",
        message: "No data received yet from this purifier.",
        serverTime: data.serverTime,
        polledAt: now,
      });
      return;
    }

    const age = Math.max(0, data.serverTime - l.receivedAt);
    const status: LiveStatus = age < OFFLINE_AFTER_MS ? "live" : "offline";
    const base: Partial<LiveSnapshot> = {
      status,
      message: status === "live" ? "" : "Device offline.",
      serverTime: data.serverTime,
      polledAt: now,
      receivedAt: l.receivedAt,
      litres: l.litres,
      pumpOn: l.pumpOn,
      stall: l.stall,
    };

    if (l.receivedAt !== snapshot.receivedAt) {
      const reading = toReading(l);
      const raw = estimatePhysics({
        current: reading.current,
        voltage: reading.voltage,
        flow: reading.flow,
        temp: reading.temp,
        tdsIn: reading.tdsIn,
        tdsOut: reading.tdsOut,
      });
      let estimate = snapshot.estimate;
      if (l.pumpOn) {
        // only update the estimate while the pump is running: with the pump off the current is about 0
        estimate = estimate ? blend(estimate, raw) : raw;
        recent = [...recent, { normCurrent: raw.normCurrent, flow25: raw.flow25, rejection: raw.rejectionPct }].slice(-24);
      }
      patch({ ...base, reading, estimate, fouling: estimate ? stageFouling(estimate) : ZERO });
    } else {
      patch(base);
    }
  } catch (e) {
    const m = e instanceof Error ? e.message : "";
    if (m === "signed-out") {
      patch({ status: "signed-out", message: "Sign in on My Purifier to see live data." });
    } else {
      patch({ status: "error", message: m || "Could not reach the server." });
    }
  } finally {
    busy = false;
  }
}

function stopPolling() {
  if (timer) {
    clearInterval(timer);
    timer = undefined;
  }
  Object.assign(CAL, DEFAULT_CAL); // the simulator uses the placeholder values
}

function startPolling() {
  stopPolling();
  lastUid = "";
  resetDeviceData();
  patch({ devices: [], deviceId: "", status: "waiting", message: "Connecting…", baselineAt: 0 });
  void poll();
  timer = setInterval(() => {
    void poll();
  }, POLL_MS);
}

export function selectDevice(id: string) {
  if (id === snapshot.deviceId) return;
  save(DEVICE_KEY, id);
  resetDeviceData();
  patch({ deviceId: id, status: "waiting", message: "Loading…" });
  patch({ baselineAt: applyCal() });
  void poll();
}

if (mode === "live") startPolling();