import { ApplicationInsights } from "@microsoft/applicationinsights-web";
import { ReactPlugin } from "@microsoft/applicationinsights-react-js";
import config from "../configuration";

class DummyApplicationInsights extends ApplicationInsights {
    trackEvent() {} // Do nothing
}

const connectionString = config.APPINSIGHTS_CONNECTIONSTRING;

const reactPlugin = new ReactPlugin();
let appInsights: ApplicationInsights;
if (connectionString) {
    appInsights = new ApplicationInsights({
        config: {
            connectionString: connectionString,
            extensions: [reactPlugin],
            enableAutoRouteTracking: true,
            disableAjaxTracking: false,
            autoTrackPageVisitTime: true,
            enableCorsCorrelation: true,
            enableRequestHeaderTracking: true,
            enableResponseHeaderTracking: true,
        },
    });
    appInsights.loadAppInsights();
} else {
    if (import.meta.env.PROD) {
        console.error(
            "The connection string to Application Insights is missing. Please check your environment variables."
        );
    }
    appInsights = new DummyApplicationInsights({ config: {} });
}

export { reactPlugin, appInsights };
