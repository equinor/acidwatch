import { Button, Icon, Menu, Table, Typography } from "@equinor/eds-core-react";
import { add_circle_outlined, more_horizontal } from "@equinor/eds-icons";
import { tokens } from "@equinor/eds-tokens";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import styled from "styled-components";
import { getSimulations, deleteSimulation } from "../api/api"; // Define this function to delete simulations
import { Simulation } from "../dto/Simulation"; // Define this interface
import { Project } from "../dto/Project";
const StyledRowLayout = styled.div`
    display: flex;
    justify-content: space-between;
    width: 100%;
`;

export default function SimulationList(): JSX.Element {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const [simulations, setSimulations] = useState<Simulation[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [menuOpen, setMenuOpen] = useState<{ [key: number]: boolean }>({});
    const menuAnchorRefs = useRef<{ [key: number]: HTMLButtonElement | null }>({});

    useEffect(() => {
        const fetchSimulations = async () => {
            try {
                if (projectId) {
                    const data = await getSimulations(projectId);
                    setSimulations(data);
                } else {
                    setError("Project ID is undefined");
                }
            } catch (error) {
                setError(String(error));
            } finally {
                setLoading(false);
            }
        };

        fetchSimulations();
    }, [projectId]);
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
        try {
            if (projectId) {
                await deleteSimulation(projectId, simulationId);
            } else {
                console.error("Project ID is undefined");
            }
            setSimulations((prevSimulations) => prevSimulations.filter((simulation) => simulation.id !== simulationId));
        } catch (error) {
            console.error("Error deleting simulation:", error);
        }
    };
    return (
        <div style={{ width: "800px" }}>
            <StyledRowLayout>
                <section>
                    <Typography variant="h4">Simulations</Typography>
                </section>
                <section>
                    <Button onClick={() => navigate(`/project/${projectId}/input`)}>
                        <Icon data={add_circle_outlined} size={18}></Icon>
                        Create new simulation
                    </Button>
                </section>
            </StyledRowLayout>
            <br />
            <StyledRowLayout>
                {loading && <p>Loading simulations...</p>}
                {error && <p>Error: {error}</p>}
                {simulations?.length === 0 ? (
                    <p>No simulations available.</p>
                ) : (
                    <Table style={{ width: "100%" }}>
                        <Table.Head>
                            <Table.Row>
                                <Table.Cell>Name</Table.Cell>
                                <Table.Cell>Created by</Table.Cell>
                                <Table.Cell>Actions</Table.Cell>
                            </Table.Row>
                        </Table.Head>
                        <Table.Body>
                            {simulations.map((simulation) => {
                                const menuButtonId = `menu-button-${simulation.id}`;
                                const menuId = `menu-${simulation.id}`;

                                return (
                                    <Table.Row key={simulation.id}>
                                        <Table.Cell>
                                            <Link to={`/project/${projectId}/${simulation.id}`}>{simulation.name}</Link>
                                        </Table.Cell>
                                        <Table.Cell>{simulation.owner}</Table.Cell>
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
                                                    <Menu.Item onClick={() => handleDeleteSimulation(simulation.id)}>
                                                        Delete
                                                    </Menu.Item>
                                                </Menu>
                                            </div>
                                        </Table.Cell>
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
