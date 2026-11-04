import React from "react";
import ccsImage from "@/assets/3705183.svg";

const Dashboard: React.FC = () => {
    return (
        <div className="container">
            <header style={{ marginTop: "64px", marginBottom: "32px" }}>
                <center>
                    <h1 className="h1-title">Welcome to AcidWatch</h1>
                    <h2>
                        Your gateway to understanding CO<sub>2</sub> impurities
                    </h2>
                </center>
            </header>

            <main>
                <h3>
                    AcidWatch empowers researchers, chemists, and industry professionals by providing a single interface
                    to access many models capable of calculating and/or predicting chemical reactions involving
                    impurities in CO<sub>2</sub> streams.
                </h3>
                <p>
                    This allows us to democratize and open up the discussion around CO<sub>2</sub> impurities, fostering
                    collaboration and innovation in the field.
                </p>
                <p>
                    AcidWatch is free and open source software whose source code can be found at{" "}
                    <a href="https://github.com/equinor/acidwatch">our GitHub repository</a>.
                </p>
                <p>
                    This software and the accompanying models are not complete and are continuously developed. Use the
                    results with caution.
                </p>
            </main>

            <center>
                <img
                    src={ccsImage}
                    alt="Illustration: CCS"
                    style={{ filter: "grayscale(25%) contrast(25%) opacity(25%)", width: "50%" }}
                />
            </center>
        </div>
    );
};

export default Dashboard;
