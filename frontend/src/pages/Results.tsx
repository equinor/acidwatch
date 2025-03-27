import React from "react";
import { Tabs } from "@equinor/eds-core-react";
import { useState } from "react";
import ResultConcPlot from "../components/ConcResultPlot";
import Reactions from "./Reactions";
import { SimulationResults } from "../dto/SimulationResults";
import { useParams } from "react-router-dom";
import { getSimulationResults } from "../api/api";
import ResultConcTable from "../components/ConcResultTable";
import { useQuery } from "@tanstack/react-query";

interface ResultsProps {
    simulationResults?: SimulationResults;
}

const Results: React.FC<ResultsProps> = ({ simulationResults }) => {
    const [activeTab, setActiveTab] = useState(0);
    const { projectId, simulationId } = useParams<{ projectId: string; simulationId: string }>();
    const {
        data: fetchedResults,
        error,
        isLoading,
    } = useQuery<SimulationResults | null>({
        queryKey: [`get-simulation-${projectId}-${simulationId}`],
        queryFn: () => getSimulationResults(projectId!, simulationId!),
        enabled: !!projectId && !!simulationId && !simulationResults,
    });

    const handleChange = (index: number) => {
        setActiveTab(index);
    };

    if (!simulationResults && isLoading) {
        return <div>Loading...</div>;
    }

    if (!simulationResults && error) {
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
                    <Tabs.Panel>
                        <ResultConcPlot simulationResults={simulationResults ? simulationResults : fetchedResults!} />
                        <ResultConcTable
                            initFinalDiff={
                                simulationResults
                                    ? simulationResults.results.initfinaldiff
                                    : fetchedResults!.results.initfinaldiff
                            }
                        />
                    </Tabs.Panel>
                    <Tabs.Panel>
                        <Reactions simulationResults={simulationResults ? simulationResults : fetchedResults!} />
                    </Tabs.Panel>
                    <Tabs.Panel>
                        <div style={{ width: "500px" }}>
                            <pre>
                                {JSON.stringify(simulationResults ? simulationResults : fetchedResults!, null, 2)}
                            </pre>
                        </div>
                    </Tabs.Panel>
                </Tabs.Panels>
            </Tabs>
        </>
    );
};

export default Results;
