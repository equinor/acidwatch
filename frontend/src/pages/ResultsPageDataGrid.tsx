import React, { useEffect, useState } from "react";
import { Table } from "@equinor/eds-core-react";
import { EdsDataGrid } from '@equinor/eds-data-grid-react';
import { createColumnHelper } from '@tanstack/react-table';
import { getLabResults, concentrations } from "../api/api";
import { ExperimentResult } from "../dto/ExperimentResult";


const ResultsPageDataGrid: React.FC = () => {
    const [results, setResults] = useState<ExperimentResult[]>([]);
    const [headers, setHeaders] = useState<Record<string, string[]>>({});

    useEffect(() => {
        const fetchData = async () => {
            
                const data: ExperimentResult[] = await getLabResults();
                setResults(data);
                const initial_conc = Array.from(
                    new Set(data.flatMap((entry) => [...Object.keys(entry.initial_concentrations)]))
                );
                const final_conc = Array.from(
                    new Set(data.flatMap((entry) => [...Object.keys(entry.final_concentrations)]))
                );
                setHeaders({ initial_concentrations: initial_conc, final_concentrations: final_conc });
            
        };

        fetchData();
    }, []);

    

const helper = createColumnHelper<ExperimentResult>();
console.log(headers)
const columns = [helper.accessor('name', { header: 'Experiment' }), 
    helper.accessor('time', { header: 'Time' }),
    helper.accessor('initial_concentrations', { header: 'Input Concentrations' }),
    helper.accessor('final_concentrations', { header: 'Output Concentrations',  })]
                  //headers["initial_concentrations"].map((header) => (
                  //helper.accessor(header, { header: header })))
                  
                   





    const rows = results;
    console.log(rows);
    console.log(columns);
    return (
        <EdsDataGrid columns={columns} rows={rows} />
      )
    }
    export default ResultsPageDataGrid;


