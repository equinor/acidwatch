import React from "react";
import styled from "styled-components";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import TopBar from "./components/TopBar";
import SideBar from "./components/SideBar";
import Dashboard from "./pages/Home";
import SimulationList from "./pages/SimulationList";
import Results from "./pages/Results";
import ErrorDialog from "./components/ErrorDialog";
import LabResults from "./pages/LabResults";
import HelpPage from "./pages/HelpPage";
import DynamicBreadcrumbs from "./components/DynamicBreadcrumbs";
import Models from "./pages/Models";
import { AvailableModelsProvider } from "./contexts/ModelContext";
import { SimulationResultsProvider } from "./contexts/SimulationContext";
import { SettingsProvider } from "./contexts/SettingsContext";

const AppContainer = styled.div`
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
`;

const TopbarContainer = styled.div`
    height: 50px;
`;
const SidebarContainer = styled.div`
    height: 100%;
    overflow-y: auto;
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
const App: React.FC = () => {
    return (
        <SettingsProvider>
            <AvailableModelsProvider>
                <SimulationResultsProvider>
                    <Router>
                        <AppContainer>
                            <TopbarContainer>
                                <TopBar />
                            </TopbarContainer>
                            <Main>
                                <SidebarContainer>
                                    <SideBar />
                                </SidebarContainer>
                                <Content>
                                    <BreadcrumbContainer>
                                        <DynamicBreadcrumbs />
                                    </BreadcrumbContainer>
                                    <Routes>
                                        <Route path="/" element={<Dashboard />} />
                                        <Route path="/project/:projectId" element={<SimulationList />} />
                                        <Route path="/project/:projectId/input" element={<Models />} />
                                        <Route
                                            path="/project/:projectId/simulation/:simulationId"
                                            element={<Results />}
                                        />
                                        <Route path="/models" element={<Models />} />
                                        <Route path="/labresults" element={<LabResults />} />
                                        <Route path="/help" element={<HelpPage />} />
                                    </Routes>
                                </Content>
                            </Main>
                            <ErrorDialog />
                        </AppContainer>
                    </Router>
                </SimulationResultsProvider>
            </AvailableModelsProvider>
        </SettingsProvider>
    );
};

export default App;
