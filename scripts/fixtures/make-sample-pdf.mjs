// Generates a fake bank-statement-style PDF fixture for testing PDF import. Not used by the app
// itself -- pdfkit is a devDependency purely for this.

import PDFDocument from "pdfkit";
import { createWriteStream } from "node:fs";
import { fileURLToPath } from "node:url";

const outPath = fileURLToPath(new URL("./sample-statement.pdf", import.meta.url));
const doc = new PDFDocument({ margin: 40, size: "A4" });
doc.pipe(createWriteStream(outPath));

const cols = [
  { x: 40, w: 70, label: "Date" },
  { x: 110, w: 200, label: "Description" },
  { x: 310, w: 30, label: "Ref" },
  { x: 345, w: 70, label: "Debit" },
  { x: 415, w: 70, label: "Credit" },
  { x: 485, w: 70, label: "Balance" },
];

function row(y, values) {
  values.forEach((v, i) => {
    doc.text(v, cols[i].x, y, { width: cols[i].w, lineBreak: false });
  });
}

doc.fontSize(14).text("Account Statement", 40, 40);
doc.fontSize(9).text("Account No: XXXX5678", 40, 60);

doc.fontSize(9);
let y = 100;
row(y, cols.map((c) => c.label));
y += 20;

const rows = [
  ["01/04/2026", "UPI-SUPPLIER PAYMENT", "R01", "5000.00", "", "180000.00"],
  ["03/04/2026", "NEFT FROM CLIENT ABC", "R02", "", "25000.00", "205000.00"],
  ["06/04/2026", "ATM WITHDRAWAL", "R03", "3000.00", "", "202000.00"],
  ["09/04/2026", "UPI-STAFF PAYOUT RAVI", "R04", "8000.00", "", "194000.00"],
];

for (const r of rows) {
  row(y, r);
  y += 18;
}

doc.end();
console.log("wrote", outPath);
