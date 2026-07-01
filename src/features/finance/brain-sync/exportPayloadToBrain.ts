import type { FinancialPersistedData } from "../FinancialDatabase";
import { actualByConceptFromAllTransactions, resolveAmountMxn } from "../period-math";
import { rowsToCsv } from "./parseCsv";
import type { BrainCsvExport } from "./types";

type ExportConcept = {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  period: string;
  type: "income" | "expense";
  budgetedAmount?: number;
  actualAmount?: number;
  isFixed?: boolean;
  description?: string;
  isParent?: boolean;
};

const PRESUPUESTO_HEADERS = [
  "periodo",
  "id",
  "concepto_es",
  "categoria",
  "subcategoria",
  "planeado_mxn",
  "ejecutado_mxn",
  "fijo",
  "cargado_en",
  "fecha_corte",
  "fecha_limite",
  "fecha_pago",
  "estado",
  "numero_recibo",
  "archivo_recibo",
];

const TRANSACCIONES_HEADERS = [
  "fecha",
  "tipo",
  "concepto",
  "categoria",
  "subcategoria",
  "monto_mxn",
  "cuenta",
  "notas",
  "periodo",
  "fuente",
];

function slugFromConceptId(id: string | undefined): string | null {
  if (!id?.startsWith("brain_")) return null;
  const parts = id.split("_");
  if (parts.length < 3) return null;
  return parts.slice(2).join("-");
}

function parseDescriptionMeta(description: string | undefined) {
  const meta = {
    estado: "",
    fecha_corte: "",
    fecha_limite: "",
    fecha_pago: "",
  };
  for (const chunk of String(description || "").split(";")) {
    const [key, val] = chunk.split("=");
    if (!key || val == null) continue;
    const k = key.trim();
    const v = val.trim();
    if (k === "estado") meta.estado = v;
    if (k === "corte") meta.fecha_corte = v;
    if (k === "limite") meta.fecha_limite = v;
    if (k === "pago") meta.fecha_pago = v;
  }
  return meta;
}

function inferEstado(
  _concept: { actualAmount?: number; budgetedAmount?: number },
  actualFromTx: number,
): string {
  const actual = actualFromTx || 0;
  const budgeted = _concept.budgetedAmount || 0;
  if (actual <= 0) return "pendiente";
  if (budgeted > 0 && actual >= budgeted) return "pagado";
  if (budgeted > 0 && actual < budgeted) return "parcial";
  return "pagado";
}

function resolveEstado(
  concept: { actualAmount?: number; budgetedAmount?: number; description?: string },
  actualFromTx: number,
): string {
  const inferred = inferEstado(concept, actualFromTx);
  if (inferred === "pagado" || inferred === "parcial") return inferred;
  const meta = parseDescriptionMeta(concept.description);
  return meta.estado || inferred;
}

function shouldExportConcept(
  c: { id?: string; budgetedAmount?: number; actualAmount?: number },
  actualByConcept: Map<string, number>,
): boolean {
  if (c.id?.startsWith("brain_")) return true;
  const fromTx = actualByConcept.get(c.id ?? "") ?? 0;
  if (fromTx > 0) return true;
  if ((c.budgetedAmount || 0) > 0) return true;
  if ((c.actualAmount || 0) > 0) return true;
  return false;
}

export function exportPayloadToBrainCsv(payload: FinancialPersistedData): BrainCsvExport {
  const concepts = ((payload.moduleData?.budgetConcepts ?? []) as ExportConcept[]).filter(
    (c) => !c.isParent,
  );
  const transactions = payload.transactions ?? [];

  const actualByConcept = actualByConceptFromAllTransactions(transactions);

  const presupuestoRows = concepts
    .filter((c) => c.type === "expense")
    .filter((c) => shouldExportConcept(c, actualByConcept))
    .sort((a, b) => a.period.localeCompare(b.period) || a.category.localeCompare(b.category))
    .map((c) => {
      const brainId = slugFromConceptId(c.id) || c.id.replace(/^concept_/, "app-");
      const fromTx = actualByConcept.get(c.id) ?? 0;
      const ejecutado = fromTx;
      const meta = parseDescriptionMeta(c.description);
      const estado = resolveEstado(c, fromTx);
      return {
        periodo: c.period,
        id: brainId,
        concepto_es: c.name,
        categoria: c.category,
        subcategoria: c.subcategory || "",
        planeado_mxn: c.budgetedAmount || 0,
        ejecutado_mxn: ejecutado,
        fijo: c.isFixed ? "true" : "false",
        cargado_en: c.id.startsWith("brain_") ? "true" : "false",
        fecha_corte: meta.fecha_corte,
        fecha_limite: meta.fecha_limite,
        fecha_pago: meta.fecha_pago,
        estado,
        numero_recibo: "",
        archivo_recibo: "",
      };
    });

  const ingresosRows = concepts
    .filter((c) => c.type === "income")
    .filter((c) => shouldExportConcept(c, actualByConcept))
    .sort((a, b) => a.period.localeCompare(b.period) || a.category.localeCompare(b.category))
    .map((c) => {
      const brainId = slugFromConceptId(c.id) || c.id.replace(/^concept_/, "app-");
      const fromTx = actualByConcept.get(c.id) ?? 0;
      const ejecutado = fromTx;
      const meta = parseDescriptionMeta(c.description);
      return {
        periodo: c.period,
        id: brainId,
        concepto_es: c.name,
        categoria: c.category,
        subcategoria: c.subcategory || "",
        planeado_mxn: c.budgetedAmount || 0,
        ejecutado_mxn: ejecutado,
        fijo: c.isFixed ? "true" : "false",
        cargado_en: c.id.startsWith("brain_") ? "true" : "false",
        fecha_corte: meta.fecha_corte,
        fecha_limite: meta.fecha_limite,
        fecha_pago: meta.fecha_pago,
        estado: resolveEstado(c, fromTx),
        numero_recibo: "",
        archivo_recibo: "",
      };
    });

  const txRows = transactions
    .filter((tx) => tx.type === "income" || tx.type === "expense")
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((tx) => ({
      fecha: tx.date,
      tipo: tx.type,
      concepto: tx.description,
      categoria: tx.category,
      subcategoria: tx.subcategory || "",
      monto_mxn: resolveAmountMxn(tx),
      cuenta: "",
      notas: tx.notes || "",
      periodo: (tx.date || "").slice(0, 7),
      fuente:
        tx.source === "shopping_trip"
          ? "shopping"
          : tx.source === "import"
            ? "import"
            : "manual",
    }));

  return {
    presupuesto: rowsToCsv(PRESUPUESTO_HEADERS, presupuestoRows),
    ingresos: rowsToCsv(PRESUPUESTO_HEADERS, ingresosRows),
    transacciones: rowsToCsv(TRANSACCIONES_HEADERS, txRows),
    stats: {
      presupuesto: presupuestoRows.length,
      ingresos: ingresosRows.length,
      transacciones: txRows.length,
    },
  };
}

/** ZIP store-only (sin compresión) para descargar CSV del brain. */
export function createBrainCsvZip(files: { name: string; content: string }[]): Blob {
  const parts: BlobPart[] = [];
  const central: { name: Uint8Array; offset: number; size: number }[] = [];
  let offset = 0;

  const encoder = new TextEncoder();

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const dataBytes = encoder.encode(file.content);
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(localHeader.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, 0, true);
    view.setUint16(14, 0, true);
    view.setUint32(18, 0, true);
    view.setUint32(22, dataBytes.length, true);
    view.setUint32(26, dataBytes.length, true);
    view.setUint16(30, nameBytes.length, true);
    localHeader.set(nameBytes, 30);

    parts.push(localHeader);
    parts.push(dataBytes);
    central.push({ name: nameBytes, offset, size: dataBytes.length });
    offset += localHeader.length + dataBytes.length;
  }

  const centralStart = offset;
  for (const entry of central) {
    const header = new Uint8Array(46 + entry.name.length);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x02014b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 20, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, 0, true);
    view.setUint16(14, 0, true);
    view.setUint32(16, 0, true);
    view.setUint32(20, entry.size, true);
    view.setUint32(24, entry.size, true);
    view.setUint16(28, entry.name.length, true);
    view.setUint16(30, 0, true);
    view.setUint16(32, 0, true);
    view.setUint16(34, 0, true);
    view.setUint16(36, 0, true);
    view.setUint32(38, 0, true);
    view.setUint32(42, entry.offset, true);
    header.set(entry.name, 46);
    parts.push(header);
    offset += header.length;
  }

  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, offset - centralStart, true);
  endView.setUint32(16, centralStart, true);
  endView.setUint16(20, 0, true);
  parts.push(end);

  return new Blob(parts, { type: "application/zip" });
}

export function downloadBrainCsvZip(payload: FinancialPersistedData, filename = "brain-finanzas.zip") {
  const exported = exportPayloadToBrainCsv(payload);
  const zip = createBrainCsvZip([
    { name: "presupuesto-mensual.csv", content: exported.presupuesto },
    { name: "ingresos-mensual.csv", content: exported.ingresos },
    { name: "transacciones.csv", content: exported.transacciones },
  ]);
  const url = URL.createObjectURL(zip);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
