import asyncio
from typing import Optional

from .exceptions import BotTimeoutError, BotOOMError, BotCrashError
from .protocol import parse_bot_response

MOVE_TIMEOUT_S = 10*60
OOM_POLL_INTERVAL_S = 0.05


class BotProcess:
    """
    Manages one bot running inside a Docker container.
    All communication is via the container's stdin/stdout pipes.

    protocol_on_stderr=True (Java): protocol responses come on stderr, stdout is free for debug.
    protocol_on_stderr=False (default): protocol responses come on stdout, stderr is debug.
    """

    def __init__(
        self,
        container_image: str,
        bot_file_path: str,
        container_name: str,
        protocol_on_stderr: bool = False,
    ):
        self.container_image = container_image
        self.bot_file_path = bot_file_path
        self.container_name = container_name
        self._protocol_on_stderr = protocol_on_stderr
        self._proc: Optional[asyncio.subprocess.Process] = None
        self._debug_lines: list = []
        self._oom_event = asyncio.Event()
        self._debug_task: Optional[asyncio.Task] = None
        self._oom_task: Optional[asyncio.Task] = None

    async def start(self):
        cmd = self._build_docker_command()
        self._proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        self._debug_task = asyncio.create_task(self._consume_debug())
        self._oom_task = asyncio.create_task(self._monitor_oom())

    def _build_docker_command(self) -> list:
        return [
            "docker", "run",
            "--rm",
            "--name", self.container_name,
            "--network", "none",
            "--read-only",
            "--tmpfs", "/tmp:size=10m,noexec",
            "--memory", "300m",
            "--memory-swap", "300m",
            "--cpus", "1.0",
            "--pids-limit", "64",
            "--cap-drop", "ALL",
            "--security-opt", "no-new-privileges",
            "--user", "nobody",
            "-i",
            "-v", f"{self.bot_file_path}:/bot/user_bot:ro",
            self.container_image,
        ]

    async def send(self, message_bytes: bytes):
        try:
            self._proc.stdin.write(message_bytes)
            await self._proc.stdin.drain()
        except Exception as exc:
            raise BotCrashError(
                f"{self.container_name} connection lost while sending: {exc}"
            ) from exc

    async def recv_move(self):
        """
        Wait for one response line on the protocol stream.
        Raises BotTimeoutError, BotOOMError, or BotCrashError as appropriate.
        """
        proto_stream = self._proc.stderr if self._protocol_on_stderr else self._proc.stdout
        read_task = asyncio.create_task(proto_stream.readline())
        oom_task  = asyncio.create_task(self._oom_event.wait())

        done, pending = await asyncio.wait(
            {read_task, oom_task},
            timeout=MOVE_TIMEOUT_S,
            return_when=asyncio.FIRST_COMPLETED,
        )

        for t in pending:
            t.cancel()

        if not done:
            await self.kill()
            raise BotTimeoutError(f"{self.container_name} exceeded {MOVE_TIMEOUT_S}s move limit")

        if oom_task in done:
            raise BotOOMError(f"{self.container_name} exceeded 300MB RAM limit (OOM killed)")

        line = read_task.result()
        if not line:
            raise BotCrashError(
                f"{self.container_name} exited unexpectedly. "
                f"Last output: {''.join(self._debug_lines[-10:])}"
            )

        return parse_bot_response(line)

    async def _consume_debug(self):
        debug_stream = self._proc.stdout if self._protocol_on_stderr else self._proc.stderr
        async for line in debug_stream:
            decoded = line.decode(errors="replace")
            self._debug_lines.append(decoded)
            if len(self._debug_lines) > 500:
                self._debug_lines = self._debug_lines[-500:]
            print(f"[{self.container_name}] {decoded}", end="", flush=True)

    async def _monitor_oom(self):
        while True:
            await asyncio.sleep(OOM_POLL_INTERVAL_S)
            if self._proc.returncode is not None:
                try:
                    proc = await asyncio.create_subprocess_exec(
                        "docker", "inspect",
                        "--format", "{{.State.OOMKilled}}",
                        self.container_name,
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.DEVNULL,
                    )
                    out, _ = await proc.communicate()
                    if out.strip() == b"true":
                        self._oom_event.set()
                except Exception:
                    pass
                return

    async def kill(self):
        try:
            proc = await asyncio.create_subprocess_exec(
                "docker", "kill", self.container_name,
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL,
            )
            await proc.communicate()
        except Exception:
            pass
        if self._proc and self._proc.returncode is None:
            try:
                self._proc.kill()
            except Exception:
                pass
        if self._debug_task:
            try:
                await asyncio.wait_for(self._debug_task, timeout=2.0)
            except Exception:
                pass

    @property
    def stderr_log(self) -> str:
        return "".join(self._debug_lines)
