import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { EdsDataGrid, Row } from "@equinor/eds-data-grid-react";
import { getLabResults } from "../api/api.tsx";
import { syntheticResults } from "../assets/syntheticResults.tsx";
import { Button, Card, EdsProvider, Typography } from "@equinor/eds-core-react";
import LabResultsPlot from "../components/LabResultsPlot";

const LabResults: React.FC = () => {
    const initialPrefix = "in-";
    const finalPrefix = "out-";
    const [selectedExperiments, setSelectedExperiments] = useState<string[]>([]);

    // Fetch lab results
    const {
        data: labResults = syntheticResults,
        error,
        isLoading,
    } = useQuery({
        queryKey: ["results"],
        queryFn: () => getLabResults(),
        retry: false,
    });

    // Create row selection state for the data grid
    const rowSelectionState = useMemo(() => {
        return selectedExperiments.reduce((acc, experimentId) => {
            acc[experimentId] = true;
            return acc;
        }, {} as Record<string, boolean>);
    }, [selectedExperiments]);

    // Loading state
    if (isLoading) return <>Fetching results ...</>;

    // Error handling for lab results
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
                    <Typography variant="body_short">Using synthetic demo data</Typography>
                </Card.Content>
            </Card>
        );
    }

    const initialConcHeaders = Array.from(
        new Set(labResults.flatMap((entry) => [...Object.keys(entry.initialConcentrations)]))
    );
    const finalConcHeaders = Array.from(
        new Set(labResults.flatMap((entry) => [...Object.keys(entry.finalConcentrations)]))
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
                {
                    header: "Temperature (°C)",
                    id: "temperature",
                    accessorKey: "temperature",
                    size: 475,
                },
                {
                    header: "Pressure",
                    id: "pressure",
                    accessorKey: "pressure",
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
        temperature: entry.temperature,
        pressure: entry.pressure,
        ...Object.fromEntries(
            Object.entries(entry.initialConcentrations).map(([key, value]) => [
                initialPrefix + key,
                +Number(value).toPrecision(3),
            ])
        ),
        ...Object.fromEntries(
            Object.entries(entry.finalConcentrations).map(([key, value]) => [
                finalPrefix + key,
                +Number(value).toPrecision(3),
            ])
        ),
        meta: {},
    }));

    const handleRowClick = (
        row: Row<{
            meta: object;
            id: string;
            name: string;
            time: string;
            temperature: number | null;
            pressure: number | null;
        }>
    ) => {
        setSelectedExperiments((prevSelectedExperiments) => {
            return prevSelectedExperiments.includes(row.original.name)
                ? prevSelectedExperiments.filter((key) => key !== row.original.name)
                : [...prevSelectedExperiments, row.original.name];
        });
    };

    return (
        <>
            <Typography variant="h1">Lab results</Typography>
            {issueRetrievingDataInfo}

            <LabResultsPlot 
                selectedExperiments={selectedExperiments}
                labResults={labResults}
                finalConcHeaders={finalConcHeaders}
            />

            {/* Data Table */}
            <Typography variant="body_short">Select rows to compare.</Typography>
            <EdsProvider density="compact">
                <EdsDataGrid
                    columns={columns}
                    rows={rows}
                    enableColumnFiltering={true}
                    enableRowSelection
                    enableMultiRowSelection
                    onRowClick={handleRowClick}
                    rowSelectionState={{}}
                    rowStyle={(row) =>
                        selectedExperiments.includes(row.original.name) ? { backgroundColor: "lightblue" } : {}
                    }
                />
            </EdsProvider>
            <Button onClick={() => setSelectedExperiments([])}>Clear</Button>
        </>
    );
};

export default LabResults;
