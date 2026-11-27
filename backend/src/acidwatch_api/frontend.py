"""Serve the built frontend from the same origin as the API."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exception_handlers import http_exception_handler
from fastapi.responses import FileResponse, HTMLResponse, Response
from starlette.exceptions import HTTPException

from acidwatch_api.settings import Settings

_ROBOTS_META = re.compile(
    r"[ \t]*<meta\s+name=\"robots\"[^>]*>[ \t]*\n?", re.IGNORECASE
)
_IMMUTABLE = "public, max-age=31536000, immutable"


def _script_json(value: Any) -> str:
    """JSON that is safe to place inside an inline <script> element."""
    return (
        json.dumps(value)
        .replace("<", "\\u003c")
        .replace(">", "\\u003e")
        .replace("&", "\\u0026")
    )


def render_index(html: str, settings: Settings) -> str:
    """Prepopulate index.html with the runtime configuration the frontend needs."""
    if "</head>" not in html:
        raise RuntimeError("Frontend index.html has no </head> to add configuration to")

    config = {
        "CLIENT_ID": settings.frontend_client_id,
        "API_SCOPE": settings.backend_api_scope,
        "APPINSIGHTS_CONNECTIONSTRING": settings.applicationinsights_connection_string
        or "",
    }
    script = f"<script>window.injectEnv = {_script_json(config)};</script>"
    html = html.replace("</head>", f"{script}</head>", 1)

    # Only the production site may be indexed by web crawlers
    if settings.is_production:
        html = _ROBOTS_META.sub("", html)
    return html


def _is_reserved(path: str) -> bool:
    return path == "api" or path.startswith("api/")


def mount_frontend(app: FastAPI, dist: Path, settings: Settings) -> None:
    """Serve files from ``dist`` and fall back to index.html for client-side routes.

    This is a 404 handler rather than a catch-all route, so it never shadows an
    API route or changes how the router treats methods and trailing slashes.
    """
    dist = dist.resolve()
    index = render_index((dist / "index.html").read_text(encoding="utf-8"), settings)

    @app.exception_handler(404)
    async def frontend_fallback(request: Request, exc: HTTPException) -> Response:
        path = request.url.path.lstrip("/")
        if request.method not in ("GET", "HEAD") or _is_reserved(path):
            return await http_exception_handler(request, exc)

        file = (dist / path).resolve()
        is_index = file == dist or file == dist / "index.html"
        hidden = path == "robots.txt" and settings.is_production
        if not is_index and not hidden and file.is_relative_to(dist) and file.is_file():
            headers = (
                {"Cache-Control": _IMMUTABLE} if path.startswith("assets/") else {}
            )
            return FileResponse(file, headers=headers)

        # A missing build artefact or crawler file is a real 404, not a page.
        if path.startswith("assets/") or hidden:
            return await http_exception_handler(request, exc)

        return HTMLResponse(index, headers={"Cache-Control": "no-cache"})
