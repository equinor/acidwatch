import { Table } from "@equinor/eds-core-react";
import { Phase } from "@/dto/SimulationResults";
import { formatConcentration, formatPhaseFraction, StackedSimulation } from "@/functions/Formatting";
import { ppmMolToWeightPercent } from "@/functions/UnitConversion";
import { phaseLabel, phaseUnit } from "@/utils/modelUtils";

interface PhaseResultTableProps {
    simulations: StackedSimulation[];
}

function convertUnitAccordingToPhase(phase: Phase): Record<string, number> {
    if (phase.kind === "aqueous") {
        return ppmMolToWeightPercent(phase.concentrations);
    }
    return phase.concentrations;
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
    return `${phaseLabel(phase.kind)} [${phaseUnit(phase.kind)}]${fraction}`;
}

function weightedTotal(phases: Phase[], component: string): number {
    return phases.reduce((sum, phase) => sum + (phase.concentrations[component] ?? 0) * phase.fraction, 0);
}

const solidLine = { borderLeft: "2px solid #dcdcdc" };

function groupBorderStyle(isFirstGroup: boolean, phaseIndex: number): React.CSSProperties | undefined {
    return !isFirstGroup && phaseIndex === 0 ? solidLine : undefined;
}

const PhaseResultTable: React.FC<PhaseResultTableProps> = ({ simulations }) => {
    const hasSimulationHeader = simulations.length > 1;

    const initialGroup = buildPhaseGroup("Initial", [
        { kind: "co2-rich", fraction: 1, concentrations: simulations[0]?.inputConcentrations ?? {} },
        { kind: "aqueous", fraction: 0, concentrations: {} },
    ]);
    const finalGroups = simulations.map((sim) => buildPhaseGroup("Final", sim.phases));
    const groups = [initialGroup, ...finalGroups];
    const finalColSpan = finalGroups.reduce((sum, group) => sum + group.colSpan, 0);

    const visibleComponents = Array.from(
        new Set(groups.flatMap((group) => group.phases.flatMap((phase) => Object.keys(phase.concentrations))))
    ).filter(
        (component) =>
            component != "CO2" &&
            groups.some((group) => group.phases.some((phase) => (phase.concentrations[component] ?? 0) >= 0.001))
    );

    return (
        <Table>
            <Table.Head>
                <Table.Row>
                    <Table.Cell rowSpan={hasSimulationHeader ? 3 : 2}>Component</Table.Cell>
                    <Table.Cell
                        colSpan={initialGroup.colSpan}
                        rowSpan={hasSimulationHeader ? 2 : 1}
                        style={{ textAlign: "center" }}
                    >
                        Initial
                    </Table.Cell>
                    <Table.Cell colSpan={finalColSpan} style={{ textAlign: "center", ...solidLine }}>
                        Final
                    </Table.Cell>
                </Table.Row>
                {hasSimulationHeader && (
                    <Table.Row>
                        {finalGroups.map((group, simIndex) => (
                            <Table.Cell
                                key={simIndex}
                                colSpan={group.colSpan}
                                style={{ textAlign: "center", ...solidLine }}
                            >
                                {simulations[simIndex].label}
                            </Table.Cell>
                        ))}
                    </Table.Row>
                )}
                <Table.Row>
                    {groups.flatMap((group, groupIndex) => {
                        const cells = group.phases.map((phase, phaseIndex) => (
                            <Table.Cell
                                key={`${groupIndex}-${phase.kind}`}
                                style={groupBorderStyle(groupIndex === 0, phaseIndex)}
                            >
                                {phaseColumnHeader(phase)}
                            </Table.Cell>
                        ));
                        if (group.showTotal) {
                            cells.push(<Table.Cell key={`${groupIndex}-total`}>Total [ppm·mol]</Table.Cell>);
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
                                    key={`${groupIndex}-${group.phases[phaseIndex].kind}`}
                                    style={groupBorderStyle(groupIndex === 0, phaseIndex)}
                                >
                                    {formatConcentration(concentrations[component] ?? 0)}
                                </Table.Cell>
                            ));
                            if (group.showTotal) {
                                cells.push(
                                    <Table.Cell key={`${groupIndex}-total`}>
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
