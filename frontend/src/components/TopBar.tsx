import React, { useRef, useState } from "react";
import styled from "styled-components";
import {
  Button,
  Icon,
  Tooltip,
  Menu,
  TopBar as EDS_TopBar,
  Typography,
} from "@equinor/eds-core-react";
import {
  account_circle,
  help_outline,
  notifications,
  bubble_chart,
} from "@equinor/eds-icons";

import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { config } from "../config/Settings";
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isAuthenticated = useIsAuthenticated();

  const handleProfileClick = () => {
    setIsModalOpen(true);
  };

  const account = accounts[0];
  const profileButton = useRef<HTMLElement>(null);
  return (
    <TopbarContainer>
      <EDS_TopBar elevation="raised" sticky>
        <EDS_TopBar.Header>
          <Icon data={bubble_chart} />
          AcidWatch
        </EDS_TopBar.Header>
        <EDS_TopBar.Actions>
          <Icons>
            <Tooltip title="Notifications">
              <Button variant="ghost_icon">
                <Icon data={notifications} />
              </Button>
            </Tooltip>
            <Tooltip title="Account">
              <Button
                ref={profileButton}
                variant="ghost_icon"
                onClick={handleProfileClick}
              >
                <Icon data={account_circle} />
              </Button>
            </Tooltip>
            <Menu open={isModalOpen} anchorEl={profileButton.current}>
              <Typography variant="h6">{account?.name}</Typography>
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
                      scopes: config.MsalScopes ?? [],
                    });
                  }}
                >
                  Sign in
                </Menu.Item>
              )}
            </Menu>
            <Tooltip title="Help">
              <Button variant="ghost_icon">
                <Icon data={help_outline} />
              </Button>
            </Tooltip>
          </Icons>
        </EDS_TopBar.Actions>
      </EDS_TopBar>
    </TopbarContainer>
  );
};

export default TopBar;
