import Link from "next/link";
import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { LEGAL_EMAIL, LEGAL_OPERATOR, LEGAL_STATE } from "@/lib/legal";
import { SITE_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  alternates: { canonical: "/terms" },
  title: "Terms of Service",
  description: `The terms that govern your use of ${SITE_NAME}.`,
};

const mail = <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a>;

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro={
        <div className="space-y-3">
          <p>
            These Terms of Service (&ldquo;Terms&rdquo;) are an agreement between you and {LEGAL_OPERATOR}{" "}
            (&ldquo;{SITE_NAME},&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;). They govern your use of this website
            and its tools (the &ldquo;Service&rdquo;). By using the Service, you agree to these Terms and to our{" "}
            <Link href="/privacy" className="underline underline-offset-2">Privacy Policy</Link>. If you do not
            agree, do not use the Service.
          </p>
          <p className="rounded-lg border bg-muted/40 p-4 text-sm">
            <strong className="text-foreground">{SITE_NAME} is not medical advice.</strong> It is an educational
            tool for comparing over-the-counter skincare ingredients and products. It does not diagnose, treat
            or cure any condition, and it does not replace a dermatologist or other healthcare professional.
            Section 2 explains this in full.
          </p>
        </div>
      }
    >
      <h2 id="eligibility">1. Who may use {SITE_NAME}</h2>
      <p>
        You must be at least 13 years old to use the Service. If you are under 18, you may use it only with
        the involvement of a parent or guardian who agrees to these Terms for you. By using the Service, you
        confirm that you meet these requirements.
      </p>

      <h2 id="not-medical-advice">2. Not medical advice</h2>
      <ul>
        <li>
          Everything on the Service is for general information and education. This includes ingredient
          summaries, match scores, flags, cautions about product combinations, User Scores, Derm Scores (once the dermatologist panel launches) and
          community routines. None of it is medical advice, a diagnosis or a treatment plan for you.
        </li>
        <li>
          Using the Service does not create a doctor-patient or other professional relationship between you
          and {SITE_NAME}, or between you and any dermatologist or clinician connected with {SITE_NAME}.
        </li>
        <li>
          Always get the advice of a qualified healthcare professional about a skin condition, and before you
          start, stop or combine treatments. This matters especially if you are pregnant or breastfeeding, have
          allergies or a skin condition, take prescription medication, or are buying for a child. Never ignore
          professional advice, or delay getting it, because of something you read on {SITE_NAME}.
        </li>
        <li>
          Always read and follow the product label. Patch-test new products, and stop using any product that
          causes irritation or an allergic reaction.
        </li>
        <li>
          <strong>If you think you have a medical emergency, such as a severe allergic reaction, call 911 or
          your local emergency number right away.</strong>
        </li>
        <li>
          Statements about cosmetic products and ingredients have not been evaluated by the US Food and Drug
          Administration.
        </li>
      </ul>

      <h2 id="accuracy">3. Product information and scores</h2>
      <p>
        Product, ingredient and label information comes from public sources. These include the FDA&apos;s
        openFDA databases, Open Beauty Facts (a community-edited database) and manufacturers. It may be
        incomplete, out of date or wrong, and manufacturers change formulas without notice. The label on the
        product you actually buy always takes precedence over what {SITE_NAME} shows.
      </p>
      <p>
        Scores and flags are opinions and screening aids, not guarantees:
      </p>
      <ul>
        <li>A Derm Score, once the dermatologist panel launches, will reflect the views of individual clinicians.</li>
        <li>A User Score reflects outcomes that other users reported themselves, which we cannot verify.</li>
        <li>An ingredient flag or avoid-list check is not an exhaustive allergen or safety screen.</li>
      </ul>
      <p>
        No score means a product will work for you or be safe for you. Our methods are described on the{" "}
        <Link href="/about">About</Link> page.
      </p>

      <h2 id="affiliate">4. Affiliate links, retailers and third-party sites</h2>
      <p>
        Some links on {SITE_NAME} are affiliate links. We may earn a commission if you buy through them, at no
        extra cost to you, and each one is labeled. Commercial relationships do not affect User Scores or, once
        launched, Derm Scores.
      </p>
      <p>
        {SITE_NAME} does not sell products. A purchase you make is between you and the retailer, whose terms
        govern price, availability, shipping, returns and product quality. Links to third-party sites are for
        convenience. We do not control those sites and are not responsible for their content, products or
        privacy practices.
      </p>

      <h2 id="user-content">5. Content you submit</h2>
      <p>
        &ldquo;User Content&rdquo; means anything you submit to the Service, such as routines, notes, display
        names, votes, reports and outcome reports.
      </p>
      <ul>
        <li>
          <strong>You keep ownership</strong> of your User Content. You grant {SITE_NAME} a worldwide,
          non-exclusive, royalty-free, perpetual license to host, store, display, reproduce, adapt and
          distribute it in order to run, improve and promote the Service. This includes combining outcome
          reports into aggregate scores. The license continues for aggregate and de-identified data after you
          stop using the Service.
        </li>
        <li>
          <strong>You are responsible for your User Content.</strong> You confirm that it is truthful, that it
          reflects your own honest experience, and that you have the right to submit it.
        </li>
        <li>
          <strong>Do not submit content that:</strong>
          <ul className="mt-1">
            <li>is false, misleading or fraudulent, including fake outcome reports or votes;</li>
            <li>claims that a product cures, treats or prevents a disease;</li>
            <li>you were paid or given free product to post without clearly saying so;</li>
            <li>contains anyone&apos;s personal or health information, including your own full name or contact details;</li>
            <li>is unlawful, harassing, hateful, sexually explicit or defamatory;</li>
            <li>infringes someone else&apos;s intellectual property or privacy;</li>
            <li>is spam or advertising, or contains links to malware.</li>
          </ul>
        </li>
        <li>
          Community content is not reviewed or verified by dermatologists. We may, but are not required to,
          monitor, edit or remove any User Content, and we may refuse or remove it at any time for any reason.
        </li>
      </ul>

      <h2 id="clinicians">6. Clinicians</h2>
      <h3>Panel applications</h3>
      <p>
        If you apply to join our dermatologist panel, you confirm that the credentials you give are accurate
        and current, and you agree that we may verify them using public sources such as the NPI registry.
        Applying does not create employment, a contract or any promise that you will be accepted. Any
        participation will be governed by a separate written agreement.
      </p>
      <h3 id="clinic-tools">Clinic tools</h3>
      <p>
        If you use the handout builder, handout library, patch-test tools, starter lists or prescription references
        (the &ldquo;clinic tools&rdquo;) as a clinician or for a practice, these terms also apply:
      </p>
      <ul>
        <li>
          You confirm that you are a licensed clinician, or act for one at their direction, and that the NPI, name and
          clinic details you give are your own and accurate. Do not use someone else&apos;s NPI or identity. We may
          suspend clinician access at any time, including while we verify it.
        </li>
        <li>
          The clinic tools are information and convenience tools. You remain responsible for every clinical decision,
          for reading and editing each handout before you give it out, and for what you tell your patients. Library
          handouts were drafted with AI assistance, and many have not yet had physician review.
        </li>
        <li>
          The clinic tools are built so that patient information does not reach us. Do not type patient names, dates
          of birth, record numbers, contact details or any other identifying detail into handout text, notes, list names
          or any other field we store. We do not act as your business associate and do not sign business associate
          agreements. A patient who scans your code and saves a plan does so as a user of {SITE_NAME}, under our Privacy
          Policy.
        </li>
        <li>
          The patient&apos;s view of a plan may include affiliate links for over-the-counter products, from which{" "}
          {SITE_NAME} may earn a commission, as explained in section 4. Prescription steps never carry one.
        </li>
        <li>
          You may use the clinic tools and the handouts you make in your practice, despite the personal-use limit in
          section 8.
        </li>
      </ul>

      <h2 id="acceptable-use">7. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>
          scrape, crawl, copy or download the Service or its data in bulk, whether by bot, script or any other
          automated means, except through search engines that follow our robots.txt file;
        </li>
        <li>use the Service or its content to train, fine-tune or evaluate artificial intelligence or machine learning models;</li>
        <li>get around rate limits, bot protection or other security or access controls;</li>
        <li>interfere with the Service, overload it, or probe it for vulnerabilities without our written permission;</li>
        <li>reverse engineer the Service, except where the law allows it despite this restriction;</li>
        <li>manipulate scores, votes or rankings, including by creating multiple sessions;</li>
        <li>resell, republish or frame the Service or its data for commercial purposes without our written permission;</li>
        <li>use the Service in any way that breaks the law or the rights of others.</li>
      </ul>

      <h2 id="ip">8. Our content and licenses</h2>
      <p>
        We and our licensors own the Service, including its design, text, graphics, software, scoring methods
        and the selection and arrangement of its data. You may use it only for your own personal,
        non-commercial purposes. You may share links to individual pages.
      </p>
      <p>
        Some data comes from third-party sources under their own licenses. Nothing in these Terms limits
        rights those licenses give you. For example, data from Open Beauty Facts is available under the Open
        Database License from{" "}
        <a href="https://world.openbeautyfacts.org" target="_blank" rel="noopener noreferrer">
          Open Beauty Facts
        </a>
        , and FDA data is in the public domain. {SITE_NAME} and its logo are our trademarks. Product, brand and retailer
        names belong to their owners and are used only to identify products. Their use does not mean any brand or
        retailer endorses {SITE_NAME} or is affiliated with us.
      </p>
      <p>
        If you send us feedback or suggestions, we may use them without any obligation to you.
      </p>

      <h2 id="copyright">9. Copyright complaints</h2>
      <p>
        If you believe content on the Service infringes your copyright, email {mail}. Include:
      </p>
      <ul>
        <li>the work you believe was infringed;</li>
        <li>the URL of the content you say infringes it;</li>
        <li>your contact information;</li>
        <li>a statement that you believe in good faith the use is not authorized;</li>
        <li>
          a statement, under penalty of perjury, that your notice is accurate and that you are the owner or
          authorized to act for the owner;
        </li>
        <li>your physical or electronic signature.</li>
      </ul>
      <p>We will remove content that infringes, and in appropriate cases we will end the access of repeat infringers.</p>

      <h2 id="disclaimers">10. Disclaimer of warranties</h2>
      <p className="uppercase">
        The Service and all content are provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without
        warranties of any kind, express or implied. This includes warranties of merchantability, fitness for a
        particular purpose, title, non-infringement, accuracy and uninterrupted or error-free operation. We do
        not warrant that any product will be safe, suitable or effective for you.
      </p>

      <h2 id="liability">11. Limitation of liability</h2>
      <p className="uppercase">
        To the fullest extent the law permits, {SITE_NAME} and its operators, contributors, clinicians and service
        providers will not be liable for any indirect, incidental, special, consequential, exemplary or
        punitive damages. This includes skin reactions or other harm from products you choose to use, lost
        profits and lost data, arising from or related to the Service. Our total liability for all claims
        relating to the Service is limited to one hundred US dollars (US$100).
      </p>
      <p>
        Some jurisdictions do not allow certain warranties to be excluded or certain liability to be limited.
        In those places, the exclusions and limits above apply only as far as the law allows.
      </p>

      <h2 id="indemnity">12. Indemnity</h2>
      <p>
        You agree to defend, indemnify and hold harmless {SITE_NAME} and its operators against any claims, losses
        and expenses, including reasonable legal fees, that arise from your User Content, your misuse of the
        Service or your breach of these Terms.
      </p>

      <h2 id="termination">13. Changes and termination</h2>
      <p>
        We may change, suspend or discontinue any part of the Service at any time. We may suspend or block
        your access if we reasonably believe you have broken these Terms. You may stop using the Service at
        any time. Sections 3, 5, 8 and 10 through 15 survive termination.
      </p>

      <h2 id="law">14. Governing law and disputes</h2>
      <p>
        These Terms are governed by the laws of the State of {LEGAL_STATE}, without regard to its
        conflict-of-law rules.
      </p>
      <p>
        Before filing any claim, you agree to email us a description of the dispute and to try in good faith
        to resolve it informally for 30 days. After that, any dispute must be brought only in the state or
        federal courts located in {LEGAL_STATE}, and you and we consent to their personal jurisdiction.
        Either party may instead bring an individual claim in small-claims court if it qualifies.
      </p>

      <h2 id="changes">15. General</h2>
      <ul>
        <li>
          We may update these Terms. The date at the top shows when they last changed. If a change is
          material, we will post a notice on the site before it takes effect. If you keep using the Service
          after a change takes effect, you accept the updated Terms.
        </li>
        <li>
          These Terms and our Privacy Policy are the entire agreement between you and {SITE_NAME} about the
          Service.
        </li>
        <li>If any provision is found unenforceable, the rest remains in effect.</li>
        <li>If we do not enforce a provision, that is not a waiver of it.</li>
        <li>
          You may not transfer your rights under these Terms. We may transfer ours, for example in connection
          with a merger or sale of the Service.
        </li>
      </ul>

      <h2 id="contact">16. Contact</h2>
      <p>Questions about these Terms: {mail}.</p>
    </LegalPage>
  );
}
