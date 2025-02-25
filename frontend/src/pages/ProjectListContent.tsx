import { Button, Icon, Menu, Table } from "@equinor/eds-core-react";
import { Project } from "../dto/Project";
import { Link } from "react-router-dom";
import { tokens } from "@equinor/eds-tokens";
import { more_horizontal } from "@equinor/eds-icons";
import { RowLayout } from "../components/StyledLayout";
import { useRef, useState } from "react";
import { deleteProject, getProjects, switchPublicity } from "../api/api";
import { useAccount } from "@azure/msal-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useErrorStore } from "../hooks/useErrorState";

interface ProjectListContentProps {
    projects: Project[];
}

export default function ProjectListContent({ projects }: ProjectListContentProps): JSX.Element {
    const { setError } = useErrorStore();
    const queryClient = useQueryClient();

    const switchPublicityMutation = useMutation({
        mutationFn: (projectId: string) => switchPublicity(projectId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
        onError: () => setError("Could not change project publicity"),
    });

    const deleteProjectMutation = useMutation({
        mutationFn: (projectId: string) => deleteProject(projectId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
        onError: () => setError("Could not delete project"),
    });

    const [menuOpen, setMenuOpen] = useState<{ [key: string]: boolean }>({});
    const menuAnchorRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
    const localAccountId = useAccount()?.localAccountId;

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

    const handleSwitchPublicity = async (projectId: string) => {
        switchPublicityMutation.mutate(projectId)
    };

    const handleDeleteProject = async (projectId: string) => {
        deleteProjectMutation.mutate(projectId);
    };

    return (
        <>
            {projects.map((project) => {
                const menuButtonId = `menu-button-${project.id}`;
                const menuId = `menu-${project.id}`;
                return (
                    <Table.Row key={project.id}>
                        <Table.Cell>
                            <Link to={`/project/${project.id}`}>{project.name}</Link>
                        </Table.Cell>
                        <Table.Cell>{project.owner}</Table.Cell>
                        <Table.Cell>{project.date}</Table.Cell>
                        <Table.Cell>
                            <RowLayout style={{ marginLeft: tokens.spacings.comfortable.small }}>
                                {project.owner_id === localAccountId && (
                                    <Button
                                        ref={(el) => (menuAnchorRefs.current[project.id] = el)}
                                        id={menuButtonId}
                                        variant="ghost_icon"
                                        aria-haspopup="true"
                                        aria-expanded={menuOpen[project.id] || false}
                                        aria-controls={menuId}
                                        onClick={() => handleMenuToggle(project.id)}
                                    >
                                        <Icon data={more_horizontal} />
                                    </Button>
                                )}

                                <Menu
                                    id={menuId}
                                    open={menuOpen[project.id] || false}
                                    aria-labelledby={menuButtonId}
                                    onClose={() => handleMenuClose(project.id)}
                                    anchorEl={menuAnchorRefs.current[project.id]}
                                >
                                    {project.private && (
                                        <Menu.Item onClick={() => handleSwitchPublicity(project.id)}>
                                            Make Internal
                                        </Menu.Item>
                                    )}
                                    {!project.private && (
                                        <Menu.Item onClick={() => handleSwitchPublicity(project.id)}>
                                            Make Private
                                        </Menu.Item>
                                    )}

                                    <Menu.Item onClick={() => handleDeleteProject(project.id)}>Delete</Menu.Item>
                                </Menu>
                            </RowLayout>
                        </Table.Cell>
                    </Table.Row>
                );
            })}
        </>
    );
}
