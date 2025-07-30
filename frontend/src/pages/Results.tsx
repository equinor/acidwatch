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

    // Helper to get the current results object
    const currentResults = simulationResults ? simulationResults : fetchedResults!;
    // Only show the table for solubilityccs (when table_data is present)
    const isSolubilityCCS = Boolean(currentResults.table_data);

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
                        {isSolubilityCCS ? (
                            <div style={{ marginTop: 24 }}>
                                <h4>Solubility Table</h4>
                                <pre style={{ background: '#f4f4f4', padding: 12, borderRadius: 4, overflowX: 'auto' }}>{currentResults.table_data}</pre>
                            </div>
                        ) : (
                            <>
                                <ResultConcPlot simulationResults={currentResults} />
                                <ResultConcTable initFinalDiff={currentResults.results.initfinaldiff} />
                            </>
                        )}
                    </Tabs.Panel>
                    <Tabs.Panel>
                        <Reactions simulationResults={currentResults} />
                    </Tabs.Panel>
                    <Tabs.Panel>
                        <div style={{ width: "500px" }}>
                            <pre>
                                {JSON.stringify(currentResults, null, 2)}
                            </pre>
                        </div>
                    </Tabs.Panel>
                </Tabs.Panels>
            </Tabs>
        </>
    );
};

export default Results;
