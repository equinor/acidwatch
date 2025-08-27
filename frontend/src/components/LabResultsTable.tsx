import React from "react";
import { ExperimentResult } from "../dto/ExperimentResult";
import { Button, EdsProvider, Typography } from "@equinor/eds-core-react";
import { EdsDataGrid, Row } from "@equinor/eds-data-grid-react";

interface LabResultsTableProps {
    labResults: ExperimentResult[];
    initialConcHeaders: string[]; 
    finalConcHeaders: string[]; 
    selectedExperiments: string[];
    setSelectedExperiments: React.Dispatch<React.SetStateAction<string[]>>
}

const LabResultsTable: React.FC<LabResultsTableProps> = ({labResults , initialConcHeaders, finalConcHeaders,selectedExperiments, setSelectedExperiments}) => {
    const initialPrefix = "in-";
    const finalPrefix = "out-";
    
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
         <> <Typography variant="body_short">Select rows to compare.</Typography>
            <EdsProvider density="compact">
                <EdsDataGrid
                    columns={columns}
                    rows={rows}
                    enableColumnFiltering={true}
                    enableRowSelection
                    enableMultiRowSelection
                    onRowClick={handleRowClick}
                    rowSelectionState={{}}
                    rowStyle={(row) => (selectedExperiments.includes(row.original.name) ? { backgroundColor: "lightblue" } : {})}
                />
            </EdsProvider>
            <Button onClick={() => setSelectedExperiments([])}>Clear</Button></>
    );
};

export default LabResultsTable;
