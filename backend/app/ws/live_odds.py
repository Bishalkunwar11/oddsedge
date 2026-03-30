"""WebSocket endpoint for live odds streaming.

Sends an initial snapshot of latest odds on connect, then periodically
broadcasts updated odds data to all connected clients.
"""

from __future__ import annotations

import asyncio
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.config import settings
from app.database import async_session_factory
from app.services.matches import get_latest_odds
from app.ws.manager import ConnectionManager

logger = logging.getLogger(__name__)

router = APIRouter()
manager = ConnectionManager()


@router.websocket("/ws/live-odds")
async def live_odds_ws(websocket: WebSocket) -> None:
    """Stream live odds updates over WebSocket.

    Protocol:
        1. On connect → sends ``{"type": "snapshot", "data": [...]}``
           with the full latest-odds dataset.
        2. Every ``ws_broadcast_interval`` seconds → sends
           ``{"type": "update", "data": [...]}`` with the current state.
        3. Client can send ``{"action": "ping"}`` to keep alive; server
           responds with ``{"type": "pong"}``.
    """
    await manager.connect(websocket)
    try:
        # Send initial snapshot
        async with async_session_factory() as db:
            odds_rows = await get_latest_odds(db)
        await manager.send_json(
            websocket, {"type": "snapshot", "data": odds_rows}
        )

        # Two concurrent tasks: listen for client messages + periodic broadcast
        async def _listen() -> None:
            """Handle incoming messages from the client."""
            while True:
                try:
                    msg = await websocket.receive_json()
                    action = msg.get("action", "")
                    if action == "ping":
                        await manager.send_json(websocket, {"type": "pong"})
                except WebSocketDisconnect:
                    raise
                except Exception:
                    # Malformed messages are silently ignored
                    pass

        async def _broadcast_loop() -> None:
            """Periodically fetch and broadcast latest odds."""
            import random
            
            # Engine 4.1: Sharp Money Alerts 
            SHARP_ALERTS = [
                "Whale Alert 🐋: $50K tracked on Arsenal ML at Emirates.",
                "Sharp Movement 📉: Man City Under 2.5 getting hammered across Asian books.",
                "Injury Fade 🚑: Huge late money against Chelsea following Palmer injury leak.",
                "Pro Syndicate 🎯: Group 7 laying the draw heavily in Juventus vs Milan.",
                "Line Shopping 🏎️: FanDuel extremely slow to move Over lines. Market is +120 elsewhere."
            ]
            
            while True:
                await asyncio.sleep(settings.ws_broadcast_interval)
                try:
                    # 1. Periodically send a sharp alert (Engine 4.1 mock action)
                    if random.random() > 0.6:
                        await manager.broadcast({
                            "type": "sharp_alert",
                            "message": random.choice(SHARP_ALERTS),
                            "timestamp": asyncio.get_event_loop().time()
                        })

                    # 2. Main odds update
                    async with async_session_factory() as db:
                        odds_rows = await get_latest_odds(db)
                    await manager.broadcast(
                        {"type": "update", "data": odds_rows}
                    )
                except Exception:
                    logger.warning(
                        "Error in broadcast loop", exc_info=True
                    )

        # Run both tasks; when the listener raises WebSocketDisconnect
        # the gather is cancelled cleanly.
        listen_task = asyncio.create_task(_listen())
        broadcast_task = asyncio.create_task(_broadcast_loop())
        try:
            await asyncio.gather(listen_task, broadcast_task)
        except WebSocketDisconnect:
            pass
        finally:
            listen_task.cancel()
            broadcast_task.cancel()

    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(websocket)
