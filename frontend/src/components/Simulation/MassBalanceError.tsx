import { Accordion, Card, Table, Typography } from "@equinor/eds-core-react";
import { useEffect, useState } from "react";
import { Phase } from "@/dto/SimulationResults";
import { parseFormula } from "@/functions/FormulaParser";

const ERROR_THRESHOLD = 1e-3;

export function getMasses(concs: Record<string, number>): Record<string, number> {
    const masses: Record<string, number> = {};

    for (const [subst, conc] of Object.entries(concs)) {
        const atoms = parseFormula(subst);
        for (const [name, num] of Object.entries(atoms)) {
            masses[name] = (masses[name] ?? 0) + num * conc;
        }
    }

    return masses;
}

export function getMassBalanceError(
    initPhases: Phase[],
    finalPhases: Phase[]
): {
    error: number;
    initMasses: Record<string, number>;
    finalMasses: Record<string, number>;
    substances: string[];
} {
    const initMasses = getMasses(mergePhasesConcentrations(initPhases));
    const finalMasses = getMasses(mergePhasesConcentrations(finalPhases));
    const substances = Array.from(new Set([...Object.keys(initMasses), ...Object.keys(finalMasses)]));

    let error = 0;

    for (const subst of substances) {
        const epsilon = 1e-9;
        const a = (initMasses[subst] ?? 0) + epsilon;
        const b = (finalMasses[subst] ?? 0) + epsilon;
        error = Math.max(Math.abs(2 - a / b - b / a), error);
    }

    // "Normalise" the error score: Values < 1 indicate no or little error,
    // values >= 1 indicate significant error.
    error /= ERROR_THRESHOLD;

    return { error, initMasses, finalMasses, substances };
}

export function mergePhasesConcentrations(phases: Phase[]): Record<string, number> {
    const merged: Record<string, number> = {};
    for (const phase of phases) {
        for (const [substance, conc] of Object.entries(phase.concentrations)) {
            merged[substance] = (merged[substance] ?? 0) + conc * phase.fraction;
        }
    }
    return merged;
}

interface MassBalanceErrorProps {
    initialPhases: Phase[];
    finalPhases: Phase[];
}

export function MassBalanceError({ initialPhases, finalPhases }: MassBalanceErrorProps) {
    const [isExpanded, setExpanded] = useState<boolean>(false);
    const { error, initMasses, finalMasses, substances } = getMassBalanceError(initialPhases, finalPhases);
    const significantError = error >= 1;

    useEffect(() => {
        setExpanded(significantError);
    }, [significantError]);

    return (
        <Accordion>
            <Accordion.Item isExpanded={isExpanded} onExpandedChange={setExpanded}>
                <Accordion.Header>Mass balance information</Accordion.Header>
                <Accordion.Panel>
                    <Card variant={significantError ? "danger" : "default"}>
                        {significantError && (
                            <Card.Header>
                                <Card.HeaderTitle>
                                    <Typography variant="h3">
                                        AcidWatch has detected a large error in mass balance. Report this to the
                                        AcidWatch team!
                                    </Typography>
                                </Card.HeaderTitle>
                            </Card.Header>
                        )}
                        <Card.Content style={{ gap: "1rem" }}>
                            <Typography variant="body_long">
                                In physics, the input and output should match exactly due to conservation of mass.
                                However, computer simulations are inexact and are prone to numerical errors. These
                                errors are small, but accumulate proportionally to the complexity of the model. A small
                                error may be normal, but a large error is indicative of a bug in the model.
                            </Typography>
                            <Typography variant="body_short" bold>
                                Mass-balance error score: {error}
                            </Typography>
                            <Typography variant="body_short">
                                A value of 0 means the input and output correspond exactly. In most cases, the error
                                will be slightly above 0, but quite small. If the error is above (or close to) 1,
                                contact the AcidWatch team.
                            </Typography>
                            <Table>
                                <Table.Head>
                                    <Table.Row>
                                        <Table.Cell></Table.Cell>
                                        <Table.Cell>In</Table.Cell>
                                        <Table.Cell>Out</Table.Cell>
                                    </Table.Row>
                                </Table.Head>
                                <Table.Body>
                                    {substances.map((name) => (
                                        <Table.Row key={name}>
                                            <Table.Cell>{name}</Table.Cell>
                                            <Table.Cell>{initMasses[name]}</Table.Cell>
                                            <Table.Cell>{finalMasses[name]}</Table.Cell>
                                        </Table.Row>
                                    ))}
                                </Table.Body>
                            </Table>
                        </Card.Content>
                    </Card>
                </Accordion.Panel>
            </Accordion.Item>
        </Accordion>
    );
}
