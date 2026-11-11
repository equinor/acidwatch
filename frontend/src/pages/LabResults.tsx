import "./LabResults.css";
import React, { useEffect, useState } from "react";
import { Tabs } from "@equinor/eds-core-react";
import { useAvailableModels } from "@/contexts/ModelContext";
import LabResultsChart from "@/components/LabResults/LabResultsChart";
import ParityCharts from "@/components/LabResults/ParityCharts";
import LabResultsTable from "@/components/LabResults/LabResultsTable";
import { ExperimentResult } from "@/dto/ExperimentResult.tsx";
import { useSimulationQueries } from "@/hooks/useSimulationQueriesResult.ts";
import { ModelConfig } from "@/dto/FormConfig";
import Statuses from "@/components/Statuses";
import { SimulationResults } from "@/dto/SimulationResults";
import styled from "styled-components";
import { useSources } from "@/components/LabResults/sources";
import { SourceSelect } from "@/components/LabResults/SourceSelect";

const defaultModels = (models: ModelConfig[]) =>
    new Set(models.filter((m) => m.category === "ChemicalEquilibrium").map((m) => m));

const LabResultsGrid = styled.div`
    @media screen and (min-width: 968px) {
        display: grid;
        grid-template-columns: 368px 1fr;
    }

    height: 100%;
`;

const Aside = styled.aside`
    margin: 0 8px;
`;

const Main = styled.div`
    overflow: hidden;
    height: 100%;

    @media screen and (min-width: 968px) {
        margin: 0 16px;
    }
`;

const LabResults: React.FC = () => {
    const [selectedExperiments, setSelectedExperiments] = useState<ExperimentResult[]>([]);
    const { models } = useAvailableModels();
    const [selectedModels, setSelectedModels] = useState(() => defaultModels(models));
    const [activeTab, setActiveTab] = useState<number | string>(0);
    const { combined: labResults } = useSources();

    useEffect(() => {
        if (models.length > 0 && selectedModels.size === 0) {
            setSelectedModels(defaultModels(models));
        }
    }, [models]);

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
        setActiveTab(1);
    };

    const simulationsPerExperiment: Record<string, SimulationResults[]> = {};
    for (const [key, status] of Object.entries(statuses)) {
        if (!status.result) continue;
        const sim = key.split(":")[0];
        (simulationsPerExperiment[sim] ??= []).push(status.result);
    }

    return (
        <main style={{ height: "100%" }}>
            <LabResultsGrid>
                <Aside>
                    <h1>Lab results</h1>
                    <SourceSelect />
                </Aside>
                <Main>
                    <Tabs
                        variant="fullWidth"
                        activeTab={activeTab}
                        onChange={setActiveTab}
                        style={{ height: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}
                    >
                        <Tabs.List>
                            <Tabs.Tab>Table</Tabs.Tab>
                            <Tabs.Tab>Simulation results ({selectedExperiments.length})</Tabs.Tab>
                        </Tabs.List>
                        <Tabs.Panels style={{ flex: 1, minHeight: 0 }}>
                            <Tabs.Panel style={{ height: "100%", padding: 0 }}>
                                <LabResultsTable
                                    labResults={labResults}
                                    onStart={onSetSelectedExperiments}
                                    selectedModels={selectedModels}
                                    setSelectedModels={setSelectedModels}
                                />
                            </Tabs.Panel>
                            <Tabs.Panel
                                style={{
                                    height: "100%",
                                    overflow: "auto",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "2rem",
                                }}
                            >
                                <Statuses statuses={statuses} />
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
                </Main>
            </LabResultsGrid>
        </main>
    );
};

export default LabResults;
