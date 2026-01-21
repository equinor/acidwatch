import React, { useState } from "react";
import { Button, Typography, Checkbox } from "@equinor/eds-core-react";
import { Entry, useSimulationHistory } from "@/hooks/useSimulationHistory.ts";
import { Link, useNavigate } from "react-router-dom";

const SimulationHistory: React.FC = () => {
    const simulationHistory = useSimulationHistory();
    const navigate = useNavigate();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const dayGroups: Record<string, Entry[]> = {};
    for (let i = simulationHistory.length - 1; i >= 0; i--) {
        const entry = simulationHistory[i];
        const key = entry.createdAt.toISOString().split("T")[0];
        (dayGroups[key] ??= []).push(entry);
    }
    const dayGroupsEntries = Object.entries(dayGroups);

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleCompare = () => {
        if (selectedIds.size > 0) {
            const ids = Array.from(selectedIds).join(",");
            navigate(`/compare?ids=${ids}`);
        }
    };

    return (
        <div>
            {selectedIds.size > 0 && (
                <div style={{ marginBottom: "1em", display: "flex", gap: "0.5em" }}>
                    <Button onClick={handleCompare} disabled={selectedIds.size < 2}>
                        Compare ({selectedIds.size})
                    </Button>
                    <Button variant="outlined" onClick={() => setSelectedIds(new Set())}>
                        Clear
                    </Button>
                </div>
            )}
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
                            <div key={entry.id} style={{ display: "flex", alignItems: "center", gap: "0.5em" }}>
                                <Checkbox
                                    checked={selectedIds.has(entry.id)}
                                    onChange={() => toggleSelection(entry.id)}
                                />
                                <Button
                                    as={Link}
                                    variant="outlined"
                                    to={`/simulations/${entry.id}`}
                                    style={{ flex: 1 }}
                                >
                                    {entry.displayName} @{" "}
                                    {entry.createdAt.toLocaleTimeString(undefined, { timeStyle: "short" })}
                                </Button>
                            </div>
                        ))}
                    </div>
                ))
            )}
        </div>
    );
};

export default SimulationHistory;
