export function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function blockText(block) {
  return (block.spans || []).map((span) => span.text || "").join("");
}

export function cloneBlocks(blocks) {
  return blocks.map((block) => ({
    ...block,
    spans: (block.spans || []).map((span) => ({ ...span })),
  }));
}

export function blockHtml(block) {
  if (block.type === "scene_break") {
    return "<hr>";
  }
  const text = escapeHtml(blockText(block));
  if (block.type === "heading") {
    const level = block.level === 3 ? 3 : 2;
    return `<h${level}>${text}</h${level}>`;
  }
  if (block.type === "blockquote") {
    return `<blockquote>${text}</blockquote>`;
  }
  return `<p>${text}</p>`;
}

export function selectOptions(select, options, selectedValue) {
  select.innerHTML = "";
  options.forEach((option) => {
    const item = document.createElement("option");
    item.value = option.value;
    item.textContent = option.label;
    item.selected = option.value === selectedValue;
    select.appendChild(item);
  });
}

export async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || `Request failed: ${response.status}`);
  }
  return body;
}

export async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
