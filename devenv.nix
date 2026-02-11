{ pkgs, lib, config, inputs, ... }:

{
  env = {
    # Backend
    FRONTEND_URI = "http://localhost:8000";
    TOCOMO_API_BASE_URI = "http://localhost:8002";
    ARCS_API_BASE_URI = "http://localhost:8003";

    # Frontend
    VITE_API_URL = "http://127.0.0.1:8001";
    VITE_API_SCOPE = "api://456cc109-08d7-4c11-bf2e-a7b26660f99e/AcidWatch.User";
    VITE_CLIENT_ID = "49385006-e775-4109-9635-2f1a2bdc8ea8";
    VITE_TENANT_ID = "3aa4a235-b6e2-48d5-9195-7fcf05b459b0 ";
    VITE_APPINSIGHTS_CONNECTIONSTRING = "";
    VITE_BACKEND_CLIENT_ID = "456cc109-08d7-4c11-bf2e-a7b26660f99e";
    VITE_BACKEND_CLIENT_SECRET = "";
    VITE_OASIS_URL = "https://api-oasis-test.radix.equinor.com/";
  };

  languages.python = {
    enable = true;
    poetry.enable = true;
    poetry.install.enable = true;
    directory = "backend";
  };

  languages.javascript = {
    enable = true;
    npm.enable = true;
    npm.install.enable = true;
    directory = "frontend";
  };

  languages.java.enable = true;

  processes.backend.exec = "cd backend; uvicorn acidwatch_api.app:app --port 8001 --reload";
  processes.frontend.exec = "cd frontend; npm run dev -- --port 8000";

  profiles = {
    pg.module = { config, ... }: {
      env.ACIDWATCH_DATABASE = "postgresql://${config.env.PGHOST}:${toString config.env.PGPORT}/acidwatch";
      env.ACIDWATCH_TEST_DATABASE = "postgresql://${config.env.PGHOST}:${toString config.env.PGPORT}/acidwatch_test";

      services.postgres.enable = true;
      services.postgres.initialDatabases = [{
        name = "acidwatch";
      } {
        name = "acidwatch_test";
      }];
      services.postgres.listen_addresses = "localhost";
    };
  };
}
