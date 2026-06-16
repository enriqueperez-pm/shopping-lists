import type { FinancialPersistedData } from "../FinancialDatabase";

export type BrainCsvInputs = {
  presupuesto: string;
  transacciones: string;
  ingresos?: string;
  deudas?: string;
};

export type BrainPayloadResult = {
  payload: FinancialPersistedData;
  stats: {
    concepts: number;
    transactions: number;
    debts: number;
    periods: string[];
  };
};

export type BrainCsvExport = {
  presupuesto: string;
  ingresos: string;
  transacciones: string;
  stats: {
    presupuesto: number;
    ingresos: number;
    transacciones: number;
  };
};

export type BrainSnapshotRow = {
  id: string;
  payload: FinancialPersistedData;
  source: "csv" | "app_import" | "cli";
  updated_at: string;
};
