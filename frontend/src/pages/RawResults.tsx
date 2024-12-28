import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getSimulationResults } from "../api/api";
import { SimulationResults } from "../dto/SimulationResults";

const RawResults: React.FC = () => {
    const { projectId, simulationId } = useParams<{ projectId: string; simulationId: string }>();
    const [results, setResults] = useState<SimulationResults | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
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
    }, [projectId, simulationId]);

    return (
        <div>
            <h3>Raw Results</h3>
            {loading && <p>Loading results...</p>}
            {error && <p>Error: {error}</p>}
            {results && <pre>{JSON.stringify(results, null, 2)}</pre>}
        </div>
    );
};

export default RawResults;
