import React from "react";
import { Tabs } from "@equinor/eds-core-react";
import { useState } from "react";
import OutputConcentrations from "./OutputConcentrations";
import Reactions from "./Reactions";
import { SimulationResults } from "../dto/SimulationResults";

interface ResultsProps {
    simulationResults: SimulationResults;
}

const Results: React.FC<ResultsProps> = ({ simulationResults }) => {
    const [activeTab, setActiveTab] = useState(0);
    const handleChange = (index: number) => {
        setActiveTab(index);
    };

    return (
        <div>
            <Tabs activeTab={activeTab} onChange={handleChange}>
                <Tabs.List>
                    <Tabs.Tab>Output concentrations</Tabs.Tab>
                    <Tabs.Tab>Reactions</Tabs.Tab>
                    <Tabs.Tab>All data</Tabs.Tab>
                </Tabs.List>
                <Tabs.Panels>
                    <Tabs.Panel>
                        <OutputConcentrations simulationResults={simulationResults} />
                    </Tabs.Panel>
                    <Tabs.Panel>
                        <Reactions simulationResults={simulationResults} />
                    </Tabs.Panel>
                    <Tabs.Panel>
                        <div style={{ width: "500px" }}>
                            <pre>{JSON.stringify(simulationResults, null, 2)}</pre>
                        </div>
                    </Tabs.Panel>
                </Tabs.Panels>
            </Tabs>
        </div>
    );
};

export default Results;
