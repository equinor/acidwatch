// src/components/SideBar.tsx
import React from "react";
import styled from "styled-components";
import { Divider, SideBar as EDS_SideBar, SidebarLinkProps } from "@equinor/eds-core-react";
import { Link } from "react-router-dom";
import { home, launch, settings, favorite_outlined } from "@equinor/eds-icons";

const SidebarContainer = styled.div`
    position: fixed;
    top: 50px; /* Adjust this value based on the height of your TopBar */
    width: 80px; /* Adjust the width of the sidebar as needed */
    height: calc(100vh - 50px); /* Ensure it spans the entire height of the page */
    overflow-y: auto; /* Enable scrolling if the content exceeds the viewport height */
    transition: width 0.3s; /* Smooth transition for expanding/collapsing */
`;

interface CustomSidebarLinkProps extends SidebarLinkProps {
    path: string;
}

const sidemenuItems: CustomSidebarLinkProps[] = [
    {
        label: "Dashboard",
        icon: home,
        path: "/",
    },
    {
        label: "ARCS",
        icon: launch,
        path: "/arcs",
    },
    {
        label: "Settings",
        icon: settings,
        path: "/settings",
    },
    {
        label: "Favourites",
        icon: favorite_outlined,
        path: "/favourites",
    },
];

const SideBar: React.FC = () => {
    return (
        <SidebarContainer>
            <EDS_SideBar>
                <EDS_SideBar.Content>
                    <Divider size="2" color="light" style={{ marginBlockEnd: 0 }} />
                    {sidemenuItems.map((m) => (
                        <EDS_SideBar.Link key={m.label} as={Link} to={m.path} {...m} />
                    ))}
                </EDS_SideBar.Content>
            </EDS_SideBar>
        </SidebarContainer>
        
    );
};

export default SideBar;
