import React from "react";
import { Button, Typography } from "@equinor/eds-core-react";
import { Entry, useSimulationHistory } from "@/hooks/useSimulationHistory.ts";
import { Link } from "react-router-dom";

const SimulationHistory: React.FC = () => {
    const simulationHistory = useSimulationHistory();
    const dayGroups: Record<string, Entry[]> = {};
    for (let i = simulationHistory.length - 1; i >= 0; i--) {
        const entry = simulationHistory[i];
        const key = entry.createdAt.toISOString().split("T")[0];
        (dayGroups[key] ??= []).push(entry);
    }
    const dayGroupsEntries = Object.entries(dayGroups);

    return (
        <div>
            {dayGroupsEntries.length === 0 ? (
                <Typography variant="body_short" italic>
                    No simulation history
                </Typography>
            ) : (
                dayGroupsEntries.map(([date, entries]) => (
                    <div style={{ display: "flex", flexFlow: "column", gap: "1em" }} key={date}>
                        <Typography variant="h3">
                            {entries[0].createdAt.toLocaleDateString(undefined, { dateStyle: "short" })}
                        </Typography>
                        {entries.map((entry) => (
                            <Button as={Link} variant="outlined" to={`/simulations/${entry.id}`} key={entry.id}>
                                {entry.displayName} @{" "}
                                {entry.createdAt.toLocaleTimeString(undefined, { timeStyle: "short" })}
                            </Button>
                        ))}
                    </div>
                ))
            )}
        </div>
    );
};

export default SimulationHistory;
