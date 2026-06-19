import { Table } from "@equinor/eds-core-react";
import { Phase } from "@/dto/SimulationResults";
import { formatConcentration, formatPhaseFraction } from "@/functions/Formatting";

interface PhaseResultTableProps {
    initialConcentrations: Record<string, number>;
    phases: Phase[];
}

const PhaseResultTable: React.FC<PhaseResultTableProps> = ({ initialConcentrations, phases }) => {
    const allComponents = Array.from(
        new Set([
            ...Object.keys(initialConcentrations),
            ...phases.flatMap((phase) => Object.keys(phase.concentrations)),
        ])
    );

    const visibleComponents = allComponents.filter((key) => {
        const init = initialConcentrations[key] ?? 0;
        const hasSignificantPhaseValue = phases.some((phase) => (phase.concentrations[key] ?? 0) >= 0.001);
        return init >= 0.001 || hasSignificantPhaseValue;
    });

    return (
        <Table>
            <Table.Head>
                <Table.Row>
                    <Table.Cell>Component</Table.Cell>
                    <Table.Cell>Initial (ppm)</Table.Cell>
                    {phases.map((phase) => (
                        <Table.Cell key={phase.kind}>
                            {phase.kind} ({formatPhaseFraction(phase.fraction)})
                        </Table.Cell>
                    ))}
                </Table.Row>
            </Table.Head>
            <Table.Body>
                {visibleComponents.map((key) => (
                    <Table.Row key={key}>
                        <Table.Cell>{key}</Table.Cell>
                        <Table.Cell>{formatConcentration(initialConcentrations[key] ?? 0)}</Table.Cell>
                        {phases.map((phase) => (
                            <Table.Cell key={phase.kind}>
                                {formatConcentration(phase.concentrations[key] ?? 0)}
                            </Table.Cell>
                        ))}
                    </Table.Row>
                ))}
            </Table.Body>
        </Table>
    );
};

export default PhaseResultTable;
