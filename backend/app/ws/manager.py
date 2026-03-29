"""WebSocket connection manager for broadcasting to multiple clients."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Track active WebSocket connections and broadcast messages.

    Usage::

        manager = ConnectionManager()

        @app.websocket("/ws/example")
        async def ws_endpoint(ws: WebSocket):
            await manager.connect(ws)
            try:
                while True:
                    data = await ws.receive_text()
                    await manager.broadcast({"echo": data})
            except WebSocketDisconnect:
                manager.disconnect(ws)
    """

    def __init__(self) -> None:
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        """Accept and register a new WebSocket connection."""
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(
            "WebSocket connected (%d active)", len(self.active_connections)
        )

    def disconnect(self, websocket: WebSocket) -> None:
        """Remove a WebSocket from the active list."""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(
            "WebSocket disconnected (%d active)", len(self.active_connections)
        )

    async def send_json(self, websocket: WebSocket, data: Any) -> None:
        """Send JSON data to a single client."""
        await websocket.send_json(data)

    async def broadcast(self, data: Any) -> None:
        """Send JSON data to every connected client.

        Connections that raise on send are silently removed.
        """
        stale: list[WebSocket] = []
        for conn in self.active_connections:
            try:
                await conn.send_json(data)
            except Exception:
                stale.append(conn)
        for conn in stale:
            self.disconnect(conn)
