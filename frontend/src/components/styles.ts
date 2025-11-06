import styled from "styled-components";

/// A reactive container that is meant to be the main content of the page.
/// It has a fixed width and is centered on desktop, but occupies the full screen on mobile.
export const MainContainer = styled.div`
    margin: 0 16px;

    @media (min-width: 968px) {
        margin: 0 auto;
        width: 968px;
    }
`;

export const Columns = styled.div`
    @media (min-width: 968px) {
        display: flex;
        flex-direction: row;
        gap: 16px;

        > * {
            flex-grow: 1;
        }
    }
`;
