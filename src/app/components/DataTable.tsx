"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export interface Column<T> {
    key: string;
    label: string;
    render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
    columns: Column<T>[];
    data: T[];
    keyExtractor: (item: T) => string;
    onRowClick?: (item: T) => void;
}

export default function DataTable<T>({ columns, data, keyExtractor, onRowClick }: DataTableProps<T>) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    {columns.map((column) => (
                        <TableHead key={column.key}>{column.label}</TableHead>
                    ))}
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.map((item) => (
                    <TableRow
                        key={keyExtractor(item)}
                        onClick={() => onRowClick?.(item)}
                        className={onRowClick ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800" : ""}
                    >
                        {columns.map((column) => (
                            <TableCell key={column.key}>
                                {column.render ? column.render(item) : (item as any)[column.key]}
                            </TableCell>
                        ))}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
