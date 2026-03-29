// /data/deadlines-all.ts
// دمج آجال ق.إ.ج و ق.إ.م.إ

import { QIJ_DEADLINES, Deadline } from "./deadlines-qij"
import { QIMA_DEADLINES } from "./deadlines-qima"

export const ALL_DEADLINES: Deadline[] = [
  ...QIJ_DEADLINES,
  ...QIMA_DEADLINES,
]

export { QIJ_DEADLINES, QIMA_DEADLINES }
