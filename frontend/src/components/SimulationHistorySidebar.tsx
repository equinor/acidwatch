import React from "react";
import { Button, Typography } from "@equinor/eds-core-react";
import { Entry, useSimulationHistory } from "@/hooks/useSimulationHistory.ts";

const SimulationHistory: React.FC = () => {
    const simulationHistory = useSimulationHistory();
    const dayGroups: Record<string, Entry[]> = {};
    for (let i = simulationHistory.length - 1; i >= 0; i--) {
        const entry = simulationHistory[i];
        const y = entry.createdAt.getFullYear();
        const m = entry.createdAt.getMonth();
        const d = entry.createdAt.getDate();

        (dayGroups[`${y}-${m}-${d}`] ??= []).push(entry);
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
                        <Typography variant="h3">{date}</Typography>
                        {entries.map((entry) => (
                            <Button variant="outlined" href={`/simulations/${entry.id}`} key={entry.id}>
                                {entry.displayName} @ {entry.createdAt.getHours()}:{entry.createdAt.getMinutes()}
                            </Button>
                        ))}
                    </div>
                ))
            )}
        </div>
    );
};

export default SimulationHistory;
