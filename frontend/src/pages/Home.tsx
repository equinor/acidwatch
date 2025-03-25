import React from "react";
import { Link } from "react-router-dom";
import ProjectList from "./ProjectList";

const Dashboard: React.FC = () => {
    return (
        <div>
            <h3>Home</h3>
            <p>
                This is the alfa version of AcidWatch. Currently limited to a basic <Link to="/arcs">ARCS</Link> run.
                <br />
                Create a new project to organize and share your simulation runs.
            </p>
            <h4>Coming soon:</h4>
            <ul>
                <li>Possibility to run different models</li>
                <li>Compare results from different scenarios/models</li>
                <li>Compare results with experimental lab results</li>
                <li>etc</li>
            </ul>
            <br />
            <div>
                <ProjectList />
            </div>
        </div>
    );
};

export default Dashboard;
