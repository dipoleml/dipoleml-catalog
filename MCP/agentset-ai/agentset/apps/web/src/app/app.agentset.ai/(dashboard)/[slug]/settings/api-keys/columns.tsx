import type { ColumnDef } from "@tanstack/react-table";

import { ApiKeyActions } from "./actions";

export interface ApiKeyDef {
  id: string;
  label: string;
  scope: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export const columns: ColumnDef<ApiKeyDef>[] = [
  {
    header: () => <div className="pl-4">Label</div>,
    accessorKey: "label",
    cell: ({ row }) => {
      return <div className="pl-4">{row.original.label}</div>;
    },
  },
  {
    header: () => <div className="text-left">Scope</div>,
    accessorKey: "scope",
    cell: ({ row }) => {
      return <div className="text-left">{row.original.scope}</div>;
    },
  },
  {
    header: () => <div className="text-left">Created At</div>,
    accessorKey: "createdAt",
    cell: ({ row }) => {
      return (
        <div className="text-left">
          {row.original.createdAt.toLocaleString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      return (
        <div className="text-right">
          <ApiKeyActions row={row} />
        </div>
      );
    },
  },
];
