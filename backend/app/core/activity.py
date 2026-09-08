import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any


def record_activity(
    database,
    project_id: str,
    actor_id: str,
    action_type: str,
    entity_type: str,
    entity_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Records a lightweight audit/history event in the project_activity table."""
    now_iso = datetime.now(timezone.utc).isoformat()
    record = {
        "id": str(uuid.uuid4()),
        "project_id": project_id,
        "actor_id": actor_id,
        "action_type": action_type,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "metadata": metadata or {},
        "created_at": now_iso,
    }
    try:
        database.table("project_activity").insert(record).execute()
    except Exception:
        pass
    return record
