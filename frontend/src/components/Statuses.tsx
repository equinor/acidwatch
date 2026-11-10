import { Status } from "@/hooks/useSimulationQueriesResult";
import { Accordion, Table } from "@equinor/eds-core-react";
import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";
import React, { useMemo } from "react";

const createRows = (statuses: Record<string, Status>) => {
    return Object.entries(statuses).map(([key, status]) => ({
        id: key,
        experimentName: key.split(":")[0],
        modelId: key.split(":")[1],
        status: status.status,
    }));
};

const features = tableFeatures({});
const columnHelper = createColumnHelper<typeof features, ReturnType<typeof createRows>[number]>();
const columns = columnHelper.columns([
    columnHelper.accessor("modelId", {
        header: "Model ID",
    }),
    columnHelper.accessor("experimentName", {
        header: "Experiment Name",
    }),
    columnHelper.accessor("status", {
        header: "Status",
    }),
]);

const Statuses: React.FC<{ statuses: Record<string, Status> }> = ({ statuses }) => {
    const data = useMemo(() => createRows(statuses), [statuses]);
    const table = useTable(
        {
            key: "statuses",
            columns,
            data,
            features,
            getRowId: (row) => row.id,
        },
        () => null
    );
    const buckets = {
        starting: 0,
        pending: 0,
        done: 0,
        failed: 0,
    };
    for (const row of data) {
        buckets[row.status]++;
    }

    return (
        <div>
            <Accordion>
                <Accordion.Item>
                    <Accordion.Header>
                        <span>
                            <strong>{buckets.starting}</strong> Starting &nbsp;|&nbsp;
                            <strong>{buckets.pending}</strong> Pending &nbsp;|&nbsp;
                            <strong>{buckets.done}</strong> Done &nbsp;|&nbsp;
                            <strong>{buckets.failed}</strong> Failed
                        </span>
                    </Accordion.Header>
                    <Accordion.Panel style={{ overflowX: "auto", padding: 0 }}>
                        <Table style={{ width: "100%" }}>
                            <Table.Head>
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <Table.Row key={headerGroup.id}>
                                        {headerGroup.headers.map((header) => (
                                            <Table.Cell key={header.id} colSpan={header.colSpan}>
                                                <table.FlexRender header={header} />
                                            </Table.Cell>
                                        ))}
                                    </Table.Row>
                                ))}
                            </Table.Head>
                            <Table.Body>
                                {table.getRowModel().rows.map((row) => (
                                    <Table.Row key={row.id}>
                                        {row.getAllCells().map((cell) => (
                                            <Table.Cell key={cell.id}>
                                                <table.FlexRender cell={cell} />
                                            </Table.Cell>
                                        ))}
                                    </Table.Row>
                                ))}
                            </Table.Body>
                        </Table>
                    </Accordion.Panel>
                </Accordion.Item>
            </Accordion>
        </div>
    );
};

export default Statuses;
