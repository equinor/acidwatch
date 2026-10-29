import React from "react";
import { Table } from "@equinor/eds-core-react";

export const ROW_HEIGHT_REM = 3;
const DEFAULT_MAX_VISIBLE_ROWS = 5;

interface ScrollableTableProps {
    head: React.ReactNode;
    rowCount: number;
    maxVisibleRows?: number;
    children: React.ReactNode;
}

const ScrollableTable: React.FC<ScrollableTableProps> = ({
    head,
    rowCount,
    maxVisibleRows = DEFAULT_MAX_VISIBLE_ROWS,
    children,
}) => (
    <div
        style={
            rowCount > maxVisibleRows
                ? { maxHeight: `${(maxVisibleRows + 1) * ROW_HEIGHT_REM}rem`, overflow: "auto" }
                : undefined
        }
    >
        <Table style={{ width: "100%" }}>
            <Table.Head sticky>{head}</Table.Head>
            <Table.Body>{children}</Table.Body>
        </Table>
    </div>
);

export default ScrollableTable;
