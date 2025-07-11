import { Button, Icon, Menu, Table, Typography } from "@equinor/eds-core-react";
import { add_circle_outlined, more_horizontal } from "@equinor/eds-icons";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import styled from "styled-components";
import { getSimulations, deleteSimulation, getProjects } from "../api/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useErrorStore } from "../hooks/useErrorState";
import { ISODate_to_UIDate } from "../functions/Formatting";
import { useAccount } from "@azure/msal-react";
import { useBreadcrumbStore } from "../hooks/useBreadcrumbStore";
const StyledRowLayout = styled.div`
    display: flex;
    justify-content: space-between;
    width: 100%;
`;

export default function SimulationList(): JSX.Element {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const { setError } = useErrorStore();
    const queryKey = `getsimulations-${projectId}`;
    const [menuOpen, setMenuOpen] = useState<{ [key: number]: boolean }>({});
    const menuAnchorRefs = useRef<{ [key: number]: HTMLButtonElement | null }>({});
    const queryClient = useQueryClient();
    const accountId = useAccount()?.localAccountId;
    const { data: projects } = useQuery({
        queryKey: ["projects"],
        queryFn: getProjects,
    });
    const [isProjectYours, setIsProjectYours] = useState<boolean>(false);

    useEffect(() => {
        if (projects && accountId)
            setIsProjectYours(projects?.find((project) => project.id === projectId)?.owner_id === accountId);
    }, [projects, accountId, projectId]);

    const {
        data: simulations,
        error: fetchSimulationsError,
        isLoading: areSimulationsLoading,
    } = useQuery({
        queryKey: [queryKey],
        queryFn: () => getSimulations(projectId || ""),
    });

    const deleteSimulationMutation = useMutation({
        mutationFn: (simulationId: number) => deleteSimulation(projectId!, simulationId),
        onError: () => setError("Could not delete simulation"),
    });

    const handleMenuToggle = (simulationId: number) => {
        setMenuOpen((prevMenuOpen) => ({
            ...prevMenuOpen,
            [simulationId]: !prevMenuOpen[simulationId],
        }));
    };

    const handleMenuClose = (simulationId: number) => {
        setMenuOpen((prevMenuOpen) => ({
            ...prevMenuOpen,
            [simulationId]: false,
        }));
    };

    const handleDeleteSimulation = async (simulationId: number) => {
        deleteSimulationMutation.mutate(simulationId);
        queryClient.invalidateQueries({ queryKey: [queryKey] });
    };
    const setSimulation = useBreadcrumbStore((state) => state.setSimulation);
    if (areSimulationsLoading && !simulations) return <p>Loading simulations...</p>;

    if (fetchSimulationsError && !simulations) return <p>Could not fetch simulations.</p>;

    return (
        <div style={{ width: "800px" }}>
            <StyledRowLayout>
                <section>
                    <Typography variant="h4">Simulations</Typography>
                </section>
                {isProjectYours && (
                    <section>
                        <Button onClick={() => navigate(`/project/${projectId}/input`)}>
                            <Icon data={add_circle_outlined} size={18}></Icon>
                            Create new simulation
                        </Button>
                    </section>
                )}
            </StyledRowLayout>
            <br />
            <StyledRowLayout>
                {!simulations || simulations.length == 0 ? (
                    <Typography>No simulations available. The project is currently empty.</Typography>
                ) : (
                    <Table style={{ width: "100%" }}>
                        <Table.Head>
                            <Table.Row>
                                <Table.Cell>Name</Table.Cell>
                                <Table.Cell>Created by</Table.Cell>
                                <Table.Cell>Creation date</Table.Cell>
                                {isProjectYours && <Table.Cell>Actions</Table.Cell>}
                            </Table.Row>
                        </Table.Head>
                        <Table.Body>
                            {simulations!.map((simulation) => {
                                const menuButtonId = `menu-button-${simulation.id}`;
                                const menuId = `menu-${simulation.id}`;

                                return (
                                    <Table.Row key={simulation.id}>
                                        <Table.Cell>
                                            <Link
                                                to={`/project/${projectId}/simulation/${simulation.id}`}
                                                onClick={() => setSimulation(simulation.name)}
                                            >
                                                {simulation.name}
                                            </Link>
                                        </Table.Cell>
                                        <Table.Cell>{simulation.owner}</Table.Cell>
                                        <Table.Cell>{ISODate_to_UIDate(simulation.date)}</Table.Cell>
                                        {isProjectYours && (
                                            <Table.Cell>
                                                <div style={{ display: "flex", alignItems: "center" }}>
                                                    <Button
                                                        ref={(el) => (menuAnchorRefs.current[simulation.id] = el)}
                                                        id={menuButtonId}
                                                        variant="ghost_icon"
                                                        aria-haspopup="true"
                                                        aria-expanded={menuOpen[simulation.id] || false}
                                                        aria-controls={menuId}
                                                        onClick={() => handleMenuToggle(simulation.id)}
                                                    >
                                                        <Icon data={more_horizontal}></Icon>
                                                    </Button>
                                                    <Menu
                                                        id={menuId}
                                                        open={menuOpen[simulation.id] || false}
                                                        aria-labelledby={menuButtonId}
                                                        onClose={() => handleMenuClose(simulation.id)}
                                                        anchorEl={menuAnchorRefs.current[simulation.id]}
                                                    >
                                                        <Menu.Item onClick={() => console.log("Edit simulation")}>
                                                            Edit (not implemented)
                                                        </Menu.Item>
                                                        <Menu.Item
                                                            onClick={() => handleDeleteSimulation(simulation.id)}
                                                        >
                                                            Delete
                                                        </Menu.Item>
                                                    </Menu>
                                                </div>
                                            </Table.Cell>
                                        )}
                                    </Table.Row>
                                );
                            })}
                        </Table.Body>
                    </Table>
                )}
            </StyledRowLayout>
        </div>
    );
}
