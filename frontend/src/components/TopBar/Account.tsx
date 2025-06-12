import React, { useRef, useState } from "react";
import { account_circle } from "@equinor/eds-icons";
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { Button, Icon, Tooltip, Menu } from "@equinor/eds-core-react";
import config from "../../configuration";

const Account: React.FC = () => {
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
        <>
            <Tooltip title="Account">
                <Button
                    ref={profileButton}
                    variant="ghost"
                    id="anchor-compact"
                    aria-haspopup="true"
                    aria-expanded={isProfileOpen}
                    aria-controls="menu-match"
                    onClick={() => (isProfileOpen ? closeProfileMenu() : openProfileMenu())}
                >
                    <Icon data={account_circle} />
                    {account?.name}
                </Button>
            </Tooltip>
            <Menu
                open={isProfileOpen}
                anchorEl={profileButton.current}
                id="menu-compact"
                aria-labelledby="anchor-compact"
                onClose={closeProfileMenu}
            >
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
        </>
    );
};

export default Account;
