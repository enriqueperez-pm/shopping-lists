/**
 * Tests for taxonomy-canonical.ts
 * Run: npx tsx scripts/taxonomy-canonical.test.ts
 */
import {
  isCanonicalPair,
  resolveCanonicalPair,
  LEGACY_PAIR_MAP,
} from "../src/features/finance/taxonomy-canonical";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error("FAIL:", message);
    process.exit(1);
  }
}

assert(isCanonicalPair("expense", "Alimentación", "Delivery"), "Delivery should be canonical");
assert(!isCanonicalPair("expense", "Food", "Delivery"), "Food|Delivery is not canonical");

const mapped = resolveCanonicalPair("expense", "Food", "Delivery");
assert(mapped?.category === "Alimentación" && mapped.subcategory === "Delivery", "Food|Delivery maps to canonical");

const salary = resolveCanonicalPair("income", "Salary", "Main Job");
assert(salary?.category === "Ingresos" && salary.subcategory === "Nómina", "Salary maps to Nómina");

const direct = resolveCanonicalPair("expense", "Vivienda", "Renta");
assert(direct?.category === "Vivienda", "Direct canonical match");

assert(resolveCanonicalPair("expense", "Unknown", "X") === null, "Unknown pair returns null");

assert(Object.keys(LEGACY_PAIR_MAP).length > 40, "LEGACY_PAIR_MAP populated");

console.log("OK taxonomy-canonical.test.ts");
