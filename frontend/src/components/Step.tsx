import React from "react";
import { Typography } from "@equinor/eds-core-react";
import { tokens } from "@equinor/eds-tokens";
import styled from "styled-components";

const color = tokens.colors.interactive.focus.rgba;

const Head = styled(Typography)`
    width: 100%;
    height: 48px;
    display: flex;
    gap: 16px;
    align-items: center;

    margin-top: 32px;

    svg {
        flex-shrink: 0;
    }

    hr {
        flex-grow: 1;
        width: 100%;
        height: 2px;
        background-color: ${color};
        border: 0;
    }
`;

const Description = styled(Typography)`
    margin-left: 48px;
    margin-bottom: 16px;
`;

const Step: React.FC<{ step?: number; title: string; description?: string }> = ({ step, title, description }) => (
    <div>
        <Head variant="h2">
            <div
                style={{
                    minWidth: "24px",
                    maxWidth: "24px",
                    minHeight: "24px",
                    maxHeight: "24px",
                    textAlign: "center",
                    lineHeight: "24px",
                    fontSize: "16px",
                    fontWeight: "bold",
                    borderStyle: "solid",
                    borderRadius: "50%",
                    borderColor: color,
                    borderWidth: "4px",
                }}
            >
                {step}
            </div>
            {title}
            <hr />
        </Head>
        <Description variant="body_short">{description}</Description>
    </div>
);

export default Step;
