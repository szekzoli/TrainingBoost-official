import type { PlanRow, Scope } from '../api';

export type Notice = { kind: 'ok' | 'warn' | 'error'; text: string };

// A szerkesztő vezérlői, amit a PlanEditor ad át a nap-szerkesztőnek.
export type EditorCtl = {
  planId: string;
  /** Mentés állapotjelzéssel; hiba esetén undefined (vagy dob, ha rethrow). */
  save: <T>(fn: () => Promise<T>, opts?: { rethrow?: boolean }) => Promise<T | undefined>;
  reload: () => Promise<void>;
  notify: (n: Notice | null) => void;
  patchRow: (dayId: string, rowId: string, fields: Partial<PlanRow>) => void;
  patchDay: (dayId: string, fields: { title: string | null }) => void;
  applyOrder: (dayId: string, ids: string[]) => void;
  scope: Scope;
};
