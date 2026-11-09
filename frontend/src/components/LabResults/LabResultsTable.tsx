import React, { useMemo, useRef } from "react";
import { ExperimentResult } from "@/dto/ExperimentResult";
import { Button, Checkbox, Table } from "@equinor/eds-core-react";
import {
    columnFilteringFeature,
    createColumnHelper,
    globalFilteringFeature,
    rowSelectionFeature,
    RowSelectionState,
    tableFeatures,
    useTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useCreateAtom } from "@tanstack/react-store";
import { ModelSelect } from "./ModelSelect";
import { ModelConfig } from "@/dto/FormConfig";

interface LabResultsTableProps {
    labResults: ExperimentResult[];
    onStart: (selected: ExperimentResult[]) => void;
    selectedModels: Set<ModelConfig>;
    setSelectedModels: (value: Set<ModelConfig>) => void;
}

const features = tableFeatures({
    rowSelectionFeature,
    globalFilteringFeature,
    columnFilteringFeature,
});
const columnHelper = createColumnHelper<typeof features, ExperimentResult>();

const makeColumns = (results: ExperimentResult[]) => {
    const substanceColumns = (prefix: string, f: (x: ExperimentResult) => Record<string, number>) => {
        const substances = results.reduce((m, x) => m.union(new Set(Object.keys(f(x)))), new Set<string>());

        return Array.from(substances).map((name) =>
            columnHelper.accessor((row) => f(row)[name] ?? 0, {
                id: `${prefix}-${name}`,
                header: name,
            })
        );
    };

    const columns = columnHelper.columns([
        columnHelper.group({
            header: "Metadata",
            columns: columnHelper.columns([
                columnHelper.display({
                    id: "select",
                    header: ({ table }) => (
                        <Checkbox
                            checked={table.getIsAllRowsSelected()}
                            indeterminate={!table.getIsAllRowsSelected() && table.getIsSomeRowsSelected()}
                            onChange={table.getToggleAllRowsSelectedHandler()}
                            style={{ padding: "0 13px" }}
                        />
                    ),
                    cell: ({ row }) => (
                        <Checkbox
                            checked={row.getIsSelected()}
                            disabled={!row.getCanSelect()}
                            indeterminate={row.getIsSomeSelected()}
                            onChange={row.getToggleSelectedHandler()}
                        />
                    ),
                }),
                columnHelper.accessor("name", {
                    header: "Experiment",
                }),
                columnHelper.accessor("temperature", {
                    header: "°C",
                }),
                columnHelper.accessor("pressure", {
                    header: "bar a",
                }),
            ]),
        }),
        columnHelper.group({
            header: "Input Concentrations (ppm)",
            columns: columnHelper.columns(substanceColumns("in", (x) => x.initialConcentrations)),
        }),
        columnHelper.group({
            header: "Output Concentrations (ppm)",
            columns: columnHelper.columns(substanceColumns("out", (x) => x.finalConcentrations)),
        }),
    ]);

    return columns;
};

const LabResultsTable: React.FC<LabResultsTableProps> = ({
    labResults: data,
    onStart,
    selectedModels,
    setSelectedModels,
}) => {
    const rowSelectionAtom = useCreateAtom<RowSelectionState>({});
    const columns = useMemo(() => makeColumns(data), [data]);
    const table = useTable(
        {
            key: "lab-results",
            columns,
            data,
            features,
            enableRowSelection: true,
            getRowId: (row) => row.name,
            atoms: {
                rowSelection: rowSelectionAtom,
            },
        },
        (state) => state
    );

    const scrollRef = useRef<HTMLDivElement>(null);
    const rows = table.getRowModel().rows;
    const virtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => 49,
        overscan: 10,
    });
    const virtualRows = virtualizer.getVirtualItems();

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div ref={scrollRef} style={{ overflow: "auto" }}>
                <Table style={{ width: "100%" }}>
                    <Table.Head sticky>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <Table.Row key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <Table.Cell key={header.id} colSpan={header.colSpan}>
                                        <table.FlexRender header={header} />
                                    </Table.Cell>
                                ))}
                            </Table.Row>
                        ))}
                    </Table.Head>

                    <Table.Body>
                        {virtualRows.map((virtualRow) => {
                            const row = rows[virtualRow.index];
                            return (
                                <Table.Row key={row.id} data-index={virtualRow.index} ref={virtualizer.measureElement}>
                                    {row.getAllCells().map((cell) => (
                                        <Table.Cell key={cell.id}>
                                            <table.FlexRender cell={cell} />
                                        </Table.Cell>
                                    ))}
                                </Table.Row>
                            );
                        })}
                    </Table.Body>
                </Table>
            </div>

            <div
                style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    gap: "1rem",
                    marginTop: "1rem",
                }}
            >
                <table.Subscribe source={table.atoms.rowSelection}>
                    {(rowSelection) => {
                        const selected = new Set(Object.keys(rowSelection));
                        const handleClick = () => {
                            onStart(data.filter((entry) => selected.has(entry.name)));
                        };

                        return (
                            <>
                                <div>{selected.size.toLocaleString()} experiments selected</div>

                                <ModelSelect
                                    variant="ghost"
                                    selectedModels={selectedModels}
                                    setModels={setSelectedModels}
                                    disabled={selected.size === 0}
                                />
                                <Button disabled={selected.size === 0} onClick={handleClick}>
                                    Simulate
                                </Button>
                            </>
                        );
                    }}
                </table.Subscribe>
            </div>
        </div>
    );
};

export default LabResultsTable;
