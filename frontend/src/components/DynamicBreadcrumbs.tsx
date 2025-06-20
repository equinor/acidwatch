import React, { useState } from "react";
import { useLocation, Link, useMatch } from "react-router-dom";
import { Breadcrumbs } from "@equinor/eds-core-react";

const DynamicBreadcrumbs: React.FC = () => {
    const projectMatch = useMatch("/project/:projectId/*");
    const projectId = projectMatch?.params?.projectId;
    const simulationMatch = useMatch("/project/:projectId/simulation/:simulationId");
    const simulationId = simulationMatch?.params?.simulationId;
    const location = useLocation();

    const [projectName, setProjectName] = useState<string>("");
    const [simulationName, setSimulationName] = useState<string>("");

    const getBreadcrumbs = () => {
        const pathSegments = location.pathname.split("/").filter(Boolean);
        const breadcrumbs = [];
        breadcrumbs.push(
            <Breadcrumbs.Breadcrumb key="home" as={Link} to={`/`}>
                Home
            </Breadcrumbs.Breadcrumb>
        );

        if (pathSegments.includes("project")) {
            breadcrumbs.push(
                <Breadcrumbs.Breadcrumb key="project" as={Link} to={`/project/${projectId}`}>
                    {projectName ? `Project: ${projectName}` : `Project: ${(projectId ?? "").slice(0, 8)}`}
                </Breadcrumbs.Breadcrumb>
            );
        }
        if (pathSegments.includes("simulation") && simulationId) {
            breadcrumbs.push(
                <Breadcrumbs.Breadcrumb
                    key="simulation"
                    as={Link}
                    to={`/project/${projectId}/simulation/${simulationId}`}
                >
                    {simulationName || `${(simulationId ?? "").slice(0, 8)}`}
                </Breadcrumbs.Breadcrumb>
            );
        }
        if (pathSegments.includes("models")) {
            breadcrumbs.push(
                <Breadcrumbs.Breadcrumb key="models" as={Link} to={`/models`}>
                    Models
                </Breadcrumbs.Breadcrumb>
            );
        }
        if (pathSegments.includes("labresults")) {
            breadcrumbs.push(
                <Breadcrumbs.Breadcrumb key="labresults" as={Link} to={`/labresults`}>
                    Lab results
                </Breadcrumbs.Breadcrumb>
            );
        }

        return breadcrumbs;
    };

    return <Breadcrumbs>{getBreadcrumbs()}</Breadcrumbs>;
};

export default DynamicBreadcrumbs;
