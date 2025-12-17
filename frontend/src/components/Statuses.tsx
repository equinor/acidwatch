import { Status } from "@/hooks/useSimulationQueriesResult";
import { Accordion } from "@equinor/eds-core-react";
import { EdsDataGrid } from "@equinor/eds-data-grid-react";
import React from "react";

const Statuses: React.FC<{ statuses: Record<string, Status> }> = ({ statuses }) => (
    <div>
        <Accordion>
            <Accordion.Item>
                <Accordion.Header>
                    {(() => {
                        const buckets = {
                            starting: 0,
                            pending: 0,
                            done: 0,
                            failed: 0,
                        };
                        for (const status of Object.values(statuses)) {
                            buckets[status.status]++;
                        }
                        return (
                            <span>
                                <strong>{buckets.starting}</strong> Starting &nbsp;|&nbsp;
                                <strong>{buckets.pending}</strong> Pending &nbsp;|&nbsp;
                                <strong>{buckets.done}</strong> Done &nbsp;|&nbsp;
                                <strong>{buckets.failed}</strong> Failed
                            </span>
                        );
                    })()}
                </Accordion.Header>
                <Accordion.Panel>
                    <EdsDataGrid
                        columns={[
                            { accessorKey: "modelId", header: "Model ID", size: 160 },
                            { accessorKey: "experimentName", header: "Experiment Name", size: 160 },
                            { accessorKey: "status", header: "Status", size: 160 },
                        ]}
                        rows={createRows(statuses)}
                    />
                </Accordion.Panel>
            </Accordion.Item>
        </Accordion>
    </div>
);

const createRows = (statuses: Record<string, Status>) => {
    return Object.entries(statuses).map(([key, status]) => ({
        id: key,
        experimentName: key.split(":")[0],
        modelId: key.split(":")[1],
        status: status.status,
    }));
};

export default Statuses;
