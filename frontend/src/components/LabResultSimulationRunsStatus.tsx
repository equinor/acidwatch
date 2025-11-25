import { Accordion } from "@equinor/eds-core-react";
import { EdsDataGrid } from "@equinor/eds-data-grid-react";
import React from "react";

interface LabResultSimulationRunsStatusProps {
    modelId?: string[];
    experimentName?: string[];
    simulationStatus?: string[];
}

const LabResultSimulationRunsStatus: React.FC<LabResultSimulationRunsStatusProps> = ({
    modelId,
    experimentName,
    simulationStatus,
}) => (
    <div>
        <Accordion>
            <Accordion.Item>
                <Accordion.Header>Show calculation status</Accordion.Header>
                <Accordion.Panel>
                    {(() => {
                        const rows = createRows(modelId, experimentName, simulationStatus);

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

const createRows = (modelId?: string[], experimentName?: string[], simulationStatus?: string[]) => {
    if (!modelId?.length && !experimentName?.length && !simulationStatus?.length) {
        return [];
    }

    const maxLength = Math.max(modelId?.length ?? 0, experimentName?.length ?? 0, simulationStatus?.length ?? 0);

    return Array.from({ length: maxLength }, (_, index) => ({
        id: index,
        modelId: modelId?.[index] ?? "",
        experimentName: experimentName?.[index] ?? "",
        status: simulationStatus?.[index] ?? "",
    }));
};

export default LabResultSimulationRunsStatus;
