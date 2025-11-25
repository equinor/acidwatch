import React from "react";

const Dashboard: React.FC = () => {
    return (
        <>
            <div style={{ textAlign: "left", margin: "20px" }}>
                <h1>Welcome to AcidWatch</h1>
                <h2>
                    Your Gateway to Understanding CO<sub>2</sub> Impurities
                </h2>
                <p>
                    AcidWatch is a tool designed to empower researchers, chemists, and industry professionals by
                    providing a single interface to access many models, each capable of calculating and/or predicting
                    chemical reactions involving impurities in CO<sub>2</sub> streams.
                </p>
                <p>
                    Our goal is to democratize and open up the discussion around CO<sub>2</sub> impurities, fostering
                    collaboration and innovation in the field.
                </p>
            </div>

            <div style={{ textAlign: "left", margin: "20px" }}>
                <h2>Start Using AcidWatch Today</h2>
                <p>
                    Run your simulation in the "Models" tab on your left or explore available experiment results in the
                    "Lab results" tab.
                </p>
                <p>
                    Disclaimer: all input and corresponding results are stored in our database. It is possible to run
                    the application on you own, instructions can be found in the readme in the github repository.
                </p>
            </div>

            <br />
        </>
    );
};

export default Dashboard;
