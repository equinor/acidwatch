import React, { useEffect } from "react";
import { Tabs } from "@equinor/eds-core-react";
import { useState } from "react";
import ResultConcPlot from "../components/ConcResultPlot";
import Reactions from "./Reactions";
import { SimulationResults } from "../dto/SimulationResults";
import { useParams } from "react-router-dom";
import { getSimulationResults } from "../api/api";
import ResultConcTable from "../components/ConcResultTable";

interface ResultsProps {
    simulationResults?: SimulationResults;
}

const Results: React.FC<ResultsProps> = ({ simulationResults }) => {
    const { projectId, simulationId } = useParams<{ projectId: string; simulationId: string }>();
    const [results, setResults] = useState<SimulationResults | null>(simulationResults || null);
    const [loading, setLoading] = useState<boolean>(!simulationResults);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState(0);
    const handleChange = (index: number) => {
        setActiveTab(index);
    };

    useEffect(() => {
        if (!simulationResults) {
            console.log("Fetching results");
            const fetchResults = async () => {
                try {
                    const data = await getSimulationResults(projectId!, simulationId!);
                    setResults(data);
                } catch (error) {
                    setError(String(error));
                } finally {
                    setLoading(false);
                }
            };
            fetchResults();
        }
    }, [projectId, simulationId, simulationResults]);

    if (loading) {
        return <div>Loading...</div>;
    }
    if (error) {
        return <div>Error: {error}</div>;
    }
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
                        <ResultConcPlot simulationResults={results!} />
                        <ResultConcTable initFinalDiff={results!.results.initfinaldiff} />
                    </Tabs.Panel>
                    <Tabs.Panel>
                        <Reactions simulationResults={results!} />
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
