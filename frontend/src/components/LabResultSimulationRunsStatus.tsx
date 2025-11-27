import { SimulationStatus } from "../dto/SimulationQuery";
import { Accordion } from "@equinor/eds-core-react";
import { EdsDataGrid } from "@equinor/eds-data-grid-react";
import React from "react";

interface LabResultSimulationRunsStatusProps {
    simulationStatuses: SimulationStatus[];
}

const LabResultSimulationRunsStatus: React.FC<LabResultSimulationRunsStatusProps> = ({ simulationStatuses }) => (
    <div>
        <Accordion>
            <Accordion.Item>
                <Accordion.Header>
                    {(() => {
                        const pendingCount = simulationStatuses.filter((s) => s.status === "pending").length;
                        const doneCount = simulationStatuses.filter((s) => s.status === "done").length;
                        return (
                            <span>
                                <strong>
                                    {"  "}
                                    {pendingCount}
                                </strong>
                                {"  "}
                                Pending &nbsp;|&nbsp; <strong>{doneCount}</strong> Done
                            </span>
                        );
                    })()}
                </Accordion.Header>
                <Accordion.Panel>
                    {(() => {
                        const rows = createRows(simulationStatuses);

                        return (
                            <EdsDataGrid
                                columns={[
                                    { accessorKey: "modelId", header: "Model ID", size: 160 },
                                    { accessorKey: "experimentName", header: "Experiment Name", size: 160 },
                                    { accessorKey: "status", header: "Status", size: 160 },
                                ]}
                                rows={rows}
                            />
                        );
                    })()}
                </Accordion.Panel>
            </Accordion.Item>
        </Accordion>
    </div>
);

const createRows = (simulationStatuses: SimulationStatus[]) => {
    return Object.entries(simulationStatuses).map(([index, status]) => ({
        id: index,
        modelId: status.modelId,
        experimentName: status.experimentName,
        status: status.status,
    }));
};

export default LabResultSimulationRunsStatus;
