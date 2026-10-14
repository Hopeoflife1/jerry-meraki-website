import { PolicyPage } from "../components/PolicyPage";

// Draft wording (2026-10-14) for the owner to review; reflects how ordering works in this app.
export default function TermsPage() {
  return (
    <PolicyPage
      title="Terms & conditions"
      intro="These terms explain how ordering works when you use Jerry Meraki Print Enterprise's website."
      updated="14 October 2026"
      sections={[
        {
          heading: "Quotes",
          body: (
            <p>
              You request a quote with your job details. We reply with a price and an estimated ready date. A quote
              is only for the details you gave us. If the size, quantity, paper or finishing changes, the price may
              change too.
            </p>
          ),
        },
        {
          heading: "Payment",
          body: (
            <p>
              We start printing once your payment is confirmed. Pay by bank transfer to the account shown on your job
              page, then tap "I've made the transfer" so we can check it. A job is only marked paid after we have
              confirmed the money has arrived.
            </p>
          ),
        },
        {
          heading: "Your artwork",
          body: (
            <ul>
              <li>You are responsible for the spelling, numbers, images and layout in the artwork you send.</li>
              <li>
                We check every file for print problems such as low resolution, missing bleed and colour mode, and we
                tell you if something needs fixing. Our check does not cover proofreading your content.
              </li>
              <li>
                After payment, or once we approve your artwork for printing, your file is locked. Changes after that
                must be agreed with us on WhatsApp and may cost extra.
              </li>
              <li>You confirm you have the right to print everything in your artwork, including logos and photos.</li>
            </ul>
          ),
        },
        {
          heading: "Ready dates, pickup and delivery",
          body: (
            <p>
              Ready dates are our best estimate and we will tell you quickly if anything changes. You can collect
              finished jobs from our office at 14/15 Ayoola Lawal, Bariga, with your job code, or ask for delivery. Delivery costs and times
              are agreed with you on the quote.
            </p>
          ),
        },
        {
          heading: "Colour",
          body: (
            <p>
              Colours on screens are not the same as colours on paper, and small shade differences between print runs
              and paper types are normal. If exact colour matters, ask us for a printed proof before the full run.
            </p>
          ),
        },
        {
          heading: "Problems with a job",
          body: (
            <p>
              If something is wrong with your order, see our <a href="/refunds">reprint & refund policy</a>.
            </p>
          ),
        },
      ]}
    />
  );
}
