import React from "react";
import { Tabs, Typography } from "@equinor/eds-core-react";
import { useState } from "react";
import ResultConcPlot from "../components/ConcResultPlot";
import { Panel, SimulationResults } from "../dto/SimulationResults";
import ResultConcTable from "../components/ConcResultTable";
import Reactions from "./Reactions";

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

        default:
            return <Typography color="red">Unknown panel type</Typography>;
    }
}

const Results: React.FC<ResultsProps> = ({ simulationResults }) => {
    const [activeTab, setActiveTab] = useState(0);

    const handleChange = (index: number) => {
        setActiveTab(index);
    };
    if (!simulationResults) return;

    const hasConcentrations = Object.keys(simulationResults.finalConcentrations).length > 0;

    return (
        <>
            <Tabs activeTab={activeTab} onChange={handleChange}>
                <Tabs.List>
                    {hasConcentrations ? <Tabs.Tab>Output concentrations</Tabs.Tab> : <></>}
                    {simulationResults.panels.map((panel, index) => (
                        <Tabs.Tab key={index}>{getPanelName(panel)}</Tabs.Tab>
                    ))}
                    <Tabs.Tab>Raw JSON</Tabs.Tab>
                </Tabs.List>
                <Tabs.Panels>
                    {hasConcentrations ? (
                        <Tabs.Panel>
                            <ResultConcPlot simulationResults={simulationResults} />
                            <ResultConcTable
                                initialConcentrations={simulationResults.initialConcentrations}
                                finalConcentrations={simulationResults.finalConcentrations}
                            />
                        </Tabs.Panel>
                    ) : (
                        <></>
                    )}
                    {simulationResults.panels.map((panel, index) => (
                        <Tabs.Panel key={index}>{getPanelContent(panel)}</Tabs.Panel>
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
