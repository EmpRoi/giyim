// Backup for fixing server.js error on line 78
// The escapeHtml function should be:
function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, '"')
    .replace(/'/g, "&#039;");
}
