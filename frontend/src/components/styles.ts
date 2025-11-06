import styled from "styled-components";

const largeWidth = "968px";

/// A reactive container that is meant to be the main content of the page.
/// It has a fixed width and is centered on desktop, but occupies the full screen on mobile.
export const MainContainer = styled.div`
    margin: 0 16px;

    @media (min-width: ${largeWidth}) {
        margin: 0 auto;
        width: 968px;
    }
`;

export const Columns = styled.div`
    @media (min-width: ${largeWidth}) {
        display: flex;
        flex-direction: row;
        gap: 16px;

        > * {
            flex-grow: 1;
        }
    }
`;

export const SmallScreenOnly = styled.div`
    display: block;

    @media (min-width: ${largeWidth}) {
        display: none;
    }
`;

export const LargeScreenOnly = styled.div`
    display: none;

    @media (min-width: ${largeWidth}) {
        display: block;
    }
`;
