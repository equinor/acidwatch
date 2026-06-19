import React from "react";
import { Tabs, Typography } from "@equinor/eds-core-react";
import { useState } from "react";
import { Panel, SimulationResults } from "@/dto/SimulationResults";
import ResultConcTable from "@/components/Simulation/ConcResultTable";
import Reactions from "../../pages/Reactions";
import { MassBalanceError } from "@/components/Simulation/MassBalanceError";
import { extractPlotData, formatPhaseFraction } from "@/functions/Formatting";
import BarChart from "@/components/BarChart";
import GenericTable from "@/components/GenericTable";

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

const Results: React.FC<ResultsProps> = ({ simulationResults }) => {
    const [activeTab, setActiveTab] = useState<string | number>(0);

    const handleChange = (index: string | number) => {
        setActiveTab(index);
    };

    if (!simulationResults) return <Typography color="red">No simulation results found</Typography>;

    const panelTabs: string[] = [];
    const panelContents: React.ReactElement[] = [];

    simulationResults.results.forEach((result, modelIndex) => {
        const modelId = simulationResults.input.models[modelIndex]?.modelId || `Model ${modelIndex + 1}`;
        const modelPrefix = simulationResults.results.length > 1 ? `${modelId}: ` : "";

        for (const phase of result.phases) {
            const hasConcentrations = Object.keys(phase.concentrations).length > 0;
            if (!hasConcentrations) continue;

            panelTabs.push(`${modelPrefix}${phase.kind} (${formatPhaseFraction(phase.fraction)})`);

            const initialConcentrations = simulationResults.input.concentrations;

            panelContents.push(
                <Tabs.Panel key={`phase-${modelIndex}-${phase.kind}`}>
                    <MassBalanceError
                        initialPhases={[{ kind: "aqueous", fraction: 1, concentrations: initialConcentrations }]}
                        finalPhases={result.phases}
                    />

                    <BarChart
                        aspectRatio={2}
                        graphData={extractPlotData({
                            ...simulationResults,
                            results: [{ phases: [phase], panels: [] }],
                            input: {
                                ...simulationResults.input,
                                concentrations: initialConcentrations,
                            },
                        })}
                        xLabel="Components"
                        yLabel="Concentration (ppm)"
                    />

                    <ResultConcTable
                        initialConcentrations={initialConcentrations}
                        finalConcentrations={phase.concentrations}
                    />
                </Tabs.Panel>
            );
        }

        for (const panel of result.panels) {
            panelTabs.push(`${modelPrefix}${getPanelName(panel)}`);
            panelContents.push(
                <Tabs.Panel key={`panel-${modelIndex}-${panelTabs.length}`}>{getPanelContent(panel)}</Tabs.Panel>
            );
        }
    });

    return (
        <>
            <Tabs activeTab={activeTab} onChange={handleChange}>
                <Tabs.List>
                    {panelTabs.map((label, index) => (
                        <Tabs.Tab key={index}>{label}</Tabs.Tab>
                    ))}
                    <Tabs.Tab>Raw JSON</Tabs.Tab>
                </Tabs.List>
                <Tabs.Panels>
                    {panelContents.map((content, index) => (
                        <Tabs.Panel key={index}>{content}</Tabs.Panel>
                    ))}
                    <Tabs.Panel>
                        <div style={{ width: "500px" }}>
                            <pre>{JSON.stringify(simulationResults, null, 2)}</pre>
                        </div>
                    </Tabs.Panel>
                </Tabs.Panels>
            </Tabs>
        </>
    );
};

export default Results;
