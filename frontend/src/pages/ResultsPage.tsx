import React, { useState } from "react";
import { EdsDataGrid, Row } from "@equinor/eds-data-grid-react";
import { getLabResults } from "../api/api";
import { useQuery } from "@tanstack/react-query";
import ResultScatterGraph from "../components/ResultScatterPlot";
import { syntheticResults } from "../assets/syntheticResults.tsx";
import {
    graphComponentsAndRowRecord_to_ScatterGraphData,
    rowRecord_to_ScatterGraphData,
} from "../functions/Formatting";
import { Autocomplete, AutocompleteChanges, Button, Card, EdsProvider, Typography } from "@equinor/eds-core-react";

const ResultsPage: React.FC = () => {
    const initialPrefix = "in-";
    const finalPrefix = "out-";
    const [enableFilters, setEnableFilters] = useState<boolean>(false);
    const [plotComponents, setPlotComponents] = useState<String[]>([]);
    const [selectedRows, setSelectedRows] = useState<
        Record<
            string,
            Row<{
                meta: {};
                id: string;
                name: string;
                time: string;
            }>
        >
    >({});

    const {
        data: labResults = syntheticResults,
        error,
        isLoading,
    } = useQuery({
        queryKey: ["results"],
        queryFn: () => getLabResults(),
        retry: false,
    });

    if (isLoading) return <>Fetching results ...</>;

    let issueRetrievingDataInfo = null;

    if (error) {
        issueRetrievingDataInfo = (
            <Card variant="warning" style={{ margin: "2rem 0" }}>
                <Card.Header>
                    <Card.HeaderTitle>
                        <Typography variant="h5">Error fetching data from Oasis</Typography>
                    </Card.HeaderTitle>
                </Card.Header>
                <Card.Content>
                    <Typography variant="body_short_bold">{error.message}</Typography>
                    <Typography variant="body_short">Using open KDC results</Typography>
                </Card.Content>
            </Card>
        );
    }

    const initialConcHeaders = Array.from(
        new Set(labResults.flatMap((entry) => [...Object.keys(entry.initial_concentrations)]))
    );
    const finalConcHeaders = Array.from(
        new Set(labResults.flatMap((entry) => [...Object.keys(entry.final_concentrations)]))
    );

    const columns = [
        {
            columns: [
                {
                    header: "Experiment",
                    id: "name",
                    accessorKey: "name",
                    size: 200,
                },
                {
                    header: "Time",
                    id: "time",
                    accessorKey: "time",
                    size: 65,
                },
            ],
            header: "Meta data",
        },
        {
            columns: initialConcHeaders.map((header) => ({
                accessorKey: initialPrefix + header,
                header: header,
                id: initialPrefix + header,
                size: 65,
            })),
            header: "Input Concentrations",
        },
        {
            columns: finalConcHeaders.map((header) => ({
                accessorKey: finalPrefix + header,
                header: header,
                id: finalPrefix + header,
                size: 65,
            })),
            header: "Output Concentrations",
        },
    ];

    const rows = labResults!.map((entry) => ({
        id: entry.name,
        name: entry.name,
        time: String(entry.time),
        ...Object.fromEntries(
            Object.entries(entry.initial_concentrations).map(([key, value]) => [
                initialPrefix + key,
                +Number(value).toPrecision(3),
            ])
        ),
        ...Object.fromEntries(
            Object.entries(entry.final_concentrations).map(([key, value]) => [
                finalPrefix + key,
                +Number(value).toPrecision(3),
            ])
        ),
        meta: {},
    }));

    const handleEnableFilters = () => {
        setEnableFilters(!enableFilters);
    };

    const handleRowClick = (
        row: Row<{
            meta: {};
            id: string;
            name: string;
            time: string;
        }>
    ) => {
        setSelectedRows((prevSelectedRows) =>
            prevSelectedRows[row.id]
                ? Object.fromEntries(Object.entries(prevSelectedRows).filter(([key]) => key !== row.id))
                : { ...prevSelectedRows, [row.id]: row }
        );
    };

    const handlePlotComponentsChange = (changes: AutocompleteChanges<string>) => {
        setPlotComponents(changes.selectedItems);
    };

    return (
        <>
            <Typography variant="h1">Lab results</Typography>
            {issueRetrievingDataInfo}
            <Typography variant="body_short">
                Select rows to compare. Plots will appear at the bottom of the list
            </Typography>
            <div style={{ display: "flex", alignItems: "center" }}>
                <input
                    type="checkbox"
                    checked={enableFilters}
                    onChange={handleEnableFilters}
                    style={{
                        transform: "scale(1.5)",
                        marginBottom: "20px",
                    }}
                />
                <span
                    onClick={handleEnableFilters}
                    style={{ fontSize: "18px", marginLeft: "8px", marginBottom: "17px", cursor: "pointer" }}
                >
                    Enable filters
                </span>
            </div>
            <EdsProvider density="compact">
                <EdsDataGrid
                    columns={columns}
                    rows={rows}
                    enableColumnFiltering={enableFilters}
                    enableMultiRowSelection
                    enableRowSelection
                    onRowClick={handleRowClick}
                    rowSelectionState={{}}
                    rowStyle={(row) => (row.id in selectedRows ? { backgroundColor: "lightblue" } : {})}
                />
            </EdsProvider>
            <Button onClick={() => setSelectedRows({})}>Deselect all</Button>
            {Object.keys(selectedRows).length > 0 && (
                <>
                    <h2>Plot summary</h2>
                    <ResultScatterGraph graphData={rowRecord_to_ScatterGraphData(selectedRows)} />
                    <h2>Plot per component</h2>
                    <div style={{ width: "500px" }}>
                        <Autocomplete
                            label={"Select multiple components"}
                            options={finalConcHeaders}
                            multiple
                            onOptionsChange={handlePlotComponentsChange}
                        />
                    </div>
                    <ResultScatterGraph
                        graphData={graphComponentsAndRowRecord_to_ScatterGraphData(selectedRows, plotComponents)}
                    />
                </>
            )}
        </>
    );
};
export default ResultsPage;
