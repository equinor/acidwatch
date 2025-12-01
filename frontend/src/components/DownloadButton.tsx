import React from "react";
import { Button, Icon } from "@equinor/eds-core-react";
import { save } from "@equinor/eds-icons";
import { downloadTabulatedDataAsCSV } from "@/functions/Formatting";

interface DownloadButtonProps {
    csvContent: string;
    fileName: string;
    isLoading: boolean;
}

const DownloadButton: React.FC<DownloadButtonProps> = ({ csvContent, isLoading, fileName }) => {
    const handleDownload = () => {
        downloadTabulatedDataAsCSV(csvContent, fileName);
    };

    return (
        <Button variant="outlined" onClick={handleDownload} disabled={isLoading} style={{ marginLeft: "1rem" }}>
            <Icon data={save} />
            {"Download CSV"}
        </Button>
    );
};

export default DownloadButton;
