import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from acidwatch_api.frontend import mount_frontend
from acidwatch_api.settings import Settings

INDEX = """\
<!doctype html>
<html>
    <head>
        <meta name="robots" content="noindex, nofollow" />
        <title>AcidWatch</title>
    </head>
    <body><div id="root"></div></body>
</html>
"""


@pytest.fixture
def dist(tmp_path):
    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text(INDEX)
    (dist / "assets" / "app.js").write_text("console.log('app')")
    (dist / "robots.txt").write_text("User-agent: *\nDisallow: /")
    (tmp_path / "secret.txt").write_text("secret")
    return dist


def client_for(dist, **settings) -> TestClient:
    app = FastAPI()

    @app.post("/api/things")
    def create_thing() -> str:
        return "created"

    mount_frontend(app, dist, Settings(**settings))
    return TestClient(app)


def test_client_side_routes_get_index_with_runtime_configuration(dist):
    client = client_for(
        dist,
        frontend_client_id="the-client",
        backend_api_scope="</script><script>alert(1)",
        applicationinsights_connection_string=None,
    )

    for path in ("/", "/simulations/123", "/index.html"):
        response = client.get(path)
        assert response.status_code == 200
        assert response.headers["cache-control"] == "no-cache"
        assert (
            '<script>window.injectEnv = {"CLIENT_ID": "the-client", '
            '"API_SCOPE": "\\u003c/script\\u003e\\u003cscript\\u003ealert(1)", '
            '"APPINSIGHTS_CONNECTIONSTRING": ""};</script></head>'
        ) in response.text
        assert 'name="robots"' in response.text


def test_api_paths_never_fall_back_to_the_frontend(dist):
    client = client_for(dist)

    response = client.get("/api/missing")
    assert response.status_code == 404
    assert response.json() == {"detail": "Not Found"}

    # Trailing slashes are still redirected by the router
    assert client.post("/api/things/").json() == "created"


def test_serves_built_files_but_nothing_outside_the_build(dist):
    client = client_for(dist)

    asset = client.get("/assets/app.js")
    assert asset.text == "console.log('app')"
    assert "immutable" in asset.headers["cache-control"]

    assert client.get("/assets/missing.js").status_code == 404
    assert "secret" not in client.get("/..%2Fsecret.txt").text


def test_indexing_is_only_allowed_in_production(dist):
    development = client_for(dist, acidwatch_env="development")
    assert development.get("/robots.txt").text.startswith("User-agent")

    client = client_for(dist, acidwatch_env="production")
    assert client.get("/robots.txt").status_code == 404
    assert 'name="robots"' not in client.get("/").text
