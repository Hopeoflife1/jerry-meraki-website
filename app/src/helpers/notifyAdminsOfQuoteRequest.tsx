import { emailAdmins, esc, waNumber } from "./emailAdmins";

// Backend only. Emails every admin when a customer submits a quote request (decided 2026-10-09:
// Mr. Ekeoba at jerrymerakico@gmail.com AND Hope both receive them), with the job specs and a link
// straight to the quote builder. Recipients and delivery rules live in emailAdmins. Never throws.

type NewRequest = {
  id: number;
  jobCode: string;
  product: string;
  quantity: number;
  size: string;
  paper: string;
  printSides: string;
  colourMode: string;
  finishing: string[];
  notes: string | null;
  neededBy: string | null;
  deliveryMethod: string;
  deliveryAddress: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
};

export async function notifyAdminsOfQuoteRequest(job: NewRequest, appOrigin: string) {
    const link = `${appOrigin}/dashboard/jobs/${job.id}`;
    const rows: [string, string][] = [
      ["Product", job.product],
      ["Quantity", job.quantity.toLocaleString("en-NG")],
      ["Size", job.size],
      ["Paper", job.paper],
      ["Colour", job.colourMode],
      ["Sides", job.printSides],
      ["Finishing", job.finishing.length ? job.finishing.join(", ") : "None"],
      ["Needed by", job.neededBy || "Not specified"],
      ["Delivery", job.deliveryMethod === "delivery" ? `Delivery to ${job.deliveryAddress ?? ""}` : "Pickup"],
      ["Customer", job.customerName],
      ["Phone / WhatsApp", job.customerPhone],
      ["Email", job.customerEmail],
    ];
    if (job.notes) rows.push(["Notes", job.notes]);

    const html = `
<div style="font-family:Arial,Helvetica,sans-serif;color:#22123a;background:#fbf8f1;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fffdf8;border:1px solid #e3dccd;border-radius:12px;padding:24px">
    <p style="margin:0;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#6c6280">New quote request · ${esc(job.jobCode)}</p>
    <h1 style="margin:8px 0 16px;font-family:Georgia,serif;font-size:24px;color:#3d1a78">${esc(job.quantity.toLocaleString("en-NG"))} × ${esc(job.product)}</h1>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      ${rows
        .map(
          ([k, v]) =>
            `<tr><td style="padding:6px 0;border-top:1px solid #e3dccd;color:#6c6280;width:38%">${esc(k)}</td><td style="padding:6px 0;border-top:1px solid #e3dccd">${esc(v)}</td></tr>`,
        )
        .join("")}
    </table>
    <p style="margin:24px 0 8px">
      <a href="${esc(link)}" style="display:inline-block;background:#f26b1d;color:#22123a;font-weight:bold;text-decoration:none;padding:12px 20px;border-radius:8px">Cost and send the quote</a>
    </p>
    <p style="margin:8px 0 0;font-size:13px">
      <a href="https://wa.me/${esc(waNumber(job.customerPhone))}" style="color:#3d1a78">Message the customer on WhatsApp</a>
    </p>
  </div>
</div>`;

    const text = [
      `New quote request ${job.jobCode}`,
      "",
      ...rows.map(([k, v]) => `${k}: ${v}`),
      "",
      `Cost and send the quote: ${link}`,
    ].join("\n");

    await emailAdmins({
      replyTo: job.customerEmail,
      subject: `New quote request ${job.jobCode}: ${job.quantity.toLocaleString("en-NG")} × ${job.product}`,
      html,
      text,
    });
}