
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, Brush } from 'recharts';

const TestGraph: React.FC = () => {
    const data = [
        { name: "H2S", Arcs: 40, LabData: 55 },
        { name: "H2SO4", Arcs: 80, LabData: 50 },
        { name: "H2CO3", Arcs: 90, LabData: 91 },
        { name: "H2O", Arcs: 35, LabData: 30 },
        { name: "NO3", Arcs: 10, LabData: 0 },
        { name: "CO2", Arcs: 10, LabData: 30},
        { name: "HCl", Arcs: 100, LabData: 60 },
        { name: "SCO", Arcs: 40, LabData: 20 },
      ];

      const [activeSeries, setActiveSeries] = React.useState<Array<string>>([]);

      const handleLegendClick = (dataKey: string) => {
        if (activeSeries.includes(dataKey)) {
          setActiveSeries(activeSeries.filter(el => el !== dataKey));
        } else {
          setActiveSeries(prev => [...prev, dataKey]);
        }
      };

    return (
        <div >
            <div style={{ width: '600px' }}>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data} >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    {Object.keys(data[0]).filter((item) => item!=="name").map((item: string) => {
                        const color = item === "Arcs" ? "blue":"red";
                        return <Line hide={activeSeries.includes(item)} type="monotone" dataKey={item} stroke="none" fill={color} />
                    })}
                    <Legend height={36} verticalAlign='top' iconType="circle" onClick={props => handleLegendClick(String(props.dataKey))} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    )      
}
export default TestGraph
