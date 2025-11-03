import { useEffect, useState } from "react";
import React from "react";

import { Typography, Card } from "@equinor/eds-core-react";
import { getSimulation, getSimulationResults } from "@/api/api";
import { useParams } from "react-router-dom";
import styled from "styled-components";
import { tokens } from "@equinor/eds-tokens";
import Results from "./Results";
import { useQuery } from "@tanstack/react-query";
import { SimulationResults } from "@/dto/SimulationResults";

const StyledRow = styled.div`
    display: grid;
    grid-template-columns: 1fr 91px;
    gap: 8px;
`;

const SimulationResult: React.FC = () => {
    const { projectId, simulationId } = useParams<{ projectId: string; simulationId: string }>();
    const [concentrations, setConcentrations] = useState<Record<string, number>>({});
    const [parameters, setParameters] = useState<Record<string, number>>({});
    const [simulationName, setSimulationName] = useState<string | undefined>(undefined);
    const [model, setModel] = useState<string | undefined>(undefined);

    const { data: fetchedResults } = useQuery<SimulationResults | null>({
        queryKey: [`get-simulation-${projectId}-${simulationId}`],
        queryFn: () => getSimulationResults(projectId!, simulationId!),
        enabled: !!projectId && !!simulationId,
    });

    useEffect(() => {
        const fetchSimulation = async () => {
            if (!projectId || !simulationId) return;
            try {
                const simulation = await getSimulation(projectId, simulationId);

                if (simulation) {
                    setSimulationName(simulation.name);
                    setModel(simulation.model);
                    setConcentrations(simulation.scenarioInputs.initialConcentrations || {});
                    setParameters(simulation.scenarioInputs.parameters || {});
                }
            } catch (error) {
                console.error("Error fetching simulation:", error);
            }
        };

        fetchSimulation();
    }, [projectId, simulationId]);

    const renderKeyValuePairs = (data: Record<string, number>) => {
        return Object.entries(data)
            .filter(([, value]) => value !== 0)
            .map(([key, value]) => (
                <StyledRow key={key}>
                    <Typography>{key}:</Typography>
                    <Typography>{value}</Typography>
                </StyledRow>
            ));
    };

    return (
        <div style={{ display: "flex" }}>
            <div style={{ marginLeft: "15px" }}>
                <Card
                    elevation="raised"
                    style={{
                        padding: "8px",
                        width: "300px",
                        backgroundColor: tokens.colors.infographic.primary__moss_green_13.hex,
                    }}
                >
                    <Card.Content>
                        <StyledRow>
                            <Typography>Simulation name</Typography>
                            <Typography>{simulationName}</Typography>
                        </StyledRow>
                        <StyledRow>
                            <Typography>Model</Typography>
                            <Typography>{model}</Typography>
                        </StyledRow>
                        <br />
                        <StyledRow>
                            <Typography
                                token={{
                                    textDecoration: "underline",
                                }}
                            >
                                Initial concentrations
                            </Typography>
                        </StyledRow>

                        {renderKeyValuePairs(concentrations)}
                        <br />
                        <StyledRow>
                            <Typography
                                token={{
                                    textDecoration: "underline",
                                }}
                            >
                                Parameters
                            </Typography>
                        </StyledRow>
                        {renderKeyValuePairs(parameters)}
                    </Card.Content>
                </Card>
            </div>
            <div style={{ marginLeft: "50px" }}>
                <Results simulationResults={fetchedResults ?? undefined} />
            </div>
        </div>
    );
};

export default SimulationResult;
