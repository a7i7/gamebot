import json
import pytest
from referee.protocol import InitMessage, MoveMessage, EndMessage, parse_bot_response


def test_init_message_encode():
    msg = InitMessage(player=1, game="tictactoe", config={"board_size": 3})
    data = json.loads(msg.encode().decode())
    assert data["type"] == "INIT"
    assert data["player"] == 1
    assert data["game"] == "tictactoe"
    assert data["config"]["board_size"] == 3
    assert msg.encode().endswith(b"\n")


def test_move_message_encode():
    msg = MoveMessage(
        turn=3,
        board=[[1, 0, 0], [0, 2, 0], [0, 0, 0]],
        last_move={"player": 2, "move": [1, 1]},
        legal_moves=[[0, 1], [0, 2]],
    )
    data = json.loads(msg.encode().decode())
    assert data["type"] == "MOVE"
    assert data["turn"] == 3
    assert data["board"][1][1] == 2
    assert data["last_move"]["player"] == 2
    assert [0, 1] in data["legal_moves"]


def test_end_message_encode():
    msg = EndMessage(turn=7, result="WIN", reason="three_in_a_row", board=[[1, 0, 0]])
    data = json.loads(msg.encode().decode())
    assert data["type"] == "END"
    assert data["result"] == "WIN"
    assert data["reason"] == "three_in_a_row"


def test_parse_bot_response_valid():
    raw = b'{"move": [2, 1]}\n'
    move = parse_bot_response(raw)
    assert move == [2, 1]


def test_parse_bot_response_missing_key():
    with pytest.raises(KeyError):
        parse_bot_response(b'{"action": [0, 0]}\n')


def test_parse_bot_response_invalid_json():
    with pytest.raises(Exception):
        parse_bot_response(b'not json\n')
