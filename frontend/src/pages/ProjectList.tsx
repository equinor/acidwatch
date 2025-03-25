import { Button, Icon, Table, Typography } from "@equinor/eds-core-react";
import { add_circle_outlined } from "@equinor/eds-icons";
import { useState } from "react";
import styled from "styled-components";
import { getProjects } from "../api/api";
import CreateProjectDialog from "../components/CreateProjectDialog";
import ProjectListContent from "./ProjectListContent";
import { useQuery } from "@tanstack/react-query";

const StyledRowLayout = styled.div`
    display: flex;
    justify-content: space-between;
    width: 100%;
`;

export default function ProjectList(): JSX.Element {
    const { data: projects, error, isLoading } = useQuery({ queryKey: ["projects"], queryFn: getProjects });
    const yourProjects = projects ? projects.filter((project) => project.private === true) : [];
    const internalProjects = projects ? projects.filter((project) => project.private === false) : [];
    const [createScenarioDialogOpen, setCreateProjectDialogOpen] = useState(false);

    return (
        <>
            <StyledRowLayout>
                <section>
                    <Button data-testid="test" onClick={() => setCreateProjectDialogOpen(true)}>
                        <Icon data={add_circle_outlined} size={18}></Icon>
                        Create project
                    </Button>
                    {createScenarioDialogOpen && (
                        <CreateProjectDialog setCreateProjectDialogOpen={setCreateProjectDialogOpen} />
                    )}
                </section>
            </StyledRowLayout>
            <br />
            <StyledRowLayout>
                {isLoading && <p>Loading projects...</p>}
                {error && <p>Error: {String(error)}</p>}
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
                            <ProjectListContent projects={yourProjects} />
                            <Table.Row key="InternalProjectDivider">
                                <Table.Cell colSpan={4}>
                                    <Typography variant="overline">Internal projects</Typography>
                                </Table.Cell>
                            </Table.Row>
                            <ProjectListContent projects={internalProjects} />
                        </Table.Body>
                    </Table>
                )}
            </StyledRowLayout>
        </>
    );
}
