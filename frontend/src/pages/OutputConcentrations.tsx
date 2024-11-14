import React from 'react';
import Plot from 'react-plotly.js';
import { Table } from "@equinor/eds-core-react";

import { SimulationResults } from "../dto/SimulationResults";

interface ResultsProps {
  simulationResults: SimulationResults;
}

const Results: React.FC<ResultsProps> = ({ simulationResults }) => {
  const chartData = simulationResults.chart_data;
  const initFinalDiff = simulationResults.results.initfinaldiff;

  const comps = Object.values(chartData.comps);
  const values = Object.values(chartData.values);
  const variance = Object.values(chartData.variance);
  const varianceMinus = Object.values(chartData.variance_minus);

  return (
    
    <div>
      <Plot
        data={[
          {
            type: 'bar',
            x: comps,
            y: values,
            error_y: {
              type: 'data',
              array: variance,
              arrayminus: varianceMinus,
              visible: true,
            },
            
          },
        ]}
        layout={{ title: '' }}
      />
      
      <br></br>    
      <Table>
        <Table.Head>
          <Table.Row>
            <Table.Cell>Component</Table.Cell>
            <Table.Cell>Initial</Table.Cell>
            <Table.Cell>Final</Table.Cell>
            <Table.Cell>Change</Table.Cell>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          {Object.keys(initFinalDiff.initial).map((key, index) => (
            <Table.Row key={index}>
              <Table.Cell>{key}</Table.Cell>
              <Table.Cell>{initFinalDiff.initial[key]}</Table.Cell>
              <Table.Cell>{initFinalDiff.final[key]}</Table.Cell>
              <Table.Cell>{initFinalDiff.change[key]}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
      
    </div>
  );
};

export default Results;
