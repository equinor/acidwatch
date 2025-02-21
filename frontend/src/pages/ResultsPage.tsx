import React, { useEffect, useState } from "react";
import { Table, Typography } from "@equinor/eds-core-react";
import { concentrations, getLabResults } from "../api/api";
import Plot from "../components/Plot"; // Correctly import the Plot component

const ResultsPage: React.FC = () => {
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setErrorr] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getLabResults();
                setResults(data);
            } catch (error) {
                console.error(error);
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

    const plotData = {
        Initial: {
            CO2: 1,
            H2O: 20,
            H2S: 30,
            SO2: 10,
            NO2: 50,
            HNO3: 0,
            NH3: 0,
            HNO2: 0,
            N2: 0,
            NOHSO4: 0,
        },
        LabResult: {
            CO2: 1,
            H2O: 18,
            H2S: 24,
            SO2: 11,
            NO2: 36,
            HNO3: 0.7,
            NH3: 1.85,
            HNO2: 2.5,
            N2: 2.47,
            NOHSO4: 3.63,
        },
        Arcs: {
            CO2: 1,
            H2O: 21,
            H2S: 27,
            SO2: 9,
            NO2: 40,
            HNO3: 1,
            NH3: 2,
            HNO2: 2,
            N2: 5,
            NOHSO4: 6,
        },
        Co2SpecDemo: {
            CO2: 1,
            H2O: 30,
            H2S: 25,
            SO2: 15,
            NO2: 32,
            HNO3: 8,
            NH3: 9,
            HNO2: 12,
            N2: 7,
            NOHSO4: 12,
        },
    };

    return (
        <div>
            <h2>Demo plot</h2>
            <Plot data={plotData} />

            <h2>Demo results</h2>
            {results.map((dataItem, index) => (
                <div key={index}>
                    <h2>{dataItem.name}</h2>
                    <Table>
                        <Table.Head>
                            <Table.Row>
                                <Table.Cell rowSpan={2}>ID</Table.Cell>
                                <Table.Cell rowSpan={2}>Time</Table.Cell>
                                <Table.Cell
                                    colSpan={
                                        Object.keys(dataItem.entries[0].input_concentrations as concentrations).length
                                    }
                                >
                                    Input Concentrations
                                </Table.Cell>
                                <Table.Cell
                                    colSpan={
                                        Object.keys(dataItem.entries[0].output_concentrations as concentrations).length
                                    }
                                >
                                    Output Concentrations
                                </Table.Cell>
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
                            {dataItem.entries.map((entry: any) => (
                                <React.Fragment key={entry.id}>
                                    <Table.Row>
                                        <Table.Cell>{entry.id}</Table.Cell>
                                        <Table.Cell>{entry.time}</Table.Cell>
                                        {Object.entries(entry.input_concentrations as concentrations).map(
                                            ([_, value], idx) => (
                                                <Table.Cell key={idx}>{value}</Table.Cell>
                                            )
                                        )}
                                        {Object.entries(entry.output_concentrations as concentrations).map(
                                            ([, value], idx) => (
                                                <Table.Cell key={idx}>{value}</Table.Cell>
                                            )
                                        )}
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
