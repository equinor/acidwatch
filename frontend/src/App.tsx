import React from "react";
import styled from "styled-components";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

import TopBar from "./components/TopBar";
import SideBar from "./components/SideBar";
import { Dashboard, Settings, Favourites } from "./pages/Sample";
import ArcsForm from "./pages/ArcsForm";

const Main = styled.div`
  display: flex;
  margin-top: 55px;
`;

const Content = styled.div`
  position: fixed;
  top: 50px;
  left: 80px;
  right: 0;
  bottom: 0;
  padding: 20px;
  overflow-y: auto;
`;

const App: React.FC = () => {
  return (
    <Router>
      <div>
        <TopBar />
        <Main>
          <SideBar />
          <div style={{ display: "flex", height: "400px", overflow: "auto" }}>
            <Content>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/arcs" element={<ArcsForm />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/favourites" element={<Favourites />} />
              </Routes>
            </Content>
          </div>
        </Main>
      </div>
    </Router>
  );
};

export default App;
