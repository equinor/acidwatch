import React from "react";
import { Table } from "@equinor/eds-core-react";
import { GridSimulationResult } from "@/dto/GridSimulation";
import { Phase } from "@/dto/SimulationResults";
import { formatConcentration } from "@/functions/Formatting";
import { pointOutput } from "@/components/GridSimulation/gridSimulationUtils";
import { optionName } from "@/functions/Substance";

interface GridPhaseTableProps {
    result: GridSimulationResult;
    modelIndex: number;
    phaseKind: Phase["kind"];
    substances: string[];
}

const GridPhaseTable: React.FC<GridPhaseTableProps> = ({ result, modelIndex, phaseKind, substances }) => (
    <Table>
        <Table.Head>
            <Table.Row>
                {result.axes.map((axis) => (
                    <Table.Cell key={axis.substance}>{axis.substance} (ppm)</Table.Cell>
                ))}
                {substances.map((substance) => (
                    <Table.Cell key={substance}>{optionName(substance)}</Table.Cell>
                ))}
            </Table.Row>
        </Table.Head>
        <Table.Body>
            {result.simulations.map((simulation, index) => (
                <Table.Row key={index}>
                    {result.axes.map((axis) => (
                        <Table.Cell key={axis.substance}>
                            {simulation.input.concentrations[axis.substance] ?? 0}
                        </Table.Cell>
                    ))}
                    {substances.map((substance) => (
                        <Table.Cell key={substance}>
                            {simulation.status === "done"
                                ? formatConcentration(pointOutput(simulation, substance, modelIndex, phaseKind) ?? 0)
                                : simulation.status === "error"
                                  ? "error"
                                  : "…"}
                        </Table.Cell>
                    ))}
                </Table.Row>
            ))}
        </Table.Body>
    </Table>
);

export default GridPhaseTable;
