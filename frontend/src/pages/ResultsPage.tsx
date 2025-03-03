import React, { useState } from "react";
import { EdsDataGrid } from "@equinor/eds-data-grid-react";
import { getLabResults } from "../api/api";
import { useQuery } from "@tanstack/react-query";

const ResultsPage: React.FC = () => {
    const initialPrefix = "in-";
    const finalPrefix = "out-";
    const [enableFilters, setEnableFilters] = useState(false);
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
        new Set(labResults!.flatMap((entry) => [...Object.keys(entry.initial_concentrations)]))
    );
    const finalConcHeaders = Array.from(
        new Set(labResults!.flatMap((entry) => [...Object.keys(entry.final_concentrations)]))
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
    }));

    const handleEnableFilters = () => {
        setEnableFilters(!enableFilters);
    };

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
            <EdsDataGrid columns={columns} rows={rows} enableColumnFiltering={enableFilters} />;
        </>
    )
};
export default ResultsPage;
