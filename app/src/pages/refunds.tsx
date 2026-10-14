import { PolicyPage } from "../components/PolicyPage";

// Draft wording (2026-10-14) for the owner to review before relying on it.
export default function RefundsPage() {
  return (
    <PolicyPage
      title="Reprint & refund policy"
      intro="We want every job to look exactly how you imagined. If it doesn't, here is how we put it right."
      updated="14 October 2026"
      sections={[
        {
          heading: "When we reprint for free",
          body: (
            <ul>
              <li>The print doesn't match the artwork you approved, for example wrong size, paper, finishing or quantity.</li>
              <li>There is a printing fault such as smudging, misalignment, banding or damaged sheets.</li>
              <li>The job was damaged before it reached you, when we handled the delivery.</li>
            </ul>
          ),
        },
        {
          heading: "When we can't reprint for free",
          body: (
            <ul>
              <li>Mistakes in the artwork you sent, such as spelling, phone numbers, prices or images.</li>
              <li>Problems we warned you about in the artwork check, which you chose to print anyway.</li>
              <li>Small colour differences between your screen and paper (see our terms).</li>
            </ul>
          ),
        },
        {
          heading: "How to report a problem",
          body: (
            <p>
              Tell us within 3 days of collection or delivery. Send your job code and clear photos of the problem on
              WhatsApp. Please keep the printed items until we have looked into it.
            </p>
          ),
        },
        {
          heading: "Refunds",
          body: (
            <ul>
              <li>If you cancel before we start printing, we refund your payment in full.</li>
              <li>Once printing has started, we can't cancel the job, because materials and press time are already used.</li>
              <li>If we can't fix a fault on our side with a reprint, we refund the affected part of the order.</li>
              <li>Refunds go back to the account you paid from, usually within 5 working days of being agreed.</li>
            </ul>
          ),
        },
      ]}
    />
  );
}
