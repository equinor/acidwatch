import styled from "styled-components";
import { Typography } from "@equinor/eds-core-react";
import React from "react";

const Fill = styled.div`
    width: 100%;
    height: 100%;

    display: flex;
`;

const Image = styled.div<{ src: string }>`
    background-image: url("${(props) => props.src}");
    background-size: contain;

    width: 256px;
    height: 256px;
`;

const Wrapper = styled.div`
    margin: auto;
    width: 256px;
    height: 256px;
`;

const Text = styled(Typography)`
    text-align: center;
    user-select: none;
`;

interface CenteredImageProps {
    src: string;
    caption?: string;
    className?: string;
}

const CenteredImage: React.FC<CenteredImageProps> = ({ src, caption, className }) => (
    <Fill className={className}>
        <Wrapper>
            <Image src={src} />
            <Text variant="body_short_italic">{caption}</Text>
        </Wrapper>
    </Fill>
);

export default CenteredImage;
