import "./LabResults.css";
import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getLabResults } from "@/api/api";
import { experiments } from "@/assets/sm_ampp";
import { paperResults } from "@/assets/morland2019acid.ts";
import { Card, Tabs } from "@equinor/eds-core-react";
import { useAvailableModels } from "@/contexts/ModelContext";
import LabResultsChart from "@/components/LabResults/LabResultsChart";
import ParityCharts from "@/components/LabResults/ParityCharts";
import LabResultsTable from "@/components/LabResults/LabResultsTable";
import { ExperimentResult } from "@/dto/ExperimentResult.tsx";
import { useSimulationQueries } from "@/hooks/useSimulationQueriesResult.ts";
import { ModelConfig } from "@/dto/FormConfig";
import Statuses from "@/components/Statuses";
import { SimulationResults } from "@/dto/SimulationResults";

const defaultModels = (models: ModelConfig[]) =>
    new Set(models.filter((m) => m.category === "ChemicalEquilibrium").map((m) => m));

const LabResults: React.FC = () => {
    const [selectedExperiments, setSelectedExperiments] = useState<ExperimentResult[]>([]);
    const { models } = useAvailableModels();
    const [selectedModels, setSelectedModels] = useState(() => defaultModels(models));
    const [activeTab, setActiveTab] = useState<number | string>(0);

    useEffect(() => {
        if (models.length > 0 && selectedModels.size === 0) {
            setSelectedModels(defaultModels(models));
        }
    }, [models]);

    const {
        data: labResults = [...experiments, ...paperResults],
        error,
        isLoading,
    } = useQuery({
        queryKey: ["results"],
        queryFn: () => getLabResults(),
        retry: false,
    });

    const selectedExperimentData = labResults.filter((result) =>
        selectedExperiments.some((exp) => exp.name === result.name)
    );

    const availableComponents = Array.from(
        new Set(selectedExperimentData.flatMap((exp) => Object.keys(exp.finalConcentrations)))
    ).sort();

    const { startExperiment, statuses } = useSimulationQueries();

    const onSetSelectedExperiments = (selected: ExperimentResult[]) => {
        for (const experiment of selected) {
            for (const model of selectedModels) {
                startExperiment(experiment, model.modelId);
            }
        }
        setSelectedExperiments(selected);
    };

    if (isLoading) return <>Fetching results ...</>;

    let issueRetrievingDataInfo = null;

    if (error) {
        issueRetrievingDataInfo = (
            <Card variant="info" style={{ margin: "2rem 0" }}>
                <Card.Header>
                    <Card.HeaderTitle>
                        <h4 style={{ margin: "0" }}>Please sign in with Equinor account to see internal results.</h4>
                    </Card.HeaderTitle>
                </Card.Header>
                <Card.Content>
                    <p>
                        The laboratory results from paper "Acid reactions in hub systems consisting of separate
                        non-reactive CO2 transport lines" by Morland et al., 2019, and the laboratory results from paper
                        "Impurity reactions in CO2 streams with low sulphur content" by Hesjevik et al., 2026, are
                        available below.
                    </p>
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
        <main style={{ height: "100%" }}>
            <div className="LabResults-grid">
                <div style={{ margin: "0 8px", height: "100%" }}>
                    {issueRetrievingDataInfo}

                    <Statuses statuses={statuses} />
                </div>
                <div style={{ margin: "0 16px", overflowX: "auto", height: "100%" }}>
                    <Tabs variant="fullWidth" activeTab={activeTab} onChange={setActiveTab}>
                        <Tabs.List>
                            <Tabs.Tab>Table</Tabs.Tab>
                            <Tabs.Tab>Simulation results ({selectedExperiments.length})</Tabs.Tab>
                        </Tabs.List>
                        <Tabs.Panels>
                            <Tabs.Panel>
                                <LabResultsTable
                                    labResults={labResults}
                                    onStart={onSetSelectedExperiments}
                                    selectedModels={selectedModels}
                                    setSelectedModels={setSelectedModels}
                                />
                            </Tabs.Panel>
                            <Tabs.Panel>
                                <LabResultsChart
                                    selectedExperiments={selectedExperiments}
                                    simulationsPerExperiment={simulationsPerExperiment}
                                />

                                <ParityCharts
                                    availableComponents={availableComponents}
                                    experiments={selectedExperimentData}
                                    simulationsPerExperiment={simulationsPerExperiment}
                                />
                            </Tabs.Panel>
                        </Tabs.Panels>
                    </Tabs>
                </div>
            </div>
        </main>
    );
};

export default LabResults;
