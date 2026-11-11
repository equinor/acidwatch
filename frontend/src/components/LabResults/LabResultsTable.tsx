import React, { ChangeEvent, useMemo, useRef, useState } from "react";
import { ExperimentResult } from "@/dto/ExperimentResult";
import { Button, Checkbox, Icon, Input, Popover, Table } from "@equinor/eds-core-react";
import {
    Column,
    columnFacetingFeature,
    columnFilteringFeature,
    createColumnHelper,
    createFilteredRowModel,
    filterFn_includesString,
    filterFn_inNumberRange,
    globalFilteringFeature,
    metaHelper,
    rowSelectionFeature,
    RowSelectionState,
    tableFeatures,
    useTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useCreateAtom } from "@tanstack/react-store";
import { ModelSelect } from "./ModelSelect";
import { ModelConfig } from "@/dto/FormConfig";
import styled from "styled-components";
import { filter_alt, filter_alt_active } from "@equinor/eds-icons";

interface LabResultsTableProps {
    labResults: ExperimentResult[];
    onStart: (selected: ExperimentResult[]) => void;
    selectedModels: Set<ModelConfig>;
    setSelectedModels: (value: Set<ModelConfig>) => void;
}

const features = tableFeatures({
    filteredRowModel: createFilteredRowModel(),
    rowSelectionFeature,
    globalFilteringFeature,
    columnFilteringFeature,
    columnFacetingFeature,
    columnMeta: metaHelper<{
        className?: string;
        filterType?: "number" | "text";
    }>(),
    filterFns: {
        includesString: filterFn_includesString,
        inNumberRange: filterFn_inNumberRange,
    },
});
const columnHelper = createColumnHelper<typeof features, ExperimentResult>();

const makeColumns = (results: ExperimentResult[]) => {
    const substanceColumns = (
        prefix: string,
        f: (x: ExperimentResult) => Record<string, number>,
        className?: string
    ) => {
        const substances = results.reduce((m, x) => m.union(new Set(Object.keys(f(x)))), new Set<string>());

        return Array.from(substances).map((name) =>
            columnHelper.accessor((row) => f(row)[name] ?? 0, {
                id: `${prefix}-${name}`,
                header: name,
                meta: { className, filterType: "number" },
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
                    meta: { filterType: "text" },
                }),
                columnHelper.accessor("temperature", {
                    header: "°C",
                    meta: { filterType: "number" },
                }),
                columnHelper.accessor("pressure", {
                    header: "bara",
                    meta: { filterType: "number" },
                }),
            ]),
        }),
        columnHelper.group({
            header: "Input Concentrations (ppm)",
            columns: columnHelper.columns(substanceColumns("in", (x) => x.initialConcentrations, "alt")),
            meta: { className: "alt" },
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
    const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
    const paddingBottom =
        virtualRows.length > 0 ? virtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end : 0;

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div ref={scrollRef} style={{ overflow: "auto", flex: 1, minHeight: 0 }}>
                <Table style={{ width: "100%" }}>
                    <Table.Head sticky>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <Table.Row key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <Table.Cell
                                        key={header.id}
                                        colSpan={header.colSpan}
                                        className={header.column.columnDef.meta?.className}
                                    >
                                        <table.FlexRender header={header} />
                                        {header.column.getCanFilter() && header.column.columnDef.meta?.filterType ? (
                                            <FilterButton column={header.column} />
                                        ) : null}
                                    </Table.Cell>
                                ))}
                            </Table.Row>
                        ))}
                    </Table.Head>

                    <Table.Body>
                        {paddingTop > 0 && <tr style={{ height: paddingTop }} />}
                        {virtualRows.map((virtualRow) => {
                            const row = rows[virtualRow.index];
                            return (
                                <Table.Row key={row.id} data-index={virtualRow.index} ref={virtualizer.measureElement}>
                                    {row.getAllCells().map((cell) => (
                                        <Table.Cell key={cell.id} className={cell.column.columnDef.meta?.className}>
                                            <table.FlexRender cell={cell} />
                                        </Table.Cell>
                                    ))}
                                </Table.Row>
                            );
                        })}
                        {paddingBottom > 0 && <tr style={{ height: paddingBottom }} />}
                    </Table.Body>
                </Table>
            </div>

            <div
                style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    gap: "1rem",
                    margin: "1rem",
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

type FilterButtonType = {
    column: Column<typeof features, ExperimentResult>;
};

const FilterButton: React.FC<FilterButtonType> = ({ column }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLButtonElement | null>(null);
    const filterType = column.columnDef.meta?.filterType;

    type MinMax = [number | undefined, number | undefined];
    const columnFilterValue = column.getFilterValue() as string | MinMax | undefined;

    const hasActiveFilters = (value?: string | MinMax) =>
        value !== undefined &&
        (filterType === "number" ? (value as MinMax).some((v) => v !== undefined && !isNaN(v)) : value);

    return (
        <>
            <Button
                aria-haspopup
                aria-expanded={open}
                ref={ref}
                onClick={() => setOpen(!open)}
                variant="ghost_icon"
                aria-label="Show column filters"
            >
                <Icon data={hasActiveFilters(columnFilterValue) ? filter_alt_active : filter_alt} />
            </Button>
            <Popover anchorEl={ref.current} open={open} onClose={() => setOpen(false)}>
                <Popover.Content>
                    <Filter column={column} />
                </Popover.Content>
            </Popover>
        </>
    );
};

type FilterProps = {
    column: Column<typeof features, ExperimentResult>;
};

const NumberContainer = styled.div`
    display: grid;
    grid-template-columns: 80px 80px;
    grid-column-gap: 32px;
`;

export const Filter: React.FC<FilterProps> = ({ column }) => {
    const filterType = column.columnDef.meta?.filterType;
    const columnFilterValue = column.getFilterValue();

    return filterType === "number" ? (
        <NumberContainer>
            <Input
                type="number"
                min={Number(column.getFacetedMinMaxValues()?.[0] ?? "")}
                max={Number(column.getFacetedMinMaxValues()?.[1] ?? "")}
                value={(columnFilterValue as [number, number])?.[0] ?? ""}
                onChange={(value: ChangeEvent<HTMLInputElement>) =>
                    column.setFilterValue((old: [number, number]) => [value.target.valueAsNumber, old?.[1]])
                }
                placeholder={`Min ${
                    column.getFacetedMinMaxValues()?.[0] ? `(${column.getFacetedMinMaxValues()?.[0]})` : ""
                }`}
            />
            <Input
                type="number"
                min={Number(column.getFacetedMinMaxValues()?.[0] ?? "")}
                max={Number(column.getFacetedMinMaxValues()?.[1] ?? "")}
                value={(columnFilterValue as [number, number])?.[1] ?? ""}
                onChange={(value: ChangeEvent<HTMLInputElement>) =>
                    column.setFilterValue((old: [number, number]) => [old?.[0], value.target.valueAsNumber])
                }
                placeholder={`Max ${
                    column.getFacetedMinMaxValues()?.[1] ? `(${column.getFacetedMinMaxValues()?.[1]})` : ""
                }`}
            />
        </NumberContainer>
    ) : (
        <Input
            type="text"
            debounce={100}
            value={(columnFilterValue ?? []) as Array<string>}
            onChange={(value: ChangeEvent<HTMLInputElement>) => column.setFilterValue(value.target.value)}
            placeholder="e.g Exp2"
            list={column.id + "list"}
        />
    );
};

export default LabResultsTable;
