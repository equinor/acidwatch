from typing import Annotated

from fastapi import Depends, HTTPException, Request

from .transports import ApiTransport


def get_api_transport(request: Request) -> ApiTransport:
    transport = getattr(request.state, "message_broker", None)
    if transport is None:
        raise HTTPException(503, "Message broker is not configured")
    return transport


GetApiTransport = Annotated[ApiTransport, Depends(get_api_transport)]
