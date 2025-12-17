import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getLabResults } from "@/api/api";
import { syntheticResults } from "@/assets/syntheticResults";
import { Button, Card, Checkbox, Typography } from "@equinor/eds-core-react";
import { useAvailableModels } from "@/contexts/ModelContext";
import LabResultsPlot from "@/components/LabResultsPlot";
import LabResultsTable from "@/components/LabResultsTable";
import { ExperimentResult } from "@/dto/ExperimentResult.tsx";
import { useSimulationQueries } from "@/hooks/useSimulationQueriesResult.ts";
import DownloadButton from "@/components/DownloadButton.tsx";
import {
    convertExperimentResultsToTabulatedData,
    convertSimulationQueriesResultToTabulatedData,
    convertTabulatedDataToCSVFormat,
} from "@/functions/Formatting";
import { ModelConfig } from "@/dto/FormConfig";
import Statuses from "@/components/Statuses";
import { SimulationResults } from "@/dto/SimulationResults";

const defaultModels = (models: ModelConfig[]) => new Set(models.map((m) => m.modelId));

const LabResults: React.FC = () => {
    const [selectedExperiments, setSelectedExperiments] = useState<ExperimentResult[]>([]);
    const { models } = useAvailableModels();
    const [selectedModels, setSelectedModels] = useState<Set<string>>(() => defaultModels(models));

    useEffect(() => {
        if (models.length > 0 && selectedModels.size === 0) {
            setSelectedModels(defaultModels(models));
        }
    }, [models]);

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

    const { startExperiment, statuses } = useSimulationQueries();

    const onSetSelectedExperiments = (selected: ExperimentResult[]) => {
        for (const experiment of selected) {
            for (const modelId of selectedModels) {
                startExperiment(experiment, modelId);
            }
        }
        setSelectedExperiments(selected);
    };

    const onModelToggle = (modelId: string, checked: boolean) => {
        setSelectedModels((prev) => {
            const next = new Set(prev);
            if (checked) {
                next.add(modelId);
            } else {
                next.delete(modelId);
            }
            return next;
        });
    };

    const toggleAllModels = () => {
        if (selectedModels.size === 0) {
            setSelectedModels(defaultModels(models));
        } else {
            setSelectedModels(new Set());
        }
    };

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

    const simulationsPerExperiment: Record<string, SimulationResults[]> = {};
    for (const [key, status] of Object.entries(statuses)) {
        if (!status.result) continue;
        const sim = key.split(":")[0];
        (simulationsPerExperiment[sim] ??= []).push(status.result);
    }

    return (
        <>
            <Typography variant="h1">Lab results</Typography>
            {issueRetrievingDataInfo}

            <Card variant="default" style={{ margin: "1rem 0" }}>
                <Card.Header>
                    <Card.HeaderTitle>
                        <Typography variant="h5">Simulate using these models</Typography>
                    </Card.HeaderTitle>
                    <Button onClick={toggleAllModels}>
                        {selectedModels.size === 0 ? "Select all" : "Deselect all"}
                    </Button>
                </Card.Header>
                <Card.Content>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
                        {models.map((model) => (
                            <Checkbox
                                key={model.modelId}
                                label={model.displayName}
                                checked={selectedModels.has(model.modelId)}
                                onChange={(e) => onModelToggle(model.modelId, e.target.checked)}
                                disabled={model.accessError !== null}
                            />
                        ))}
                    </div>
                </Card.Content>
            </Card>

            <Statuses statuses={statuses} />

            <LabResultsPlot
                selectedExperiments={selectedExperiments}
                simulationsPerExperiment={simulationsPerExperiment}
            />

            {selectedExperiments.length > 0 && (
                <div
                    style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        marginTop: "1rem",
                        marginBottom: "2rem",
                    }}
                >
                    <DownloadButton
                        csvContent={convertTabulatedDataToCSVFormat([
                            ...convertSimulationQueriesResultToTabulatedData(simulationsPerExperiment),
                            ...convertExperimentResultsToTabulatedData(selectedExperiments),
                        ])}
                        fileName={`AcidWatch-LabResults-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`}
                        isLoading={isLoading || Object.values(statuses).some((status) => status.status === "pending")}
                    />
                </div>
            )}
            <LabResultsTable
                labResults={labResults}
                selectedExperiments={selectedExperimentData}
                setSelectedExperiments={onSetSelectedExperiments}
            />
        </>
    );
};

export default LabResults;
