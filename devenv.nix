{
  pkgs,
  lib,
  config,
  inputs,
  ...
}:

let

  python = pkgs.python313;

  ports' = {
    frontend = config.processes.frontend.ports.http.value;
    backend = config.processes.backend.ports.http.value;
    postgres = config.env.PGPORT;
    rabbitmq = config.env.RABBITMQ_PORT;
  };

  ports = lib.mapAttrs (name: value: toString value) ports';

in
{
  env = {
    # Backend
    FRONTEND_URI = "http://localhost:${ports.frontend}";
    ACIDWATCH_DATABASE = "postgresql://${config.env.PGHOST}:${ports.postgres}/acidwatch";
    ACIDWATCH_TEST_DATABASE = "postgresql://${config.env.PGHOST}:${ports.postgres}/acidwatch_test";

    # Workers
    BROKER_URL = "aqmp://localhost:${ports.rabbitmq}";

    # Frontend
    VITE_API_URL = "http://localhost:${ports.backend}";
    VITE_API_SCOPE = "api://456cc109-08d7-4c11-bf2e-a7b26660f99e/AcidWatch.User";
    VITE_CLIENT_ID = "49385006-e775-4109-9635-2f1a2bdc8ea8";
    VITE_TENANT_ID = "3aa4a235-b6e2-48d5-9195-7fcf05b459b0 ";
    VITE_APPINSIGHTS_CONNECTIONSTRING = "";
    VITE_BACKEND_CLIENT_ID = "456cc109-08d7-4c11-bf2e-a7b26660f99e";
    VITE_BACKEND_CLIENT_SECRET = "";
    VITE_OASIS_URL = "https://api-oasis-test.radix.equinor.com/";
  };

  languages = {
    python = {
      enable = true;
      package = python;
      uv = {
        enable = true;
        sync = {
          enable = true;
          allExtras = true;
          allPackages = true;
          allGroups = true;
        };
      };
      venv.enable = true;
    };

    java.enable = true;

    javascript = {
      enable = true;
      directory = "frontend";
      npm = {
        enable = true;
        install.enable = true;
      };
    };
  };

  packages = with pkgs; [
    # Dependencies for jpype1, which is required by neqsim
    ant
    cmake
  ];

  services = {
    postgres = {
      enable = true;
      listen_addresses = "localhost";
      initialDatabases = [
        {
          name = "acidwatch";
        }
        {
          name = "acidwatch_test";
        }
      ];
    };

    rabbitmq = {
      enable = true;
      managementPlugin.enable = true;
    };
  };

  processes = {
    backend = {
      cwd = "backend";
      exec = ''
        alembic upgrade head
        uvicorn acidwatch_api.app:app --port ${ports.backend} --reload
      '';
      after = [
        "devenv:processes:rabbitmq"
        "devenv:processes:postgres"
      ];
      ports.http.allocate = 8000;
      ready = {
        http.get = {
          port = ports'.backend;
          path = "/health";
        };
      };
    };

    frontend = {
      cwd = "frontend";
      exec = "npm run dev -- --port ${ports.frontend}";
      ports.http.allocate = 8000;
    };
  }
  // (lib.genAttrs'
    [
      "arcs"
      "arcs-exp"
      "example"
      "gibbs-minimization"
      "phpitz-reactive"
      "phpitz-solubility"
      "srk-vanlaar"
      "tocomo"
    ]
    (
      name:
      lib.nameValuePair "worker-${name}" {
        exec = "run-worker ${name}";
        after = [ "devenv:processes:rabbitmq" ];
      }
    )
  );

  scripts = {
    install-worker.exec = ''
      name=$1
      venvPath="${config.devenv.state}/worker-$name-env"
      codePath="${config.devenv.root}/workers/$name"

      echo "VirtualEnv: $venvPath"
      echo "Installing: $codePath"

      unset VIRTUAL_ENV
      export UV_PROJECT_ENVIRONMENT="$venvPath"
      cd "$codePath"
      uv sync
    '';

    run-worker.exec = ''
      name=$1
      path="${config.devenv.state}/worker-$name-env"

      [[ ! -d "$path" ]] && install-worker $name

      "$path/bin/python" -m acidwatch_worker_''${name//-/_}
    '';

    install-all-workers.exec = ''
      for f in ${config.devenv.root}/workers/*
      do
        echo "install-worker $(basename $f)"
        install-worker $(basename $f) >/dev/null 2>/dev/null
      done
    '';
  };
}
