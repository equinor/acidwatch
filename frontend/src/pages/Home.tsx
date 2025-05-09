import React from "react";
import { Link } from "react-router-dom";
import ProjectList from "./ProjectList";

const Dashboard: React.FC = () => {
    return (
        <>
            <h3>Home</h3>
            <p>
                This is the alfa version of AcidWatch.
                <br />
                Create a new project to organize and share your simulation runs.
            </p>

            <br />
            <div style={{ width: "800px" }}>
                <ProjectList />
            </div>
        </>
    );
};

export default Dashboard;
