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
import HelpPage from "./pages/HelpPage";

const Main = styled.div`
    display: flex;
    margin-top: 55px;
    height: calc(100vh - 55px);
`;

const Content = styled.div`
    flex: 1;
    padding: 30px;
    overflow-y: auto;
    #background-color: #deecee;
    min-width: 0;
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
                        <Route path="/models" element={<InputForm />} />
                        <Route path="/results" element={<ResultsPage />} />
                        <Route path="/help" element={<HelpPage />} />
                    </Routes>
                </Content>
            </Main>
            <ErrorDialog />
        </Router>
    );
};

export default App;
