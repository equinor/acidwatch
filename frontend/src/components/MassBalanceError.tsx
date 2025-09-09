import { Accordion, Card, Table, Typography } from "@equinor/eds-core-react";
import { useEffect, useState } from "react";

const ERROR_THRESHOLD = 1e-3;

export function getMasses(concs: Record<string, number>): Record<string, number> {
    const masses: Record<string, number> = {};

    for (const [subst, amount] of Object.entries(concs)) {
        for (const m of subst.matchAll(/([A-Z][a-z]?)(\d*)/g)) {
            const atom = m[1];
            const mult = m[2] ? Number.parseInt(m[2]) : 1;

            masses[atom] ??= 0;
            masses[atom] += mult * amount;
        }
    }

    return masses;
}

export function getMassBalanceError(
    init: Record<string, number>,
    final: Record<string, number>
): {
    error: number;
    initMasses: Record<string, number>;
    finalMasses: Record<string, number>;
    substances: string[];
} {
    const initMasses = getMasses(init);
    const finalMasses = getMasses(final);
    const substances = Array.from(new Set([...Object.keys(initMasses), ...Object.keys(finalMasses)]));

    let error = 0;

    for (const subst of substances) {
        const epsilon = 1e-36;
        const a = (initMasses[subst] ?? 0) + epsilon;
        const b = (finalMasses[subst] ?? 0) + epsilon;
        error = Math.max(Math.abs(2 - a / b - b / a), error);
        Math.abs(a - b);
    }

    // "Normalise" the error score: Values < 1 indicate no or little error,
    // values >= 1 indicate significant error.
    error /= ERROR_THRESHOLD;

    return { error, initMasses, finalMasses, substances };
}

interface MassBalanceErrorProps {
    initial: Record<string, number>;
    final: Record<string, number>;
}

export function MassBalanceError({ initial, final }: MassBalanceErrorProps) {
    const [isExpanded, setExpanded] = useState<boolean>(false);
    const { error, initMasses, finalMasses, substances } = getMassBalanceError(initial, final);
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
