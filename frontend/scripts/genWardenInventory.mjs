import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dashPath = path.join(__dirname, "../src/components/dashboard/WardenDashboard.jsx");
const outPath = path.join(__dirname, "../src/components/inventory/WardenInventory.jsx");

const src = fs.readFileSync(dashPath, "utf8");
const catStart = src.indexOf("function inventoryCategoryTaken");
const catEnd = src.indexOf("function InventoryPanel(");
const catFn = src.slice(catStart, catEnd);
const panelInnerStart = src.indexOf("  const [showAddInventory");
const panelInnerEnd = src.indexOf("\n}\n\nexport default function App");
if (catStart < 0 || panelInnerStart < 0 || panelInnerEnd < 0) {
  console.error("markers not found", { catStart, panelInnerStart, panelInnerEnd });
  process.exit(1);
}
let panelBody = src.slice(panelInnerStart, panelInnerEnd);
panelBody = panelBody.replace(
  /setInventoryRefreshKey\(\(k\) => k \+ 1\)/g,
  "setInventoryRefreshKey((k) => k + 1);\n      window.dispatchEvent(new CustomEvent(WARDEN_INVENTORY_CHANGED))",
);

const header = `import { useState, useEffect } from "react";
import { apiFetch } from "../../shared/api/client";
import {
  getWardenTheme,
  MiniBarChart,
  MiniPieChart,
  pillBaseStatic,
  sanitizeDashboardSearchInput,
  WARDEN_INVENTORY_CHANGED,
} from "../dashboard/wardenDashboardPrimitives";

${catFn}
export default function WardenInventory() {
  const { T, s } = getWardenTheme();
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState("");
  const [inventoryList, setInventoryList] = useState([]);
  const [inventorySearch, setInventorySearch] = useState("");
  const [inventoryRefreshKey, setInventoryRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function loadInventory() {
      try {
        setInventoryLoading(true);
        setInventoryError("");
        const items = await apiFetch("/inventory");
        if (!cancelled) setInventoryList(Array.isArray(items) ? items : []);
      } catch (err) {
        if (!cancelled) {
          setInventoryError(err?.message ? String(err.message) : "Unable to load inventory");
          setInventoryList([]);
        }
      } finally {
        if (!cancelled) setInventoryLoading(false);
      }
    }
    loadInventory();
    return () => {
      cancelled = true;
    };
  }, [inventoryRefreshKey]);

  const filteredInventory = inventorySearch.trim()
    ? inventoryList.filter((it) => {
        const q = inventorySearch.trim().toLowerCase();
        const qty = it?.quantity != null ? String(it.quantity) : "";
        return [it?.name, it?.location, it?.category, it?.condition, qty]
          .filter(Boolean)
          .map((x) => String(x).toLowerCase())
          .some((v) => v.includes(q));
      })
    : inventoryList;

`;

fs.writeFileSync(outPath, `${header}${panelBody}\n`);
console.log("Wrote", outPath);
