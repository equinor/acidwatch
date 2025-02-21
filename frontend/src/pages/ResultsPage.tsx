import React, { useEffect, useState } from "react";
import { Table } from "@equinor/eds-core-react";
import { getLabResults, concentrations } from "../api/api";
import { ExperimentResult } from "../dto/ExperimentResult";

const ResultsPage: React.FC = () => {
    const [results, setResults] = useState<ExperimentResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setErrorr] = useState<string | null>(null);
    const [headers, setHeaders] = useState<Record<string, string[]>>({});
    //const { instance, accounts } = useMsal();
    //const account = useAccount(accounts[0] || {});

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data: ExperimentResult[] = await getLabResults();
                setResults(data);
                const initial_conc = Array.from(
                    new Set(data.flatMap((entry) => [...Object.keys(entry.initial_concentrations)]))
                );
                const final_conc = Array.from(
                    new Set(data.flatMap((entry) => [...Object.keys(entry.final_concentrations)]))
                );
                setHeaders({ initial_concentrations: initial_conc, final_concentrations: final_conc });
            } catch (error) {
                setErrorr(String(error));
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <div>
            <h1>Results</h1>
            <Table>
                <Table.Head>
                    <Table.Row>
                        <Table.Cell rowSpan={2}>Experiment</Table.Cell>
                        <Table.Cell rowSpan={2}>Time</Table.Cell>
                        <Table.Cell colSpan={Object.keys(headers["initial_concentrations"]).length}>
                            Input Concentrations
                        </Table.Cell>
                        <Table.Cell colSpan={Object.keys(headers["final_concentrations"]).length}>
                            Output Concentrations
                        </Table.Cell>
                    </Table.Row>
                    <Table.Row>
                        {headers["initial_concentrations"].map((header) => (
                            <Table.Cell key={"initial-" + header}>{header}</Table.Cell>
                        ))}
                        {headers["final_concentrations"].map((header) => (
                            <Table.Cell key={"final-" + header}>{header}</Table.Cell>
                        ))}
                    </Table.Row>
                </Table.Head>
                <Table.Body>
                    {results.map((dataItem, index) => (
                        <React.Fragment key={index}>
                            <Table.Row>
                                <Table.Cell>{dataItem.name}</Table.Cell>
                                <Table.Cell>{dataItem.time}</Table.Cell>
                                {Object.entries(dataItem.initial_concentrations as concentrations).map(
                                    ([_, value], idx) => (
                                        <Table.Cell key={idx}>{value}</Table.Cell>
                                    )
                                )}
                                {Object.entries(dataItem.final_concentrations as concentrations).map(
                                    ([_, value], idx) => (
                                        <Table.Cell key={idx}>{value}</Table.Cell>
                                    )
                                )}
                            </Table.Row>
                        </React.Fragment>
                    ))}
                </Table.Body>
            </Table>
        </div>
    );
};

export default ResultsPage;
