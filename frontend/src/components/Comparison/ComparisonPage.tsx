import React from "react";
import { CircularProgress, Typography } from "@equinor/eds-core-react";
import { MainContainer } from "@/components/styles";

interface ComparisonPageProps {
    title: string;
    isEmpty: boolean;
    emptyMessage: string;
    isLoading: boolean;
    hasError: boolean;
    errorMessage: string;
    children: React.ReactNode;
}

const ComparisonPage: React.FC<ComparisonPageProps> = ({
    title,
    isEmpty,
    emptyMessage,
    isLoading,
    hasError,
    errorMessage,
    children,
}) => {
    let content = children;
    if (isEmpty) {
        content = <Typography variant="body_short">{emptyMessage}</Typography>;
    } else if (isLoading) {
        content = <CircularProgress />;
    } else if (hasError) {
        content = (
            <Typography variant="body_short" style={{ color: "red" }}>
                {errorMessage}
            </Typography>
        );
    }

    return (
        <MainContainer>
            <Typography variant="h2" style={{ marginBottom: "2rem" }}>
                {title}
            </Typography>
            {content}
        </MainContainer>
    );
};

export default ComparisonPage;
