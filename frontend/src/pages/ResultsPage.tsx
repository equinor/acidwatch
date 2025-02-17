import React, { useEffect, useState } from "react";
import { useMsal, useAccount } from "@azure/msal-react";
import { getUserToken } from "../services/auth";

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
                const response = await fetch("https://api-oasis-test.radix.equinor.com/CO2LabResults", {
                    mode: "no-cors",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
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
                    <h3>Input Concentrations</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Time</th>
                                {result.data.inputConcentrations.listInputConcentrations.repeatableDefs.species.map(
                                    (species: string) => (
                                        <th key={species}>{species}</th>
                                    )
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {result.data.inputConcentrations.listInputConcentrations.entries.map((entry: any) => (
                                <tr key={entry.id}>
                                    <td>{entry.time}</td>
                                    {result.data.inputConcentrations.listInputConcentrations.repeatableDefs.species.map(
                                        (species: string) => (
                                            <td key={species}>{entry.species[species]}</td>
                                        )
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <h3>Output Concentrations</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Time</th>
                                {result.data.outputConcentrations.listOutputConcentrations.repeatableDefs.species.map(
                                    (species: string) => (
                                        <th key={species}>{species}</th>
                                    )
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {result.data.outputConcentrations.listOutputConcentrations.entries.map((entry: any) => (
                                <tr key={entry.id}>
                                    <td>{entry.time}</td>
                                    {result.data.outputConcentrations.listOutputConcentrations.repeatableDefs.species.map(
                                        (species: string) => (
                                            <td key={species}>{entry.species[species]}</td>
                                        )
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <h3>Component Balance</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Time</th>
                                {result.data.componentBalance.listComponentBalance.repeatableDefs.species.map(
                                    (species: string) => (
                                        <th key={species}>{species}</th>
                                    )
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {result.data.componentBalance.listComponentBalance.entries.map((entry: any) => (
                                <tr key={entry.id}>
                                    <td>{entry.time}</td>
                                    {result.data.componentBalance.listComponentBalance.repeatableDefs.species.map(
                                        (species: string) => (
                                            <td key={species}>{entry.species[species]}</td>
                                        )
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <h3>OLI</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Time</th>
                                {result.data.oli.listOLI.repeatableDefs.species.map((species: string) => (
                                    <th key={species}>{species}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {result.data.oli.listOLI.entries.map((entry: any) => (
                                <tr key={entry.id}>
                                    <td>{entry.time}</td>
                                    {result.data.oli.listOLI.repeatableDefs.species.map((species: string) => (
                                        <td key={species}>{entry.species[species]}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ))}
        </div>
    );
};

export default ResultsPage;
