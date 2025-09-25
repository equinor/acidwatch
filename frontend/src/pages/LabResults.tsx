import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getLabResults } from "../api/api.tsx";
import { syntheticResults } from "../assets/syntheticResults.tsx";
import { Card, Typography } from "@equinor/eds-core-react";
import LabResultsPlot from "../components/LabResultsPlot";
import LabResultsTable from "../components/LabResultsTable";
import { ExperimentResult } from "../dto/ExperimentResult.tsx";
import { useSimulationQueries } from "../hooks/useSimulationQueriesResult.ts";
import { convertSimulationsToChartData } from "../functions/Formatting.tsx";

const LabResults: React.FC = () => {
    const [selectedExperiments, setSelectedExperiments] = useState<ExperimentResult[]>([]);

    const {
        data: labResults = syntheticResults,
        error,
        isLoading,
    } = useQuery({
        queryKey: ["results"],
        queryFn: () => getLabResults(),
        retry: false,
    });

    const selectedExperimentData = useMemo(
        () => labResults.filter((result) => selectedExperiments.some((exp) => exp.name === result.name)),
        [labResults, selectedExperiments]
    );

    const simulationQueryResults = useSimulationQueries(selectedExperiments);

    const simulationChartData = useMemo(
        () =>
            convertSimulationsToChartData(
                simulationQueryResults.data,
                simulationQueryResults.experiments.map((exp: ExperimentResult) => exp.name)
            ),
        [simulationQueryResults.data, simulationQueryResults.experiments]
    );

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

    return (
        <>
            <Typography variant="h1">Lab results</Typography>
            {issueRetrievingDataInfo}

            <LabResultsPlot
                selectedExperiments={selectedExperiments}
                simulationQueries={simulationChartData}
                isLoading={simulationQueryResults.isLoading}
            />

            <LabResultsTable
                labResults={labResults}
                selectedExperiments={selectedExperimentData}
                setSelectedExperiments={setSelectedExperiments}
            />
        </>
    );
};

export default LabResults;
