import React from "react";
import { ExperimentResult } from "../dto/ExperimentResult";
import { Button, EdsProvider, Typography } from "@equinor/eds-core-react";
import { EdsDataGrid, Row } from "@equinor/eds-data-grid-react";
import { buildLabResultsTableData } from "../functions/Tables";

interface LabResultsTableProps {
    labResults: ExperimentResult[];
    selectedExperiments: ExperimentResult[];
    setSelectedExperiments: React.Dispatch<React.SetStateAction<ExperimentResult[]>>;
}

const LabResultsTable: React.FC<LabResultsTableProps> = ({
    labResults,
    selectedExperiments,
    setSelectedExperiments,
}) => {
    const { columns, rows } = buildLabResultsTableData(labResults);

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
            const alreadySelected = prevSelectedExperiments.some((exp) => exp.name === row.original.name);
            if (alreadySelected) {
                return prevSelectedExperiments.filter((exp) => exp.name !== row.original.name);
            } else {
                const experiment = labResults.find((exp) => exp.name === row.original.name);
                return experiment ? [...prevSelectedExperiments, experiment] : prevSelectedExperiments;
            }
        });
    };

    return (
        <>
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
                        selectedExperiments.some((exp) => exp.name === row.original.name)
                            ? { backgroundColor: "lightblue" }
                            : {}
                    }
                />
            </EdsProvider>
            <Button onClick={() => setSelectedExperiments([])}>Clear</Button>
        </>
    );
};

export default LabResultsTable;
