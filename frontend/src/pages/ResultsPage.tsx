import React, { useEffect, useState } from "react";
import { useMsal, useAccount } from "@azure/msal-react";
import { getUserToken } from "../services/auth";
import { Table, Typography } from "@equinor/eds-core-react";
const ResultsPage: React.FC = () => {
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setErrorr] = useState<string | null>(null);
    const { instance, accounts } = useMsal();
    const account = useAccount(accounts[0] || {});
    const scope = "d2e2c318-b49a-4174-b4b4-256751558dc5/user_impersonation";
    useEffect(() => {
        const fetchData = async () => {
            try {
                console.log("Fetching results");
                const token = await getUserToken(scope);
                console.log("Token: ", token);
                const response = await fetch("oasis/CO2LabResults", {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: "Bearer " + token,
                    },
                });
                if (!response.ok) {
                    throw new Error("Network response was not ok");
                }
                const data = await response.json();
                setResults(data);
            } catch (error) {
                setErrorr(String(error));
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [instance, account]);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <div>
            <h1>Results</h1>
            {results.map((result) => (
                <div key={result.id}>
                    <h2>{result.data.general.name}</h2>
                    <h3>Concentrations</h3>
                    <Table>
                        <Table.Head>
                            <Table.Row>
                                <Table.Cell>Time</Table.Cell>
                                {result.data.inputConcentrations.listInputConcentrations.repeatableDefs.species.map(
                                    (species: string) => (
                                        <Table.Cell key={species}>{species}</Table.Cell>
                                    )
                                )}
                            </Table.Row>
                        </Table.Head>
                        <Table.Body>
                            {result.data.inputConcentrations.listInputConcentrations.entries.map((entry: any) => (
                                <Table.Row key={entry.id}>
                                    <Table.Cell>{entry.time}</Table.Cell>
                                    {result.data.inputConcentrations.listInputConcentrations.repeatableDefs.species.map(
                                        (species: string) => (
                                            <Table.Cell key={species}>{entry.species[species]}</Table.Cell>
                                        )
                                    )}
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table>
                </div>
            ))}
        </div>
    );
};

export default ResultsPage;
