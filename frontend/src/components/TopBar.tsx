import React, { useRef, useState } from "react";
import { Button, Icon, Tooltip, Menu, TopBar as EDS_TopBar, Typography } from "@equinor/eds-core-react";
import { account_circle, help_outline, log_out, log_in, thermostat } from "@equinor/eds-icons";

import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import config from "@/configuration";
import { Link } from "react-router-dom";
import { useSettings } from "@/contexts/SettingsContext";

const TemperatureToggle: React.FC = () => {
    const { temperature, nextTemperature } = useSettings();

    return (
        <Button variant="ghost" onClick={nextTemperature}>
            <Icon data={thermostat} />
            {temperature.unit}
        </Button>
    );
};

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
        <EDS_TopBar elevation="raised" sticky>
            <EDS_TopBar.Header>
                <Button href="/" variant="ghost">
                    <img src="/title.svg" height="30px" />
                </Button>
            </EDS_TopBar.Header>
            <EDS_TopBar.Actions>
                <TemperatureToggle />
                <Tooltip title="Account">
                    <Button
                        ref={profileButton}
                        variant="ghost_icon"
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
                    <Typography
                        group="heading"
                        as="span"
                        variant="h6"
                        style={{
                            display: "block",
                            textAlign: "center",
                            padding: "10px",
                        }}
                    >
                        {" "}
                        {account?.name} {account?.username ? `(${account.username})` : ""}
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
                            <Icon data={log_out} />
                            Sign out
                        </Menu.Item>
                    ) : (
                        <Menu.Item
                            onClick={() => {
                                instance.loginRedirect({
                                    scopes: [config.API_SCOPE],
                                });
                            }}
                        >
                            {" "}
                            <Icon data={log_in} />
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
            </EDS_TopBar.Actions>
        </EDS_TopBar>
    );
};

export default TopBar;
