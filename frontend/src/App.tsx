import React from "react";
import styled from "styled-components";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

import TopBar from "./components/TopBar";
import SideBar from "./components/SideBar";
import Dashboard from "./pages/Home";
import InputForm from "./pages/InputForm";
import SimulationList from "./pages/SimulationList";
import Results from "./pages/Results";
import ErrorDialog from "./components/ErrorDialog";
import ResultsPage from "./pages/ResultsPage";

const Main = styled.div`
    display: flex;
    margin-top: 55px;
`;

const Content = styled.div`
    position: fixed;
    top: 50px;
    left: 70px;
    right: 0;
    bottom: 0;
    padding: 30px;
    overflow-y: auto;
    display: "flex";
    height: "400px";
    backgroundcolor: "#DEECEE";
`;

const App: React.FC = () => {
    return (
        <Router>
            <TopBar />
            <Main>
                <SideBar />
                <Content>
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/project/:projectId" element={<SimulationList />} />
                        <Route path="/project/:projectId/input" element={<InputForm />} />
                        <Route path="/project/:projectId/:simulationId" element={<Results />} />
                        <Route path="/arcs" element={<InputForm />} />
                        <Route path="/results" element={<ResultsPage />} />
                    </Routes>
                </Content>
            </Main>
            <ErrorDialog />
        </Router>
    );
};

export default App;
