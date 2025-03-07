import React, { useState } from "react";
import { EdsDataGrid, Row } from "@equinor/eds-data-grid-react";
import { getLabResults } from "../api/api";
import { useQuery } from "@tanstack/react-query";
import ResultScatterGraph from "../components/ResultScatterPlot";
import { rowRecord_to_ScatterGraphData } from "../functions/Formatting";
import { Button } from "@equinor/eds-core-react";

const ResultsPage: React.FC = () => {
    const initialPrefix = "in-";
    const finalPrefix = "out-";
    const [enableFilters, setEnableFilters] = useState<boolean>(false);
    const [selectedRows, setSelectedRows] = useState<Record<string,Row<{
        meta: {};
        id: string;
        name: string;
        time: string;
    }>>>({});
    const {
        data: labResults,
        error,
        isLoading,
    } = useQuery({
        queryKey: ["results"],
        queryFn: () => getLabResults(),
    });

    if (isLoading) {
        return <>Fetching results ...</>;
    }
    if (error) {
        return <>Could not fetch results.</>;
    }

    const initialConcHeaders = Array.from(
        new Set(labResults!.flatMap((entry) => [...Object.keys(entry.initialConcentrations)]))
    );
    const finalConcHeaders = Array.from(
        new Set(labResults!.flatMap((entry) => [...Object.keys(entry.finalConcentrations)]))
    );

    const columns = [
        {
            columns: [
                {
                    header: "Experiment",
                    id: "name",
                    accessorKey: "name",
                    size: 100,
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
        id: entry.experimentName,
        name: entry.experimentName,
        time: String(entry.time),
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
        meta: {}
    }));

    const handleEnableFilters = () => {
        setEnableFilters(!enableFilters);
    };

    const handleRowClick = (row:Row<{
        meta: {};
        id: string;
        name: string;
        time: string;
    }>) => {
        setSelectedRows(prevSelectedRows => {
            const newSelectedRows = { ...prevSelectedRows };
            if (newSelectedRows[row.id]) {
                delete newSelectedRows[row.id];
            } else {
                newSelectedRows[row.id] = row;
            }
            return newSelectedRows;
        });
    }

    return (
        <>
            <h1>Results</h1>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                    type="checkbox"
                    checked={enableFilters}
                    onChange={handleEnableFilters}
                    style={{
                        transform: 'scale(1.5)',
                        marginBottom: '20px'
                    }}
                />
                <span 
                    onClick={handleEnableFilters} 
                    style={{ fontSize: '18px', marginLeft: '8px', marginBottom: "17px", cursor: 'pointer' }}
                >
                    Enable filters
                </span>
            </div>
            <EdsDataGrid 
                columns={columns} 
                rows={rows} 
                enableColumnFiltering={enableFilters} 
                enableMultiRowSelection
                enableRowSelection
                onRowClick={handleRowClick}
                rowSelectionState={{}} 
                rowStyle={(row) => row.id in selectedRows ? {backgroundColor: "lightblue"} : {}} />
            <Button onClick={() => setSelectedRows({})}>Deselect all</Button>
            {Object.keys(selectedRows).length > 0 && <ResultScatterGraph graphData={rowRecord_to_ScatterGraphData(selectedRows)} />}
        </>
    )
};
export default ResultsPage;
