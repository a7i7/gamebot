export function getUserId(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("gamebot_user_id") ?? "";
}

export function setUserId(id: string) {
  localStorage.setItem("gamebot_user_id", id);
}

export function clearUserId() {
  localStorage.removeItem("gamebot_user_id");
}
