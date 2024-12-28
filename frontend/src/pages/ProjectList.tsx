import { Button, Icon, Menu, Table, Typography } from "@equinor/eds-core-react";
import { add_circle_outlined, more_horizontal } from "@equinor/eds-icons";
import { tokens } from "@equinor/eds-tokens";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import styled from "styled-components";
import { deleteProject, getProjects } from "../api/api";
import { Project } from "../dto/Project";
import { RowLayout } from "../components/StyledLayout";
import CreateProjectDialog from "../components/CreateProjectDialog";

const StyledRowLayout = styled.div`
    display: flex;
    justify-content: space-between;
    width: 100%;
`;

export default function ProjectList(): JSX.Element {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [createScenarioDialogOpen, setCreateProjectDialogOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState<{ [key: string]: boolean }>({});
    const menuAnchorRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const data = await getProjects();
                setProjects(data);
            } catch (error) {
                setError(String(error));
            } finally {
                setLoading(false);
            }
        };

        fetchProjects();
    }, []);

    const onCreateProject = async () => {
        setCreateProjectDialogOpen(false);
        await fetchProjects();
    };

    const fetchProjects = async () => {
        try {
            const data = await getProjects();
            setProjects(data);
        } catch (error) {
            setError(String(error));
        } finally {
            setLoading(false);
        }
    };

    const handleMenuToggle = (projectId: string) => {
        setMenuOpen((prevMenuOpen) => ({
            ...prevMenuOpen,
            [projectId]: !prevMenuOpen[projectId],
        }));
    };

    const handleMenuClose = (projectId: string) => {
        setMenuOpen((prevMenuOpen) => ({
            ...prevMenuOpen,
            [projectId]: false,
        }));
    };

    const handleDeleteProject = async (projectId: string) => {
        await deleteProject(projectId);
        setProjects(projects.filter((project) => project.id !== projectId.toString()));
    };

    return (
        <div style={{ width: "800px" }}>
            <StyledRowLayout>
                <section>
                    <Typography variant="h4">Projects</Typography>
                </section>
                <section>
                    <Button onClick={() => setCreateProjectDialogOpen(true)}>
                        <Icon data={add_circle_outlined} size={18}></Icon>
                        Create new project
                    </Button>
                    <CreateProjectDialog
                        isOpen={createScenarioDialogOpen}
                        onCancel={() => setCreateProjectDialogOpen(false)}
                        onCreatedProject={onCreateProject}
                    />
                </section>
            </StyledRowLayout>
            <br />
            <StyledRowLayout>
                {loading && <p>Loading projects...</p>}
                {error && <p>Error: {error}</p>}
                {projects?.length === 0 ? (
                    <p>No projects available.</p>
                ) : (
                    <Table style={{ width: "100%" }}>
                        <Table.Head>
                            <Table.Row>
                                <Table.Cell>Name</Table.Cell>
                                <Table.Cell>Created by</Table.Cell>
                                <Table.Cell>Private</Table.Cell>
                                <Table.Cell></Table.Cell>
                            </Table.Row>
                        </Table.Head>
                        <Table.Body>
                            {projects.map((project) => {
                                const menuButtonId = `menu-button-${project.id}`;
                                const menuId = `menu-${project.id}`;

                                return (
                                    <Table.Row key={project.id}>
                                        <Table.Cell>
                                            <Link to={`/project/${project.id}`}>{project.name}</Link>
                                        </Table.Cell>
                                        <Table.Cell>{project.owner}</Table.Cell>
                                        <Table.Cell>{project.private ? "Yes" : "No"}</Table.Cell>
                                        <Table.Cell>
                                            <RowLayout style={{ marginLeft: tokens.spacings.comfortable.small }}>
                                                <Button
                                                    ref={(el) => (menuAnchorRefs.current[project.id] = el)}
                                                    id={menuButtonId}
                                                    variant="ghost_icon"
                                                    aria-haspopup="true"
                                                    aria-expanded={menuOpen[project.id] || false}
                                                    aria-controls={menuId}
                                                    onClick={() => handleMenuToggle(project.id)}
                                                >
                                                    <Icon data={more_horizontal}></Icon>
                                                </Button>
                                                <Menu
                                                    id={menuId}
                                                    open={menuOpen[project.id] || false}
                                                    aria-labelledby={menuButtonId}
                                                    onClose={() => handleMenuClose(project.id)}
                                                    anchorEl={menuAnchorRefs.current[project.id]}
                                                >
                                                    <Menu.Item>Share project (not implemented)</Menu.Item>
                                                    <Menu.Item onClick={() => handleDeleteProject(project.id)}>
                                                        Delete
                                                    </Menu.Item>
                                                </Menu>
                                            </RowLayout>
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
