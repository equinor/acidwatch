import React from "react";
import styled from "styled-components";
import { Button, Icon, Tooltip, TopBar as EDS_TopBar } from "@equinor/eds-core-react";
import { help_outline } from "@equinor/eds-icons";
import Account from "./Account";

import { Link } from "react-router-dom";
const Icons = styled.div`
    display: flex;
    align-items: center;
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
    return (
        <TopbarContainer>
            <EDS_TopBar elevation="raised" sticky>
                <EDS_TopBar.Header>
                    <img src="/title.svg" height="30px" />
                </EDS_TopBar.Header>
                <EDS_TopBar.Actions>
                    <Icons>
                        <Tooltip title="Help">
                            <Link to="/help">
                                <Button variant="ghost_icon">
                                    <Icon data={help_outline} />
                                </Button>
                            </Link>
                        </Tooltip>
                        <Account />
                    </Icons>
                </EDS_TopBar.Actions>
            </EDS_TopBar>
        </TopbarContainer>
    );
};

export default TopBar;
