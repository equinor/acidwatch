import { Table } from "@equinor/eds-core-react";
import { Phase } from "@/dto/SimulationResults";
import { formatConcentration, formatPhaseFraction } from "@/functions/Formatting";
import { ppmMolToWeightPercent } from "@/functions/UnitConversion";

interface PhaseResultTableProps {
    initialConcentrations: Record<string, number>;
    phases: Phase[];
}

function unitLabel(phase: Phase): string {
    return phase.kind === "aqueous" ? "wt%" : "ppm";
}

function convertUnitAccordingToPhase(phase: Phase): Record<string, number> {
    if (phase.kind === "aqueous") {
        return ppmMolToWeightPercent(phase.concentrations);
    }
    return phase.concentrations;
}

function phaseLabel(phase: Phase): string {
    return phase.kind === "aqueous" ? "Aqueous" : "CO2-rich";
}

function sortPhases(phases: Phase[]): Phase[] {
    return [...phases].sort((a, b) => {
        if (a.kind === "co2-rich" && b.kind === "aqueous") return -1;
        if (a.kind === "aqueous" && b.kind === "co2-rich") return 1;
        return 0;
    });
}

interface PhaseGroup {
    label: string;
    phases: Phase[];
    displayData: Record<string, number>[];
    showTotal: boolean;
    colSpan: number;
}

function buildPhaseGroup(label: string, phases: Phase[]): PhaseGroup {
    const sorted = sortPhases(phases);
    const visible = sorted.filter((phase) => Object.values(phase.concentrations).some((v) => v > 0));
    const showTotal = visible.length > 1;
    return {
        label,
        phases: visible,
        displayData: visible.map((phase) => convertUnitAccordingToPhase(phase)),
        showTotal,
        colSpan: visible.length + (showTotal ? 1 : 0),
    };
}

function phaseColumnHeader(phase: Phase): string {
    const fraction = phase.fraction < 1 ? ` (${formatPhaseFraction(phase.fraction)})` : "";
    return `${phaseLabel(phase)} [${unitLabel(phase)}]${fraction}`;
}

function weightedTotal(phases: Phase[], component: string): number {
    return phases.reduce((sum, phase) => sum + (phase.concentrations[component] ?? 0) * phase.fraction, 0);
}

const solidLine = { borderLeft: "2px solid #dcdcdc" };

function groupBorderStyle(groupIndex: number, phaseIndex: number): React.CSSProperties | undefined {
    return groupIndex > 0 && phaseIndex === 0 ? solidLine : undefined;
}

const PhaseResultTable: React.FC<PhaseResultTableProps> = ({ initialConcentrations, phases }) => {
    const initialPhases: Phase[] = [
        { kind: "co2-rich", fraction: 1, concentrations: initialConcentrations },
        { kind: "aqueous", fraction: 0, concentrations: {} },
    ];

    const groups: PhaseGroup[] = [buildPhaseGroup("Initial", initialPhases), buildPhaseGroup("Final", phases)];

    const allComponents = Array.from(
        new Set([
            ...Object.keys(initialConcentrations),
            ...phases.flatMap((phase) => Object.keys(phase.concentrations)),
        ])
    );

    const visibleComponents = allComponents.filter((component) => {
        return groups.some((group) => group.phases.some((phase) => (phase.concentrations[component] ?? 0) >= 0.001));
    });

    return (
        <Table>
            <Table.Head>
                <Table.Row>
                    <Table.Cell rowSpan={2}>Component</Table.Cell>
                    {groups.map((group, groupIndex) => (
                        <Table.Cell
                            key={group.label}
                            colSpan={group.colSpan}
                            style={{ textAlign: "center", ...(groupIndex > 0 ? solidLine : {}) }}
                        >
                            {group.label}
                        </Table.Cell>
                    ))}
                </Table.Row>
                <Table.Row>
                    {groups.flatMap((group, groupIndex) => {
                        const cells = group.phases.map((phase, phaseIndex) => (
                            <Table.Cell
                                key={`${group.label}-${phase.kind}`}
                                style={groupBorderStyle(groupIndex, phaseIndex)}
                            >
                                {phaseColumnHeader(phase)}
                            </Table.Cell>
                        ));
                        if (group.showTotal) {
                            cells.push(<Table.Cell key={`${group.label}-total`}>Total [ppm]</Table.Cell>);
                        }
                        return cells;
                    })}
                </Table.Row>
            </Table.Head>
            <Table.Body>
                {visibleComponents.map((component) => (
                    <Table.Row key={component}>
                        <Table.Cell>{component}</Table.Cell>
                        {groups.flatMap((group, groupIndex) => {
                            const cells = group.displayData.map((concentrations, phaseIndex) => (
                                <Table.Cell
                                    key={`${group.label}-${group.phases[phaseIndex].kind}`}
                                    style={groupBorderStyle(groupIndex, phaseIndex)}
                                >
                                    {formatConcentration(concentrations[component] ?? 0)}
                                </Table.Cell>
                            ));
                            if (group.showTotal) {
                                cells.push(
                                    <Table.Cell key={`${group.label}-total`}>
                                        {formatConcentration(weightedTotal(group.phases, component))}
                                    </Table.Cell>
                                );
                            }
                            return cells;
                        })}
                    </Table.Row>
                ))}
            </Table.Body>
        </Table>
    );
};

export default PhaseResultTable;
