import React from "react";
import styled from "styled-components";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import TopBar from "./components/TopBar";
import Dashboard from "./pages/Home";
import SimulationList from "./pages/SimulationList";
import ErrorDialog from "./components/ErrorDialog";
import LabResults from "./pages/LabResults";
import HelpPage from "./pages/HelpPage";
import SimulationResult from "./pages/SimulationResult";
import DynamicBreadcrumbs from "./components/DynamicBreadcrumbs";
import Models from "./pages/Models";
import { AvailableModelsProvider } from "./contexts/ModelContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { SimulationHistoryProvider } from "./contexts/SimulationHistoryContext";

const AppContainer = styled.div`
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
`;

const TopbarContainer = styled.div`
    height: 50px;
`;
const Main = styled.div`
    display: flex;
    flex: 1;
    overflow: hidden;
`;
const Content = styled.div`
    flex: 1;
    overflow-y: auto;
    #background-color: #deecee;
    padding: 30px;
`;
const BreadcrumbContainer = styled.div`
    margin-bottom: 20px;
`;

const providers: React.FC<{ children: React.ReactNode }>[] = [SettingsProvider, AvailableModelsProvider, SimulationHistoryProvider, Router];

const routes: Record<string, React.FC> = {
    "/": Dashboard,
    "/project/:projectId": SimulationList,
    "/project/:projectId/input": Models,
    "/project/:projectId/simulation/:simulationId": SimulationResult,
    "/models": () => <Navigate to="/simulations" replace />,
    "/simulations/:simulationId?": Models,
    "/labresults": LabResults,
    "/help": HelpPage,
};

const Layout: React.FC = () => (
    <AppContainer>
        <TopbarContainer>
            <TopBar />
        </TopbarContainer>
        <Main>
            <Content>
                <BreadcrumbContainer>
                    <DynamicBreadcrumbs />
                </BreadcrumbContainer>
                <Routes>
                    {Object.entries(routes).map(([path, component], index) => (
                        <Route key={index} path={path} element={React.createElement(component)} />
                    ))}
                </Routes>
            </Content>
        </Main>
        <ErrorDialog />
    </AppContainer>
);

const App: React.FC = () =>
    providers.reduceRight((previous, current) => React.createElement(current, null, previous), <Layout />);

export default App;
