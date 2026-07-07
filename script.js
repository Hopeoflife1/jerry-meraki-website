const WHATSAPP_NUMBER = "2348088390693";

const ICONS = {
  "file-text": [
    "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z",
    "M14 2v6h6",
    "M16 13H8",
    "M16 17H8",
    "M10 9H8"
  ],
  send: [
    "M22 2 11 13",
    "M22 2 15 22 11 13 2 9z"
  ],
  layers: [
    "m12 2 10 5-10 5L2 7z",
    "m2 17 10 5 10-5",
    "m2 12 10 5 10-5"
  ],
  "package-check": [
    "m16 16 2 2 4-4",
    "M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14",
    "M16.5 9.4 7.55 4.24",
    "M3.29 7 12 12l8.71-5",
    "M12 22V12"
  ],
  palette: [
    "M12 22a10 10 0 1 1 10-10c0 2.76-2.24 5-5 5h-1.5a1.5 1.5 0 0 0 0 3H17a5 5 0 0 1-5 2z",
    "M6.5 11.5h.01",
    "M9.5 7.5h.01",
    "M14.5 7.5h.01",
    "M17.5 11.5h.01"
  ],
  printer: [
    "M6 9V2h12v7",
    "M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2",
    "M6 14h12v8H6z"
  ],
  truck: [
    "M10 17h4V5H2v12h3",
    "M14 8h4l4 4v5h-3",
    "M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0",
    "M15 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0"
  ],
  phone: [
    "M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.77.63 2.6a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.48-1.2a2 2 0 0 1 2.11-.45c.83.3 1.7.51 2.6.63A2 2 0 0 1 22 16.92z"
  ],
  "message-circle": [
    "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5A8.48 8.48 0 0 1 21 11v.5z"
  ],
  "message-square-text": [
    "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
    "M8 9h8",
    "M8 13h6"
  ]
};

function renderIcon(name) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");

  (ICONS[name] || ICONS["file-text"]).forEach((d) => {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    svg.appendChild(path);
  });

  return svg;
}

function buildQuoteMessage(data) {
  const lines = [
    "NEW WEBSITE QUOTE REQUEST",
    "",
    `Name: ${data.get("name") || "unknown"}`,
    `Company: ${data.get("company") || "unknown"}`,
    `Project Type: ${data.get("projectType") || "not specified"}`,
    `Quantity: ${data.get("quantity") || "not specified"}`,
    `Delivery Location: ${data.get("location") || "not specified"}`,
    `Deadline: ${data.get("deadline") || "not specified"}`,
    "",
    "Details:",
    data.get("details") || "not specified"
  ];

  return lines.join("\n");
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-lucide]").forEach((icon) => {
    icon.replaceWith(renderIcon(icon.dataset.lucide));
  });

  const form = document.querySelector("#quoteForm");
  const note = document.querySelector("#formNote");

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const data = new FormData(form);
    const message = buildQuoteMessage(data);
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

    note.textContent = "Opening WhatsApp with your quote request.";
    window.open(url, "_blank", "noopener,noreferrer");
  });
});
