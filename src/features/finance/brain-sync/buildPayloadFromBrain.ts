import type { FinancialPersistedData } from "../FinancialDatabase";
import { parseCsv } from "./parseCsv";
import type { BrainCsvInputs, BrainPayloadResult } from "./types";

type BudgetConcept = {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  budgetedAmount: number;
  actualAmount: number;
  currency: string;
  period: string;
  type: "income" | "expense";
  isFixed: boolean;
  description?: string;
  parentId?: string;
  isParent?: boolean;
  createdAt: string;
  updatedAt: string;
};

function num(v: string | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function conceptId(period: string, brainId: string): string {
  return `brain_${period}_${brainId}`;
}

function parentConceptId(period: string, category: string): string {
  return `brain_${period}_parent_${category.replace(/\s+/g, "_").toLowerCase()}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function brainIdFromTransaction(row: Record<string, string>): string | null {
  const c = (row.concepto || "").toLowerCase();
  if (c.includes("tradea")) return "medicamento-tradea";
  if (c.includes("auto")) return "auto";
  if (c.includes("prochem")) return "prochem-workspace";
  if (c.includes("cursor")) return "cursor";
  if (c.includes("xbox")) return "xbox-gamepass";
  if (c.includes("renta")) return "renta";
  if (c.includes("telmex")) return "telmex";
  if (c.includes("uber eats")) return "uber-eats";
  if (c.includes("luz") || c.includes("cfe")) return "luz";
  if (c.includes("gas dom")) return "gas";
  if (c.includes("hsbc") || c.includes("debt payment")) return "hsbc-transicion";
  if (c.includes("impuesto")) return "impuestos";
  if (c.includes("at&t fer") || c.includes("mi niña") || c.includes("5618922308")) return "telefono-fer";
  if (c.includes("at&t luis") || c.includes("5546108055")) return "telefono-luis";
  if (c.includes("at&t") || c.includes("teléfono") || c.includes("telefono")) return "telefono-fer";
  if (c.includes("chedraui") || c.includes("despensa") || c.includes("supermercado")) return "despensa";
  if (c.includes("mog") || (c.includes("salida") && !c.includes("salidas"))) return "salidas";
  if (c.includes("nomina") || c.includes("nómina")) return "nomina";
  return null;
}

function slug(value: string): string {
  return value.replace(/\s+/g, "_").toLowerCase().replace(/[^a-z0-9_]/g, "");
}

type ConceptNode = BudgetConcept;

function buildCategoriesTreeFromConcepts(concepts: BudgetConcept[], ts: string) {
  const nodes: Record<string, unknown>[] = [];
  const parentIds = new Map<string, string>();
  const childKeys = new Set<string>();

  for (const concept of concepts) {
    if (concept.isParent) continue;
    const parentKey = `${concept.type}::${concept.category}`;
    if (!parentIds.has(parentKey)) {
      const id = `cat_brain_${concept.type}_${slug(concept.category)}`;
      parentIds.set(parentKey, id);
      nodes.push({
        id,
        name: concept.category,
        type: concept.type,
        icon: "tag",
        color: "bg-slate-100 text-slate-700",
        description: `Categoría ${concept.type === "income" ? "de ingreso" : "de gasto"}`,
        isActive: true,
        createdAt: ts,
      });
    }

    if (!concept.subcategory) continue;
    const childKey = `${parentKey}::${concept.subcategory}`;
    if (childKeys.has(childKey)) continue;
    childKeys.add(childKey);

    nodes.push({
      id: `cat_brain_${concept.type}_${slug(concept.category)}_${slug(concept.subcategory)}`,
      name: concept.subcategory,
      type: concept.type,
      parentId: parentIds.get(parentKey),
      icon: "tag",
      color: "bg-slate-100 text-slate-700",
      description: `Subcategoría de ${concept.category}`,
      isActive: true,
      createdAt: ts,
    });
  }

  return nodes;
}

export function buildPayloadFromBrainCsv(inputs: BrainCsvInputs): BrainPayloadResult {
  const presupuesto = parseCsv(inputs.presupuesto);
  const ingresos = inputs.ingresos ? parseCsv(inputs.ingresos) : [];
  const transacciones = parseCsv(inputs.transacciones);
  const deudas = inputs.deudas ? parseCsv(inputs.deudas) : [];

  const ts = nowIso();
  const concepts: BudgetConcept[] = [];
  const parentKeys = new Set<string>();

  const transactions = transacciones.map((row, idx) => {
    const period = row.periodo;
    const brainId = brainIdFromTransaction(row);
    const txId = `brain_tx_${row.fecha}_${idx}`;
    return {
      id: txId,
      type: (row.tipo === "income" ? "income" : "expense") as "income" | "expense",
      description: row.concepto,
      amount: num(row.monto_mxn),
      category: row.categoria,
      subcategory: row.subcategoria || undefined,
      date: row.fecha,
      timestamp: `${row.fecha}T12:00:00.000Z`,
      notes: row.notas || undefined,
      source: (row.fuente === "manual" ? "manual" : "import") as "manual" | "import",
      currency: "MXN",
      budgetConceptId: brainId ? conceptId(period, brainId) : undefined,
    };
  });

  const actualByConceptId = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.budgetConceptId) {
      actualByConceptId.set(
        tx.budgetConceptId,
        (actualByConceptId.get(tx.budgetConceptId) ?? 0) + tx.amount,
      );
    }
  }

  for (const row of ingresos) {
    const period = row.periodo;
    const category = row.categoria;
    const parentKey = `${period}::income::${category}`;
    if (!parentKeys.has(parentKey)) {
      parentKeys.add(parentKey);
      concepts.push({
        id: parentConceptId(period, category),
        name: category,
        category,
        budgetedAmount: 0,
        actualAmount: 0,
        currency: "MXN",
        period,
        type: "income",
        isFixed: false,
        description: `Parent ${category}`,
        isParent: true,
        createdAt: ts,
        updatedAt: ts,
      });
    }

    const brainId = row.id;
    const planeado = num(row.planeado_mxn);
    const ejecutado = num(row.ejecutado_mxn);
    const cid = conceptId(period, brainId);
    const fromTx = actualByConceptId.get(cid) ?? 0;

    concepts.push({
      id: cid,
      name: row.concepto_es,
      category: row.categoria,
      subcategory: row.subcategoria || undefined,
      budgetedAmount: planeado,
      actualAmount: Math.max(ejecutado, fromTx),
      currency: "MXN",
      period,
      type: "income",
      isFixed: row.fijo === "true",
      description: row.estado ? `estado=${row.estado}` : `brain:${brainId}`,
      parentId: parentConceptId(period, category),
      isParent: false,
      createdAt: ts,
      updatedAt: ts,
    });

    if (ejecutado > 0 && row.fecha_pago) {
      transactions.push({
        id: `brain_tx_income_${row.fecha_pago}_${brainId}`,
        type: "income",
        description: row.concepto_es,
        amount: ejecutado,
        category: row.categoria,
        subcategory: row.subcategoria || undefined,
        date: row.fecha_pago,
        timestamp: `${row.fecha_pago}T12:00:00.000Z`,
        notes: row.estado ? `estado=${row.estado}` : undefined,
        source: "import",
        currency: "MXN",
        budgetConceptId: cid,
      });
    }
  }

  for (const row of presupuesto) {
    const period = row.periodo;
    const category = row.categoria;
    const parentKey = `${period}::${category}`;
    if (!parentKeys.has(parentKey)) {
      parentKeys.add(parentKey);
      concepts.push({
        id: parentConceptId(period, category),
        name: category,
        category,
        budgetedAmount: 0,
        actualAmount: 0,
        currency: "MXN",
        period,
        type: "expense",
        isFixed: false,
        description: `Parent ${category}`,
        isParent: true,
        createdAt: ts,
        updatedAt: ts,
      });
    }

    const brainId = row.id;
    const planeado = num(row.planeado_mxn);
    const ejecutado = num(row.ejecutado_mxn);
    const cid = conceptId(period, brainId);
    const fromTx = actualByConceptId.get(cid) ?? 0;
    const meta = [
      row.estado ? `estado=${row.estado}` : "",
      row.fecha_limite ? `limite=${row.fecha_limite}` : "",
      row.fecha_corte ? `corte=${row.fecha_corte}` : "",
      row.fecha_pago ? `pago=${row.fecha_pago}` : "",
    ]
      .filter(Boolean)
      .join("; ");

    concepts.push({
      id: cid,
      name: row.concepto_es,
      category: row.categoria,
      subcategory: row.subcategoria || undefined,
      budgetedAmount: planeado,
      actualAmount: Math.max(ejecutado, fromTx),
      currency: "MXN",
      period,
      type: "expense",
      isFixed: row.fijo === "true",
      description: meta || `brain:${brainId}`,
      parentId: parentConceptId(period, category),
      isParent: false,
      createdAt: ts,
      updatedAt: ts,
    });
  }

  const debts = deudas.map((row) => ({
    id: `brain_debt_${row.id}`,
    name: row.nombre,
    lender: row.acreedor,
    principalAmount: num(row.capital_inicial),
    interestRateAnnual: num(row.tasa_anual),
    startDate: "2026-06-01",
    dueDate: "2031-06-01",
    minimumPayment: num(row.pago_mensual),
    currency: row.moneda || "MXN",
    status: (row.estado === "active" ? "active" : "closed") as "active" | "closed",
    notes: row.notas || undefined,
    createdAt: ts,
    updatedAt: ts,
  }));

  const payload: FinancialPersistedData = {
    transactions,
    banks: [
      {
        id: "bank_1",
        name: "Banco Principal",
        code: "001",
        color: "#2563eb",
        custom: false,
      },
    ],
    accounts: [
      {
        id: "acc_1",
        bankId: "bank_1",
        name: "Cuenta Principal",
        type: "checking",
        number: "****1234",
        currency: "MXN",
        color: "#059669",
        custom: false,
      },
    ],
    categories: {
      income: [
        {
          id: "inc_1",
          name: "Ingresos Operacionales",
          type: "income",
          color: "#059669",
          custom: false,
        },
      ],
      expense: [
        {
          id: "exp_1",
          name: "Gastos Operacionales",
          type: "expense",
          color: "#dc2626",
          custom: false,
        },
      ],
    },
    budgets: {},
    debts,
    creditCards: [],
    amortizationSchedules: [],
    moduleData: {
      budgetConcepts: concepts,
      categoriesTree: buildCategoriesTreeFromConcepts(concepts, ts),
      beneficiaryAccounts: [],
      counterparties: [],
      legacyBanks: [],
      legacyAccounts: [],
      transferHistory: [],
    },
    settings: {
      version: "3.0",
      created: ts,
      lastUpdate: ts,
      trackerConfig: {
        defaultCurrency: "MXN",
        usdToMxnRate: 17.9,
        monthStartDay: 1,
        weekStartDay: "Monday",
        appName: "klagi",
      },
    },
  };

  return {
    payload,
    stats: {
      concepts: concepts.filter((c) => !c.isParent).length,
      transactions: transactions.length,
      debts: debts.length,
      periods: [...new Set(presupuesto.map((r) => r.periodo))],
    },
  };
}

/** Detecta archivos CSV por nombre y construye inputs. */
export function brainCsvInputsFromFiles(
  files: { name: string; text: string }[],
): Partial<BrainCsvInputs> {
  const inputs: Partial<BrainCsvInputs> = {};
  for (const file of files) {
    const name = file.name.toLowerCase();
    if (name.includes("presupuesto")) inputs.presupuesto = file.text;
    else if (name.includes("ingreso")) inputs.ingresos = file.text;
    else if (name.includes("transaccion")) inputs.transacciones = file.text;
    else if (name.includes("deuda")) inputs.deudas = file.text;
  }
  return inputs;
}

export function validateBrainCsvInputs(
  inputs: Partial<BrainCsvInputs>,
): inputs is BrainCsvInputs {
  return Boolean(inputs.presupuesto && inputs.transacciones);
}
