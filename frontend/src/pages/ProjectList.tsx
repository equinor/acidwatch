import { Button, Icon, Table, Typography } from "@equinor/eds-core-react";
import { add_circle_outlined } from "@equinor/eds-icons";
import { useEffect, useState } from "react";
import styled from "styled-components";
import { getProjects } from "../api/api";
import { Project } from "../dto/Project";
import CreateProjectDialog from "../components/CreateProjectDialog";
import ProjectListContent from "./ProjectListContent";

const StyledRowLayout = styled.div`
    display: flex;
    justify-content: space-between;
    width: 100%;
`;

export default function ProjectList(): JSX.Element {
    const [yourProjects, setYourProjects] = useState<Project[]>([]);
    const [internalProjects, setInternalProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [createScenarioDialogOpen, setCreateProjectDialogOpen] = useState(false);

    useEffect(() => {
        fetchProjects();
    }, []);

    const onCreateProject = async () => {
        setCreateProjectDialogOpen(false);
        fetchProjects();
    };

    const fetchProjects = async () => {
        try {
            const projects = await getProjects();
            setYourProjects(projects.filter(project => project.private === true))
            setInternalProjects(projects.filter(project => project.private === false))
        } catch (error) {
            setError(String(error));
        } finally {
            setLoading(false);
        }
        console.log("Fetching projects...");
    };

    return (
        <div style={{ width: "800px" }}>
            <StyledRowLayout>
                <section>
                    <Button data-testid="test" onClick={() => setCreateProjectDialogOpen(true)}>
                        <Icon data={add_circle_outlined} size={18}></Icon>
                        Create project
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
                {yourProjects?.length === 0 && internalProjects?.length === 0 ? (
                    <p>No projects available.</p>
                ) : (
                    <Table style={{ width: "100%" }}>
                        <Table.Head>
                            <Table.Row>
                                <Table.Cell>Projects</Table.Cell>
                                <Table.Cell>Created by</Table.Cell>
                                <Table.Cell>Creation date</Table.Cell>
                                <Table.Cell></Table.Cell>
                            </Table.Row>
                        </Table.Head>
                        <Table.Body>
                            <Table.Row key="YourProjectDivider">
                                <Table.Cell colSpan={4}>
                                    <Typography variant="overline">Private projects</Typography>
                                </Table.Cell>
                            </Table.Row>
                            <ProjectListContent projects={yourProjects} fetchProjects={fetchProjects} />
                            <Table.Row key="InternalProjectDivider">
                                <Table.Cell colSpan={4}>
                                    <Typography variant="overline">Internal projects</Typography>
                                </Table.Cell>
                            </Table.Row>
                            <ProjectListContent projects={internalProjects} fetchProjects={fetchProjects} />
                        </Table.Body>
                    </Table>
                )}
            </StyledRowLayout>
        </div>
    );
}
