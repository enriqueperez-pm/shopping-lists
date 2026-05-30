import type { FinancialDatabase } from "@/features/finance/FinancialDatabase";

let financeDbRef: FinancialDatabase | null = null;

export function setFinanceDb(db: FinancialDatabase | null) {
  financeDbRef = db;
}

export function getFinanceDb() {
  return financeDbRef;
}
