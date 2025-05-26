import styled from "styled-components";
import { RowLayout } from "../components/StyledLayout";
import { Card, Icon, Typography } from "@equinor/eds-core-react";
import { IconData, slack, github, world } from "@equinor/eds-icons";
import { Link } from "react-router-dom";
import { useState } from "react";

const Title = styled.h1`
    font-size: 2rem;
    font-weight: 400;
    line-height: 1.25em;
    margin: 2.5rem 0 0 0;
    text-align: center;
`;

const Subtitle = styled.h2`
    font-size: 1.8rem;
    font-weight: 200;
    line-height: 1.25em;
    padding-top: var(--navbar-height);
    text-align: center;
    margin-bottom: 4rem;
`;

interface LinkProps {
    to: string;
    icon: IconData;
    title: string;
    body: string;
}

function HelpButton({ to, icon, title, body }: LinkProps) {
    const [variant, setVariant] = useState<"default" | "info">("default");

    return (
        <Link to={to}>
            <Card
                elevation="raised"
                variant={variant}
                onMouseEnter={() => setVariant("info")}
                onMouseLeave={() => setVariant("default")}
            >
                <Card.Header>
                    <Icon data={icon} size={40} />
                    <Card.HeaderTitle>
                        <Typography variant="h4">{title}</Typography>
                        <Typography variant="body_short">{body}</Typography>
                    </Card.HeaderTitle>
                </Card.Header>
            </Card>
        </Link>
    );
}

const links: LinkProps[] = [
    {
        to: "https://equinor.enterprise.slack.com/archives/C07RHTD4JFQ",
        icon: slack,
        title: "#co2-impurities",
        body: "Slack channel where developers sit",
    },
    {
        to: "https://ccs-data-digital.radix.equinor.com",
        icon: world,
        title: "CCS: Data & Digital",
        body: "Homepage for the team that made AcidWatch",
    },
    {
        to: "https://github.com/equinor/acidwatch",
        icon: github,
        title: "Git repository",
        body: "AcidWatch is open-source, so here's the code!",
    },
];

function HelpPage() {
    return (
        <>
            <header>
                <Title>AcidWatch help</Title>
                <Subtitle>
                    If you have any questions or comments, please reach out to us in the following channels
                </Subtitle>
            </header>
            <main style={{ width: "960px", margin: "auto" }}>
                <RowLayout $justifyContent="space-between" style={{ margin: "2rem 0" }}>
                    {links.map((props) => (
                        <HelpButton {...props} />
                    ))}
                </RowLayout>
            </main>
        </>
    );
}

export default HelpPage;
