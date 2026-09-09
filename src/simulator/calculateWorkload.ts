import type { WorkloadEstimate, WorkloadInput } from "../domain/systemDesign";

export function calculateWorkload(input: WorkloadInput): WorkloadEstimate {
  const averageRps = (input.activeUsers * input.requestsPerUserPerDay) / 86_400;
  const peakRps = averageRps * input.peakMultiplier;
  const peakReadRps = peakRps * input.readRatio;
  const monthlyTransferGb =
    (averageRps * 2_592_000 * input.payloadKb) / 1_000_000;

  return {
    averageRps,
    peakRps,
    peakReadRps,
    monthlyTransferGb,
    formula: [
      `Average RPS = ${input.activeUsers} users × ${input.requestsPerUserPerDay} requests/day ÷ 86,400 = ${averageRps}`,
      `Peak RPS = ${averageRps} × ${input.peakMultiplier} = ${peakRps}`,
      `Peak read RPS = ${peakRps} × ${input.readRatio} = ${peakReadRps}`,
      `Monthly transfer = ${averageRps} × 2,592,000 × ${input.payloadKb} KB ÷ 1,000,000 = ${monthlyTransferGb} GB`,
    ],
  };
}
