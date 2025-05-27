import React, { useRef, useState } from "react";
import styled from "styled-components";
import { Button, Icon, Tooltip, Menu, TopBar as EDS_TopBar, Typography } from "@equinor/eds-core-react";
import { account_circle, help_outline, notifications, bubble_chart } from "@equinor/eds-icons";

import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import config from "../configuration";
import { Link } from "react-router-dom";
const Icons = styled.div`
    display: flex;
    align-items: center;
    flex-direction: row-reverse;
    > * {
        margin-left: 10px;
    }
`;

const TopbarContainer = styled.div`
    position: fixed;
    top: 0;
    width: 100%;
    z-index: 1000;
`;

const TopBar: React.FC = () => {
    const { instance, accounts } = useMsal();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const isAuthenticated = useIsAuthenticated();

    const openProfileMenu = () => {
        setIsProfileOpen(true);
    };

    const closeProfileMenu = () => {
        setIsProfileOpen(false);
    };

    const account = accounts[0];
    const profileButton = useRef<HTMLElement>(null);
    return (
        <TopbarContainer>
            <EDS_TopBar elevation="raised" sticky>
                <EDS_TopBar.Header>
                    <img src="/title.svg" height={"30px"}/>
                </EDS_TopBar.Header>
                <EDS_TopBar.Actions>
                    <Icons>
                        <Tooltip title="Account">
                            <Button
                                ref={profileButton}
                                variant="ghost_icon"
                                style={{
                                    width: 150,
                                }}
                                id="anchor-compact"
                                aria-haspopup="true"
                                aria-expanded={isProfileOpen}
                                aria-controls="menu-match"
                                onClick={() => (isProfileOpen ? closeProfileMenu() : openProfileMenu())}
                            >
                                <Icon data={account_circle} />
                            </Button>
                        </Tooltip>
                        <Menu
                            open={isProfileOpen}
                            anchorEl={profileButton.current}
                            id="menu-compact"
                            aria-labelledby="anchor-compact"
                            onClose={closeProfileMenu}
                        >
                            <Typography group="heading" as="span" variant="h6">
                                {" "}
                                {account?.name}{" "}
                            </Typography>
                            {isAuthenticated ? (
                                <Menu.Item
                                    onClick={() => {
                                        instance.logoutRedirect({
                                            account: instance.getActiveAccount(),
                                            postLogoutRedirectUri: window.location.origin,
                                        });
                                    }}
                                >
                                    Sign out
                                </Menu.Item>
                            ) : (
                                <Menu.Item
                                    onClick={() => {
                                        instance.loginRedirect({
                                            scopes: [config.API_SCOPE],
                                        });
                                    }}
                                    style={{
                                        justifyContent: "space-between",
                                    }}
                                >
                                    Sign in
                                </Menu.Item>
                            )}
                        </Menu>
                        <Tooltip title="Help">
                            <Link to="/help">
                                <Button variant="ghost_icon">
                                    <Icon data={help_outline} />
                                </Button>
                            </Link>
                        </Tooltip>
                    </Icons>
                </EDS_TopBar.Actions>
            </EDS_TopBar>
        </TopbarContainer>
    );
};

export default TopBar;
