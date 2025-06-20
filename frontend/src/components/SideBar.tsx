import React from "react";
import { Divider, SideBar as EDS_SideBar, SidebarLinkProps } from "@equinor/eds-core-react";
import { NavLink } from "react-router-dom";
import { home, launch, opacity } from "@equinor/eds-icons";

const StyledNavLink = ({ to, children, ...rest }: any) => {
    return (
        <NavLink to={to} style={({ isActive }) => (isActive ? { backgroundColor: "#DEECEE" } : {})} {...rest}>
            {children}
        </NavLink>
    );
};

interface CustomSidebarLinkProps extends SidebarLinkProps {
    path: string;
}

const sidemenuItems: CustomSidebarLinkProps[] = [
    {
        label: "Home",
        icon: home,
        path: "/",
    },
    {
        label: "Models",
        icon: launch,
        path: "/models",
    },
    {
        label: "Lab results",
        icon: opacity,
        path: "/labresults",
    },
];

const SideBar: React.FC = () => {
    return (
        <EDS_SideBar>
            <EDS_SideBar.Content>
                <Divider size="2" color="light" style={{ marginBlockEnd: 0 }} />
                {sidemenuItems.map((m) => (
                    <EDS_SideBar.Link key={m.label} as={StyledNavLink} to={m.path} {...m} />
                ))}
            </EDS_SideBar.Content>
            <EDS_SideBar.Toggle />
        </EDS_SideBar>
    );
};

export default SideBar;
