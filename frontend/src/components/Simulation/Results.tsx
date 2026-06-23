import React from "react";
import { Accordion, Tabs, Typography } from "@equinor/eds-core-react";
import { useState } from "react";
import { Panel, SimulationResults } from "@/dto/SimulationResults";
import PhaseResultTable from "@/components/Simulation/PhaseResultTable";
import Reactions from "../../pages/Reactions";
import { MassBalanceError } from "@/components/Simulation/MassBalanceError";
import { extractPlotData } from "@/functions/Formatting";
import BarChart from "@/components/BarChart";
import GenericTable from "@/components/GenericTable";
import { useAvailableModels } from "@/contexts/ModelContext";
import { buildModelSections } from "@/utils/modelUtils";

interface ResultsProps {
    simulationResults?: SimulationResults;
}

function getPanelName(panel: Panel): string {
    if (panel.label) return panel.label;

    switch (panel.type) {
        case "text":
            return "Text";

        case "json":
            return "JSON";

        case "reaction_paths":
            return "Reactions";

        case "table":
            return panel.label ?? "Table data";

        default:
            return "(Unknown panel)";
    }
}

function getPanelContent(panel: Panel): React.ReactElement {
    switch (panel.type) {
        case "text":
            return <pre>{panel.data}</pre>;

        case "json":
            return <pre>{JSON.stringify(panel.data, null, 2)}</pre>;

        case "reaction_paths":
            return <Reactions commonPaths={panel.common_paths} reactions={panel.stats} />;

        case "table":
            return <GenericTable data={panel.data} />;

        default:
            return <Typography color="red">Unknown panel type</Typography>;
    }
}

interface ModelResultTabsProps {
    simulationResults: SimulationResults;
    modelIndices: number[];
}

const ModelResultTabs: React.FC<ModelResultTabsProps> = ({ simulationResults, modelIndices }) => {
    const [activeTab, setActiveTab] = useState<string | number>(0);

    const panelTabs: string[] = [];
    const panelContents: React.ReactElement[] = [];

    for (const modelIndex of modelIndices) {
        const result = simulationResults.results[modelIndex];
        const modelId = simulationResults.input.models[modelIndex]?.modelId || `Model ${modelIndex + 1}`;
        const modelPrefix = modelIndices.length > 1 ? `${modelId}: ` : "";
        const initialConcentrations = simulationResults.input.concentrations;

        const phasesWithConcentrations = result.phases.filter((phase) => Object.keys(phase.concentrations).length > 0);

        if (phasesWithConcentrations.length > 0) {
            panelTabs.push(`${modelPrefix}Phases`);

            panelContents.push(
                <Tabs.Panel key={`phases-${modelIndex}`}>
                    <MassBalanceError
                        initialPhases={[{ kind: "aqueous", fraction: 1, concentrations: initialConcentrations }]}
                        finalPhases={result.phases}
                    />

                    <BarChart
                        aspectRatio={2}
                        graphData={extractPlotData(initialConcentrations, phasesWithConcentrations)}
                        xLabel="Components"
                        yLabel="Concentration (ppm)"
                    />

                    <PhaseResultTable initialConcentrations={initialConcentrations} phases={phasesWithConcentrations} />
                </Tabs.Panel>
            );
        }

        for (const panel of result.panels) {
            panelTabs.push(`${modelPrefix}${getPanelName(panel)}`);
            panelContents.push(
                <Tabs.Panel key={`panel-${modelIndex}-${panelTabs.length}`}>{getPanelContent(panel)}</Tabs.Panel>
            );
        }
    }

    if (panelTabs.length === 0) return null;

    return (
        <Tabs activeTab={activeTab} onChange={(index) => setActiveTab(index)}>
            <Tabs.List>
                {panelTabs.map((label, index) => (
                    <Tabs.Tab key={index}>{label}</Tabs.Tab>
                ))}
            </Tabs.List>
            <Tabs.Panels>
                {panelContents.map((content, index) => (
                    <Tabs.Panel key={index}>{content}</Tabs.Panel>
                ))}
            </Tabs.Panels>
        </Tabs>
    );
};

const Results: React.FC<ResultsProps> = ({ simulationResults }) => {
    const { models } = useAvailableModels();

    if (!simulationResults) return <Typography color="red">No simulation results found</Typography>;

    const sections = buildModelSections(simulationResults.input.models, models);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {sections.map((section, i) => (
                <Accordion key={section.category}>
                    <Accordion.Item isExpanded={i === sections.length - 1}>
                        <Accordion.Header>{`${section.category}: ${section.modelNames.join(", ")}`}</Accordion.Header>
                        <Accordion.Panel>
                            <ModelResultTabs simulationResults={simulationResults} modelIndices={section.indices} />
                        </Accordion.Panel>
                    </Accordion.Item>
                </Accordion>
            ))}

            <Accordion>
                <Accordion.Item isExpanded={false}>
                    <Accordion.Header>Raw JSON</Accordion.Header>
                    <Accordion.Panel>
                        <pre style={{ maxWidth: "500px", overflow: "auto" }}>
                            {JSON.stringify(simulationResults, null, 2)}
                        </pre>
                    </Accordion.Panel>
                </Accordion.Item>
            </Accordion>
        </div>
    );
};

export default Results;
