import { cn } from "@/lib/utils";

type Column<T> = {
  header: string;
  accessor: (item: T) => React.ReactNode;
  className?: string;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  getKey: (item: T) => string;
};

export function DataTable<T>({ columns, data, getKey }: DataTableProps<T>) {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-white shadow-sm shadow-pink-950/5">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead className="bg-[var(--cream)] text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {columns.map((column) => (
                <th key={column.header} className={cn("px-4 py-3", column.className)}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {data.map((item) => (
              <tr key={getKey(item)} className="hover:bg-pink-50/40">
                {columns.map((column) => (
                  <td key={column.header} className={cn("px-4 py-4", column.className)}>
                    {column.accessor(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
