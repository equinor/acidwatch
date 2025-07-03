import React from "react";
import { Tabs } from "@equinor/eds-core-react";
import { useState } from "react";
import ResultConcPlot from "../components/ConcResultPlot";
import Reactions from "./Reactions";
import { SimulationResults } from "../dto/SimulationResults";
import { getSimulationResults } from "../api/api";
import ResultConcTable from "../components/ConcResultTable";
import { useQuery } from "@tanstack/react-query";

const Results: React.FC<{ resultId: string }> = ({ resultId }) => {
    const [activeTab, setActiveTab] = useState(0);
    const {
        data: simulationResults,
        error,
        isLoading,
    } = useQuery<SimulationResults>({
        queryKey: [`result-${resultId}`],
        queryFn: () => getSimulationResults(resultId),
        retry: true,
    });

    const handleChange = (index: number) => {
        setActiveTab(index);
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (error || simulationResults === undefined) {
        return <div>Error: Could not fetch projects</div>;
    }

    return (
        <>
            <Tabs activeTab={activeTab} onChange={handleChange}>
                <Tabs.List>
                    <Tabs.Tab>Output concentrations</Tabs.Tab>
                    <Tabs.Tab>Reactions</Tabs.Tab>
                    <Tabs.Tab>All data</Tabs.Tab>
                </Tabs.List>
                <Tabs.Panels>
                    {/* <Tabs.Panel>
                        <ResultConcPlot simulationResults={simulationResults} />
                        <ResultConcTable
                            initFinalDiff={
                                simulationResults.results.initfinaldiff
                            }
                        />
                    </Tabs.Panel>
                    <Tabs.Panel>
                        <Reactions simulationResults={simulationResults} />
                    </Tabs.Panel> */}
                    <Tabs.Panel>
                        <div style={{ width: "500px" }}>
                            <pre>
                                {simulationResults}
                            </pre>
                        </div>
                    </Tabs.Panel>
                </Tabs.Panels>
            </Tabs>
        </>
    );
};

export default Results;
