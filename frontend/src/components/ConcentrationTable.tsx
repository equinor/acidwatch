import React from "react";
import { Table } from "@equinor/eds-core-react";
import { formatConcentration } from "@/functions/Formatting";

const VARIATION_HIGHLIGHT_COLOR = "#fff4e5";

export type ConcentrationRange = {
    min: number;
    max: number;
    step: number;
};

export type SimulationConcentrations = {
    id: string;
    modelName: string;
    concentrations: Record<string, number>;
    ranges?: Record<string, ConcentrationRange>;
};

type ConcentrationTableProps = {
    substances: string[];
    simulations: SimulationConcentrations[];
    highlightDifferences?: boolean;
};

const formatRange = (range: ConcentrationRange): string => `${range.min}–${range.max} (step ${range.step})`;

const renderCellValue = (sim: SimulationConcentrations, substance: string): string => {
    const range = sim.ranges?.[substance];
    return range ? formatRange(range) : formatConcentration(sim.concentrations[substance]);
};

const substanceSignature = (sim: SimulationConcentrations, substance: string): string => {
    const range = sim.ranges?.[substance];
    return range ? `range:${range.min}-${range.max}-${range.step}` : `value:${sim.concentrations[substance] || 0}`;
};

const ConcentrationTable: React.FC<ConcentrationTableProps> = ({
    substances,
    simulations,
    highlightDifferences = false,
}) => (
    <Table>
        <Table.Head>
            <Table.Row>
                <Table.Cell>Compound</Table.Cell>
                {simulations.map((sim) => (
                    <Table.Cell key={sim.id}>
                        {sim.modelName} ({sim.id.slice(0, 8)})
                    </Table.Cell>
                ))}
            </Table.Row>
        </Table.Head>
        <Table.Body>
            {substances.map((substance) => {
                const signatures = simulations.map((sim) => substanceSignature(sim, substance));
                const hasVariation = highlightDifferences && new Set(signatures).size > 1;

                return (
                    <Table.Row
                        key={substance}
                        style={hasVariation ? { backgroundColor: VARIATION_HIGHLIGHT_COLOR } : {}}
                    >
                        <Table.Cell>
                            {substance}
                            {hasVariation && " ⚠️"}
                        </Table.Cell>
                        {simulations.map((sim) => (
                            <Table.Cell key={sim.id}>{renderCellValue(sim, substance)}</Table.Cell>
                        ))}
                    </Table.Row>
                );
            })}
        </Table.Body>
    </Table>
);

export default ConcentrationTable;
