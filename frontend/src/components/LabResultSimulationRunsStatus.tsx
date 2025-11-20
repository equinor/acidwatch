import { Accordion } from "@equinor/eds-core-react";
import React from "react";
const LabResultSimulationRunsStatus: React.FC = () => (
    <div>
        <Accordion>
            <Accordion.Item>
                <Accordion.Header>Show Details</Accordion.Header>
                <Accordion.Panel>
                    <p>This is the content inside the accordion.</p>
                </Accordion.Panel>
            </Accordion.Item>
        </Accordion>
    </div>
);

export default LabResultSimulationRunsStatus;
