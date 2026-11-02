export const V_NOM = 24;

export const normalisedCurrent = (current: number, voltage: number) =>
  current * (V_NOM / voltage);

export const hydraulicLoadIndex = (
  current: number, voltage: number, baselineNorm: number
) => normalisedCurrent(current, voltage) / baselineNorm;
