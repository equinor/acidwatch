import React from "react";
import { Button, Icon } from "@equinor/eds-core-react";
import { save } from "@equinor/eds-icons";
import { ChartDataSet } from "../dto/ChartData";

Icon.add({ save });

interface DownloadButtonProps {
    chartData: ChartDataSet[];
    isDisabled?: boolean;
    isLoading?: boolean;
}

const DownloadButton: React.FC<DownloadButtonProps> = ({ chartData, isDisabled = false, isLoading = false }) => {
    const handleDownload = () => {
        console.log("Some download function should be called here")
        //downloadChartDataAsCSV(chartData);
    };

    const hasData = chartData.length > 0;

    return (
        <Button
            variant="outlined"
            onClick={handleDownload}
            disabled={isDisabled || !hasData || isLoading}
            style={{ marginLeft: "1rem" }}
        >
            <Icon name="save" />
            {isLoading ? "Processing..." : "Download CSV"}
        </Button>
    );
};

export default DownloadButton;
