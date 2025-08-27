import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getLabResults } from "../api/api.tsx";
import { syntheticResults } from "../assets/syntheticResults.tsx";
import { Card, Typography } from "@equinor/eds-core-react";
import LabResultsPlot from "../components/LabResultsPlot";
import LabResultsTable from "../components/LabResultsTable";

const LabResults: React.FC = () => {
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

    return (
        <>
            <Typography variant="h1">Lab results</Typography>
            {issueRetrievingDataInfo}

            <LabResultsPlot 
                selectedExperiments={selectedExperiments}
                labResults={labResults}
                finalConcHeaders={finalConcHeaders}
            />

            <LabResultsTable labResults={labResults}
            initialConcHeaders={initialConcHeaders}
            finalConcHeaders={finalConcHeaders}
            selectedExperiments={selectedExperiments}
            setSelectedExperiments={setSelectedExperiments} />
            
        </>
    );
};

export default LabResults;
