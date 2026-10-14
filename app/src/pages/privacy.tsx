import { PolicyPage } from "../components/PolicyPage";

// Draft wording (2026-10-14) for the owner to review; lists only data this app actually stores.
export default function PrivacyPage() {
  return (
    <PolicyPage
      title="Privacy notice"
      intro="This notice explains what information Jerry Meraki Print Enterprise collects through this website and how we use it."
      updated="14 October 2026"
      sections={[
        {
          heading: "What we collect",
          body: (
            <ul>
              <li>Your account details: name, email address, phone number and password (stored scrambled, never in plain text).</li>
              <li>Your orders: job details, delivery address if you choose delivery, notes, and the artwork files you upload.</li>
              <li>Payment updates you send us, such as "I've made the transfer". We never ask for or store card details.</li>
              <li>A login cookie that keeps you signed in. We don't use advertising cookies.</li>
            </ul>
          ),
        },
        {
          heading: "How we use it",
          body: (
            <ul>
              <li>To quote, print and deliver your jobs, and to keep you updated by email or WhatsApp.</li>
              <li>To check your artwork for print problems.</li>
              <li>To keep your account secure, for example password reset emails and blocking repeated failed logins.</li>
            </ul>
          ),
        },
        {
          heading: "Who can see it",
          body: (
            <p>
              Only Jerry Meraki staff. We do not sell your information or share your artwork with anyone, and we keep
              it stored securely.
            </p>
          ),
        },
        {
          heading: "Your choices",
          body: (
            <p>
              You can ask us to correct your details, or to delete your account and artwork, by messaging us on
              WhatsApp or by email. We may keep basic order records where the law requires us to.
            </p>
          ),
        },
      ]}
    />
  );
}
