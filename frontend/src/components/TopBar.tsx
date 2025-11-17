import React, { useRef, useState } from "react";
import { Button, Icon, Menu, TopBar as EDS_TopBar } from "@equinor/eds-core-react";
import { help_outline, log_out, log_in, thermostat, launch, opacity, IconData, menu } from "@equinor/eds-icons";

import { useMsal } from "@azure/msal-react";
import config from "@/configuration";
import { Link } from "react-router-dom";
import { useSettings } from "@/contexts/SettingsContext";
import { LargeScreenOnly, SmallScreenOnly } from "@/components/styles";
import { useQuery } from "@tanstack/react-query";

type NavItem = {
    label: string;
    icon: IconData;
    path: string;
};

const navItems: NavItem[] = [
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
    {
        label: "Help",
        icon: help_outline,
        path: "/help",
    },
];

const TemperatureToggle: React.FC = () => {
    const { temperature, nextTemperature } = useSettings();

    return (
        <Button variant="ghost" onClick={nextTemperature}>
            <Icon data={thermostat} />
            {temperature.unit}
        </Button>
    );
};

const ProfilePhoto: React.FC = () => {
    const { instance } = useMsal();
    const account = instance.getActiveAccount();

    const { data: photo } = useQuery({
        queryKey: ["photo", account?.username],
        queryFn: async () => {
            const graphPhotoUrl = "https://graph.microsoft.com/v1.0/me/photo/$value";
            const graphScopes = ["User.Read"];

            const token = await instance.acquireTokenSilent({
                scopes: graphScopes,
                account: account!,
            });

            const response = await fetch(graphPhotoUrl, {
                headers: {
                    Authorization: `Bearer ${token.accessToken}`,
                },
            });

            if (!response.ok) {
                console.error("Could not obtain photo for user", account?.username, response.status);
                throw new Error();
            }

            const blob = await response.blob();
            return URL.createObjectURL(blob);
        },
        enabled: account !== null,
    });

    if (!account) return <div></div>;

    return <img src={photo} alt={account.username} width={24} height={24} style={{ borderRadius: "50%" }} />;
};

const SmallScreenActions: React.FC = () => {
    const ref = useRef<HTMLButtonElement | null>(null);
    const [open, setOpen] = useState<boolean>(false);
    const { temperature, nextTemperature } = useSettings();
    const { instance } = useMsal();

    const account = instance.getActiveAccount();

    return (
        <SmallScreenOnly>
            <Button variant="ghost_icon" onClick={() => setOpen(!open)} ref={ref}>
                <Icon data={menu} />
            </Button>
            <Menu open={open} onClose={() => setOpen(false)} anchorEl={ref.current}>
                <Menu.Section>
                    {navItems.map((item) => (
                        <Menu.Item as={Link} to={item.path} key={item.label}>
                            <Icon data={item.icon} />
                            {item.label}
                        </Menu.Item>
                    ))}
                </Menu.Section>
                <Menu.Section>
                    <Menu.Item onClick={() => nextTemperature()} closeMenuOnClick={false}>
                        <Icon data={thermostat} />
                        Temperature: {temperature.unit}
                    </Menu.Item>
                </Menu.Section>
                {account ? (
                    <Menu.Section>
                        <Menu.Item>
                            <ProfilePhoto />
                            {account?.name}
                        </Menu.Item>
                        <Menu.Item onClick={() => instance.logoutRedirect({ account: account! })}>
                            <Icon data={log_out} />
                            Sign out
                        </Menu.Item>
                    </Menu.Section>
                ) : (
                    <Menu.Section>
                        <Menu.Item onClick={() => instance.loginRedirect({ scopes: [config.API_SCOPE] })}>
                            <Icon data={log_in} />
                            Sign in
                        </Menu.Item>
                    </Menu.Section>
                )}
            </Menu>
        </SmallScreenOnly>
    );
};

const LargeScreenActions: React.FC = () => {
    const { instance } = useMsal();
    const ref = useRef<HTMLElement | null>(null);
    const [open, setOpen] = useState(false);

    const account = instance.getActiveAccount();

    return (
        <LargeScreenOnly>
            <TemperatureToggle />

            {account ? (
                <>
                    <Button ref={ref} variant="ghost" onClick={() => setOpen(!open)}>
                        <ProfilePhoto />
                        {account?.name}
                    </Button>
                    <Menu open={open} anchorEl={ref.current} onClose={() => setOpen(false)}>
                        <Menu.Item onClick={() => instance.logoutRedirect({ account: account! })}>
                            <Icon data={log_out} />
                            Sign out
                        </Menu.Item>
                    </Menu>
                </>
            ) : (
                <Button variant="ghost" onClick={() => instance.loginRedirect({ scopes: [config.API_SCOPE] })}>
                    <Icon data={log_in} />
                    Sign in
                </Button>
            )}
        </LargeScreenOnly>
    );
};

const TopBar: React.FC = () => {
    return (
        <EDS_TopBar elevation="raised" sticky>
            <EDS_TopBar.Header>
                <Button as={Link} to="/" variant="ghost">
                    <img src="/title.svg" height="30px" />
                </Button>
            </EDS_TopBar.Header>
            <EDS_TopBar.Actions>
                <SmallScreenActions />
                <LargeScreenActions />
            </EDS_TopBar.Actions>
            <LargeScreenOnly>
                <EDS_TopBar.CustomContent>
                    {navItems.map((item) => (
                        <Button as={Link} to={item.path} variant="ghost" key={item.label}>
                            <Icon data={item.icon} />
                            {item.label}
                        </Button>
                    ))}
                </EDS_TopBar.CustomContent>
            </LargeScreenOnly>
        </EDS_TopBar>
    );
};

export default TopBar;
