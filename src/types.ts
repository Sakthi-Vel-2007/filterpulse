export type PumpType = "DC" | "BLDC";
export type StageId = "sediment" | "uf" | "ro";

export interface Reading {
  ts: number;
  tdsIn: number; tdsOut: number;
  temp: number; turbidity: number; ph: number;
  flow: number;
  current: number;
  voltage: number;
  pumpType: PumpType;
}

export interface DataSource {
  kind: "simulated" | "live";
  subscribe(cb: (r: Reading) => void): () => void;
}
