import type { ReactNode } from "react";

type CompactColumn = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  className?: string;
  width?: string;
};

type CompactTableRow = {
  id: string;
  [key: string]: ReactNode;
};

type CompactTableProps = {
  columns: CompactColumn[];
  rows: CompactTableRow[];
  emptyState?: string;
  variant?: "default" | "spreadsheet";
};

const alignMap: Record<NonNullable<CompactColumn["align"]>, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

export default function CompactTable({
  columns,
  rows,
  emptyState = "No data",
  variant = "default",
}: CompactTableProps) {
  if (rows.length === 0) {
    return <div className="text-[12px] text-slate-500">{emptyState}</div>;
  }

  if (variant === "spreadsheet") {
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="border-b-2 border-slate-300 bg-slate-100">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`border-r border-slate-300 px-2 py-1.5 font-bold uppercase tracking-[0.14em] text-slate-700 ${
                    alignMap[column.align ?? "left"]
                  } ${column.width ?? ""}`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={row.id}
                className={`${
                  idx % 2 === 0 ? "bg-white" : "bg-slate-50"
                } border-b border-slate-200 hover:bg-slate-100`}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`border-r border-slate-200 px-2 py-1.5 align-top ${
                      alignMap[column.align ?? "left"]
                    } ${column.className ?? ""} ${column.width ?? ""}`}
                  >
                    {row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <table className="w-full border-collapse text-[12px]">
      <thead>
        <tr className="border-b border-slate-200 text-[10px] uppercase tracking-[0.16em] text-slate-400">
          {columns.map((column) => (
            <th
              key={column.key}
              className={`px-2 py-1 font-semibold ${
                alignMap[column.align ?? "left"]
              } ${column.className ?? ""}`}
            >
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="border-b border-slate-100 last:border-b-0">
            {columns.map((column) => (
              <td
                key={column.key}
                className={`px-2 py-1 align-top ${
                  alignMap[column.align ?? "left"]
                } ${column.className ?? ""}`}
              >
                {row[column.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
