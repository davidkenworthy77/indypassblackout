// Copy-to-clipboard for embed-code blocks.
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".embed__copy");
  if (!btn) return;
  const code = btn.closest(".embed").querySelector(".embed__code").textContent.trim();
  navigator.clipboard.writeText(code).then(() => {
    const prev = btn.textContent;
    btn.textContent = "Copied ✓";
    setTimeout(() => (btn.textContent = prev), 1200);
  });
});
