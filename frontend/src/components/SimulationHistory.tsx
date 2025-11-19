import React, { useEffect, useState } from "react";
import { Button, Typography } from "@equinor/eds-core-react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";

const STORAGE_KEY = "simulationHistory";

export interface SimulationHistoryItem {
    simulationId: string;
    displayName: string;
    date: Date;
}

const HistoryContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 16px;
`;

const HistoryButton = styled(Button)`
    justify-content: flex-start;
    text-align: left;
`;

export const saveSimulationToHistory = (simulationId: string, displayName: string) => {
    const history = getSimulationHistory();
    const newItem: SimulationHistoryItem = {
        simulationId,
        displayName,
        date: new Date(),
    };

    // Add to beginning of array (most recent first)
    const updatedHistory = [newItem, ...history.filter((item) => item.simulationId !== simulationId)];

    // Keep only the last 10 simulations
    const limitedHistory = updatedHistory.slice(0, 10);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(limitedHistory));
};

export const getSimulationHistory = (): SimulationHistoryItem[] => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    try {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        return parsed.map((item: any) => ({
            ...item,
            date: new Date(item.date),
        }));
    } catch {
        return [];
    }
};

const formatDate = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

    // Format as locale date string
    return date.toLocaleDateString();
};

const SimulationHistory: React.FC = () => {
    const [history, setHistory] = useState<SimulationHistoryItem[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        setHistory(getSimulationHistory());
    }, []);

    if (history.length === 0) {
        return null;
    }

    return (
        <div>
            <Typography variant="h4" style={{ marginTop: "24px" }}>
                Recent Simulations
            </Typography>
            <HistoryContainer>
                {history.map((item) => (
                    <HistoryButton
                        key={item.simulationId}
                        variant="outlined"
                        onClick={() => navigate(`/simulations/${item.simulationId}`)}
                    >
                        {item.displayName} - {formatDate(item.date)}
                    </HistoryButton>
                ))}
            </HistoryContainer>
        </div>
    );
};

export default SimulationHistory;
