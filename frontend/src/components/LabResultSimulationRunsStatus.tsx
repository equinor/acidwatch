import { Accordion } from "@equinor/eds-core-react";
import { EdsDataGrid } from "@equinor/eds-data-grid-react";
import React from "react";

interface LabResultSimulationRunsStatusProps {
    modelIds?: string[];
    experimentNames?: string[];
    simulationStatuses?: string[];
}

const LabResultSimulationRunsStatus: React.FC<LabResultSimulationRunsStatusProps> = ({
    modelIds,
    experimentNames,
    simulationStatuses,
}) => (
    <div>
        <Accordion>
            <Accordion.Item>
                <Accordion.Header>Show calculation status</Accordion.Header>
                <Accordion.Panel>
                    {(() => {
                        const rows = createRows(modelIds, experimentNames, simulationStatuses);

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

const createRows = (modelIds?: string[], experimentNames?: string[], simulationStatuses?: string[]) => {
    if (!modelIds?.length && !experimentNames?.length && !simulationStatuses?.length) {
        return [];
    }

    const maxLength = Math.max(modelIds?.length ?? 0, experimentNames?.length ?? 0, simulationStatuses?.length ?? 0);

    return Array.from({ length: maxLength }, (_, index) => ({
        id: index,
        modelId: modelIds?.[index] ?? "",
        experimentName: experimentNames?.[index] ?? "",
        status: simulationStatuses?.[index] ?? "",
    }));
};

export default LabResultSimulationRunsStatus;
