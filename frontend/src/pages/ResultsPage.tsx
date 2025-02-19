import React, { useEffect, useState } from "react";
import { Table} from "@equinor/eds-core-react";
import { getLabResults,concentrations } from "../api/api";

const ResultsPage: React.FC = () => {
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setErrorr] = useState<string | null>(null);
    //const { instance, accounts } = useMsal();
    //const account = useAccount(accounts[0] || {});

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getLabResults();
                setResults(data);
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
    console.log(results);
    return (
        <div>
            <h1>Results</h1>
            {results.map((dataItem, index) => (
                <div key={index}>
                    <h2>{dataItem.name}</h2>
                    <Table>
                        <Table.Head>
                            <Table.Row>
                                <Table.Cell rowSpan ={2}>ID</Table.Cell>
                                <Table.Cell rowSpan={2}>Time</Table.Cell>
                                <Table.Cell colSpan={Object.keys(dataItem.entries[0].input_concentrations as concentrations).length}>Input Concentrations</Table.Cell>
                                <Table.Cell colSpan={Object.keys(dataItem.entries[0].output_concentrations as concentrations).length}>Output Concentrations</Table.Cell>
                            </Table.Row>
                            <Table.Row>
                                {Object.keys(dataItem.entries[0].input_concentrations).map((key, idx) => (
                                    <Table.Cell key={idx}>{key}</Table.Cell>
                                ))}
                                {Object.keys(dataItem.entries[0].output_concentrations).map((key, idx) => (
                                    <Table.Cell key={idx}>{key}</Table.Cell>
                                ))}
                            </Table.Row>
                        </Table.Head>
                        <Table.Body>
                            {dataItem.entries.map((entry : any) => (
                                <React.Fragment key={entry.id}>
                                    <Table.Row>
                                        <Table.Cell>{entry.id}</Table.Cell>
                                        <Table.Cell>{entry.time}</Table.Cell>
                                        {Object.entries(entry.input_concentrations as concentrations).map(([_, value], idx) => (
                                            <Table.Cell key={idx}>{value}</Table.Cell>
                                        ))}
                                        {Object.entries(entry.output_concentrations as concentrations).map(([, value], idx) => (
                                            <Table.Cell key={idx}>{value}</Table.Cell>
                                        ))}
                                    </Table.Row>
                                </React.Fragment>
                            ))}
                        </Table.Body>
                    </Table>
                </div>
            ))}
        </div>
    );
};

export default ResultsPage;
