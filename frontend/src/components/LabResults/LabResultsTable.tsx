import React, { useMemo } from "react";
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
            columnHelper.accessor((row) => f(row)[name], {
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
                    header: "Temperature (°C)",
                }),
                columnHelper.accessor("pressure", {
                    header: "Pressure (bar a)",
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

    return (
        <>
            <Table style={{ width: "100%" }}>
                <Table.Head>
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
                    {table.getRowModel().rows.map((row) => (
                        <Table.Row key={row.id}>
                            {row.getAllCells().map((cell) => (
                                <Table.Cell key={cell.id}>
                                    <table.FlexRender cell={cell} />
                                </Table.Cell>
                            ))}
                        </Table.Row>
                    ))}
                </Table.Body>
                <Table.Foot sticky>
                    <Table.Row>
                        <Table.Cell colSpan={table.getAllLeafColumns().length}>
                            <div
                                style={{
                                    display: "flex",
                                    width: "100%",
                                    alignItems: "center",
                                    justifyContent: "space-between",
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

                                                <Button.Group>
                                                    <ModelSelect
                                                        variant="ghost"
                                                        selectedModels={selectedModels}
                                                        setModels={setSelectedModels}
                                                        disabled={selected.size === 0}
                                                    />
                                                    <Button disabled={selected.size === 0} onClick={handleClick}>
                                                        Simulate
                                                    </Button>
                                                </Button.Group>
                                            </>
                                        );
                                    }}
                                </table.Subscribe>
                            </div>
                        </Table.Cell>
                    </Table.Row>
                </Table.Foot>
            </Table>
        </>
    );
};

export default LabResultsTable;
