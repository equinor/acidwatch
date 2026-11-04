import React from "react";
import { CircularProgress } from "@equinor/eds-core-react";

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
        content = <p>{emptyMessage}</p>;
    } else if (isLoading) {
        content = <CircularProgress />;
    } else if (hasError) {
        content = <p style={{ color: "red" }}>{errorMessage}</p>;
    }

    return (
        <div className="container">
            <h2 style={{ marginBottom: "2rem" }}>{title}</h2>
            {content}
        </div>
    );
};

export default ComparisonPage;
