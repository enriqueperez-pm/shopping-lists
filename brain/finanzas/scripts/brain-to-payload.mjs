/**
 * Maps brain CSV files → FinancialPersistedData (klagi / Supabase payload shape).
 */
import fs from "fs";
import path from "path";

export const HOUSEHOLD_PAYLOAD_USER_ID = "71aa401e-ad23-4413-b72e-5e17c62bb507";

const DATA_DIR = path.resolve(import.meta.dirname, "../data");

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",");
  return lines.slice(1).filter(Boolean).map((line) => {
    const values = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (ch === "," && !inQuotes) {
        values.push(cur);
        cur = "";
        continue;
      }
      cur += ch;
    }
    values.push(cur);
    const row = {};
    headers.forEach((h, i) => {
      row[h.trim()] = (values[i] ?? "").trim();
    });
    return row;
  });
}

function readCsv(name) {
  return parseCsv(fs.readFileSync(path.join(DATA_DIR, name), "utf8"));
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function conceptId(period, brainId) {
  return `brain_${period}_${brainId}`;
}

function parentConceptId(period, category) {
  return `brain_${period}_parent_${category.replace(/\s+/g, "_").toLowerCase()}`;
}

function nowIso() {
  return new Date().toISOString();
}

function brainIdFromTransaction(row) {
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
  if (c.includes("at&t") || c.includes("teléfono") || c.includes("telefono")) return "telefono";
  if (c.includes("chedraui") || c.includes("despensa") || c.includes("supermercado")) return "despensa";
  if (c.includes("mog") || (c.includes("salida") && !c.includes("salidas"))) return "salidas";
  return null;
}

function slug(value) {
  return value.replace(/\s+/g, "_").toLowerCase().replace(/[^a-z0-9_]/g, "");
}

function buildCategoriesTreeFromConcepts(concepts, ts) {
  const nodes = [];
  const parentIds = new Map();
  const childKeys = new Set();

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

export function buildPayloadFromBrain(options = {}) {
  const presupuesto = readCsv("presupuesto-mensual.csv");
  const ingresos = fs.existsSync(path.join(DATA_DIR, "ingresos-mensual.csv"))
    ? readCsv("ingresos-mensual.csv")
    : [];
  const transacciones = readCsv("transacciones.csv");
  const deudas = readCsv("deudas.csv");

  const ts = nowIso();
  const concepts = [];
  const parentKeys = new Set();

  const transactions = transacciones.map((row, idx) => {
    const period = row.periodo;
    const brainId = brainIdFromTransaction(row);
    const txId = `brain_tx_${row.fecha}_${idx}`;
    return {
      id: txId,
      type: row.tipo === "income" ? "income" : "expense",
      description: row.concepto,
      amount: num(row.monto_mxn),
      category: row.categoria,
      subcategory: row.subcategoria || undefined,
      date: row.fecha,
      timestamp: `${row.fecha}T12:00:00.000Z`,
      notes: row.notas || undefined,
      source: row.fuente === "manual" ? "manual" : "import",
      currency: "MXN",
      budgetConceptId: brainId ? conceptId(period, brainId) : undefined,
    };
  });

  const actualByConceptId = new Map();
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
    status: row.estado === "active" ? "active" : "closed",
    notes: row.notas || undefined,
    createdAt: ts,
    updatedAt: ts,
  }));

  const payload = {
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

function dedupeBudgetConcepts(concepts) {
  const normalize = (value) => value.trim().toLowerCase();
  const parentKey = (period, type, category) => `${period}::${type}::${normalize(category)}`;
  const leafKey = (c) =>
    `${c.period}::${c.type}::${normalize(c.category)}::${normalize(c.subcategory || "")}::${normalize(c.name)}`;

  const pick = (a, b) => {
    const aBrain = a.id.startsWith("brain_");
    const bBrain = b.id.startsWith("brain_");
    if (aBrain && !bBrain) return a;
    if (bBrain && !aBrain) return b;
    return new Date(a.createdAt).getTime() <= new Date(b.createdAt).getTime() ? a : b;
  };

  const parentCanonical = new Map();
  const parentIdRemap = new Map();
  const leafCanonical = new Map();
  const dropIds = new Set();

  for (const concept of concepts) {
    if (!concept.isParent || concept.parentId) continue;
    const key = parentKey(concept.period, concept.type, concept.category);
    const existing = parentCanonical.get(key);
    if (!existing) {
      parentCanonical.set(key, concept);
      continue;
    }
    const keep = pick(existing, concept);
    const drop = keep.id === existing.id ? concept : existing;
    parentCanonical.set(key, keep);
    parentIdRemap.set(drop.id, keep.id);
    dropIds.add(drop.id);
  }

  for (const concept of concepts) {
    if (concept.isParent) continue;
    const key = leafKey(concept);
    const existing = leafCanonical.get(key);
    if (!existing) {
      leafCanonical.set(key, concept);
      continue;
    }
    const keep = pick(existing, concept);
    const drop = keep.id === existing.id ? concept : existing;
    keep.budgetedAmount = Math.max(keep.budgetedAmount || 0, drop.budgetedAmount || 0);
    keep.actualAmount = Math.max(keep.actualAmount || 0, drop.actualAmount || 0);
    leafCanonical.set(key, keep);
    parentIdRemap.set(drop.id, keep.id);
    dropIds.add(drop.id);
  }

  return concepts
    .filter((concept) => !dropIds.has(concept.id))
    .map((concept) => {
      if (concept.isParent) return concept;
      const parentId = concept.parentId
        ? parentIdRemap.get(concept.parentId) ?? concept.parentId
        : undefined;
      return parentId && parentId !== concept.parentId ? { ...concept, parentId } : concept;
    });
}

function mergeBudgetConcepts(brainConcepts, remoteConcepts, brainPeriods) {
  const normalize = (v) => String(v || "").trim().toLowerCase();
  const leafKey = (c) =>
    `${c.period}::${c.type}::${normalize(c.category)}::${normalize(c.subcategory)}::${normalize(c.name)}`;

  const remoteById = new Map(remoteConcepts.map((c) => [c.id, c]));
  const remoteByLeaf = new Map();
  for (const c of remoteConcepts) {
    if (!c.isParent) remoteByLeaf.set(leafKey(c), c);
  }

  const keptRemote = remoteConcepts.filter((c) => !brainPeriods.has(c.period));
  const mergedBrainPeriod = [];
  const consumedRemote = new Set();

  for (const bc of brainConcepts) {
    if (!brainPeriods.has(bc.period)) continue;
    const remote =
      remoteById.get(bc.id) || (!bc.isParent ? remoteByLeaf.get(leafKey(bc)) : undefined);
    if (remote) {
      mergedBrainPeriod.push({
        ...bc,
        budgetedAmount: remote.budgetedAmount ?? bc.budgetedAmount,
        actualAmount: Math.max(remote.actualAmount ?? 0, bc.actualAmount ?? 0),
        isFixed: remote.isFixed ?? bc.isFixed,
        description: remote.description || bc.description,
        updatedAt: remote.updatedAt || bc.updatedAt,
      });
      consumedRemote.add(remote.id);
    } else {
      mergedBrainPeriod.push(bc);
    }
  }

  for (const rc of remoteConcepts) {
    if (!brainPeriods.has(rc.period)) continue;
    if (consumedRemote.has(rc.id)) continue;
    if (mergedBrainPeriod.some((c) => c.id === rc.id)) continue;
    mergedBrainPeriod.push(rc);
  }

  return dedupeBudgetConcepts([...keptRemote, ...mergedBrainPeriod]);
}

function mergeTransactions(brainTx, remoteTx, brainPeriods) {
  const byId = new Map();
  const add = (tx) => {
    if (!tx?.id) return;
    byId.set(tx.id, tx);
  };

  for (const tx of brainTx) {
    const period = (tx.date || "").slice(0, 7);
    if (!brainPeriods.has(period)) add(tx);
  }

  for (const tx of remoteTx) {
    if (tx.source === "shopping_trip") add(tx);
  }

  for (const tx of remoteTx) {
    const period = (tx.date || "").slice(0, 7);
    if (tx.source === "shopping_trip") continue;
    if (!brainPeriods.has(period)) add(tx);
  }

  for (const tx of remoteTx) {
    const period = (tx.date || "").slice(0, 7);
    if (!period || !brainPeriods.has(period)) continue;
    if (tx.source === "shopping_trip") continue;
    add(tx);
  }

  const merged = [...byId.values()];
  for (const tx of brainTx) {
    const period = (tx.date || "").slice(0, 7);
    if (!brainPeriods.has(period)) continue;
    if (byId.has(tx.id)) continue;

    if (tx.budgetConceptId) {
      const replaced = merged.some(
        (r) =>
          r.type === tx.type &&
          r.budgetConceptId === tx.budgetConceptId &&
          (r.date || "").slice(0, 7) === period,
      );
      if (replaced) continue;
    }

    if (tx.type === "income") {
      const remoteIncome = merged.some(
        (r) => r.type === "income" && (r.date || "").slice(0, 7) === period,
      );
      if (remoteIncome) continue;
    }

    add(tx);
  }

  return [...byId.values()].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export function mergeWithRemotePayload(brainPayload, remotePayload) {
  if (!remotePayload || typeof remotePayload !== "object") {
    return brainPayload;
  }

  const brainPeriods = new Set(
    (brainPayload.moduleData?.budgetConcepts ?? [])
      .filter((c) => !c.isParent)
      .map((c) => c.period),
  );

  const brainTx = brainPayload.transactions ?? [];
  const remoteTx = remotePayload.transactions ?? [];

  return {
    ...brainPayload,
    transactions: mergeTransactions(brainTx, remoteTx, brainPeriods),
    moduleData: {
      ...brainPayload.moduleData,
      ...remotePayload.moduleData,
      budgetConcepts: mergeBudgetConcepts(
        brainPayload.moduleData?.budgetConcepts ?? [],
        remotePayload.moduleData?.budgetConcepts ?? [],
        brainPeriods,
      ),
      categoriesTree:
        (brainPayload.moduleData?.categoriesTree?.length
          ? brainPayload.moduleData.categoriesTree
          : remotePayload.moduleData?.categoriesTree) ?? [],
      budgetCategoryOrder:
        remotePayload.moduleData?.budgetCategoryOrder ??
        brainPayload.moduleData?.budgetCategoryOrder ??
        {},
    },
    banks: remotePayload.banks?.length ? remotePayload.banks : brainPayload.banks,
    accounts: remotePayload.accounts?.length
      ? remotePayload.accounts
      : brainPayload.accounts,
  };
}
