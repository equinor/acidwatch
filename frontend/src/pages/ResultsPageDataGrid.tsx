import React from "react";
import { EdsDataGrid } from "@equinor/eds-data-grid-react";
import { createColumnHelper } from "@tanstack/react-table";
import { getLabResults } from "../api/api";
import { useQuery } from "@tanstack/react-query";

const ResultsPageDataGrid: React.FC = () => {
    const initialPrefix = "in-";
    const finalPrefix = "out-";
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

    const helper = createColumnHelper<any>();
    
    const columns = [
        helper.accessor("name", { header: "Experiment", size: 150 }),
        helper.accessor("time", { header: "Time", size: 100 }),
        initialConcHeaders.map((header) => helper.accessor(initialPrefix + header, { header: header, size: 65 })),
        finalConcHeaders.map((header) => helper.accessor(finalPrefix + header, { header: header, size: 65 })),
    ].flat();

    const rows = labResults!.map((entry, index) => ({
        id: index,
        name: entry.name,
        time: String(entry.time),
        ...Object.fromEntries(
            Object.entries(entry.initial_concentrations).map(([key, value]) => [
                initialPrefix + key,
                Number(value)
                    .toPrecision(3)
                    .replace(/\.?0+$/, ""),
            ])
        ),
        ...Object.fromEntries(
            Object.entries(entry.final_concentrations).map(([key, value]) => [
                finalPrefix + key,
                Number(value)
                    .toPrecision(3)
                    .replace(/\.?0+$/, ""),
            ])
        ),
    }));

    return <EdsDataGrid columns={columns} rows={rows || []} />;
};
export default ResultsPageDataGrid;
