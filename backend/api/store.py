from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional
from collections import defaultdict

from referee.result import MatchResult


@dataclass
class MatchState:
    match_id: str
    user_id: str
    game: str
    lang: str
    submitted_code: str
    submitted_at: datetime
    status: str = "pending"   # pending | running | completed | failed
    result: Optional[MatchResult] = None
    error: Optional[str] = None


# Keyed by match_id
_matches: dict[str, MatchState] = {}

# Keyed by user_id → ordered list of match_ids (insertion order)
_user_matches: dict[str, list[str]] = defaultdict(list)


def create(match_id: str, user_id: str, game: str, lang: str, code: str) -> MatchState:
    state = MatchState(
        match_id=match_id,
        user_id=user_id,
        game=game,
        lang=lang,
        submitted_code=code,
        submitted_at=datetime.now(timezone.utc),
    )
    _matches[match_id] = state
    _user_matches[user_id].append(match_id)
    return state


def get(match_id: str) -> Optional[MatchState]:
    return _matches.get(match_id)


def list_for_user(user_id: str) -> list[MatchState]:
    ids = _user_matches.get(user_id, [])
    return [_matches[mid] for mid in reversed(ids) if mid in _matches]
