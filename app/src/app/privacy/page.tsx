import Link from "next/link";
import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { LEGAL_EMAIL, LEGAL_OPERATOR, LEGAL_STATE } from "@/lib/legal";
import { SITE_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  alternates: { canonical: "/privacy" },
  title: "Privacy Policy",
  description: `What ${SITE_NAME} collects, why, who it is shared with, and the choices you have.`,
};

const mail = <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a>;

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={
        <div className="space-y-3">
          <p>
            This policy explains what information {LEGAL_OPERATOR} (&ldquo;{SITE_NAME},&rdquo; &ldquo;we,&rdquo;
            &ldquo;us&rdquo;) collects when you use this website, how we use it, and the choices you have.
          </p>
          <p className="rounded-lg border bg-muted/40 p-4 text-sm">
            <strong className="text-foreground">The short version.</strong> {SITE_NAME} has no accounts or passwords
            and asks for no name or email to use its tools. Your skin profile and avoid list are stored in cookies
            on your own device. Adding an email address is optional; if you do, we use it only to keep your shelf,
            avoid list and skin profile (but not any pregnancy or breastfeeding answers) across devices and to send the check-ins and safety alerts you choose, and you can delete it at any
            time. We do not sell your information, share it for targeted advertising, or run advertising or
            analytics trackers.
          </p>
        </div>
      }
    >
      <h2 id="collect">1. Information we collect</h2>
      <h3>Information you choose to give us</h3>
      <ul>
        <li>
          <strong>Skin profile</strong>: your skin type, skin concerns (for example acne or redness),
          ingredients you like or dislike, and, if you choose to tell us, whether you are pregnant, trying to
          conceive or breastfeeding. It is stored in a cookie in your browser. Your browser sends it to
          our server with each page request so we can personalize match scores. If you add an email address, your skin type, concerns and liked and
          disliked ingredients are also saved with your email so they follow you to every device you sign in on.
          Your pregnancy and breastfeeding answers are never saved in our database: they stay only in your
          browser&apos;s cookie, and signing out removes them from that browser.
        </li>
        <li>
          <strong>Avoid list</strong>: the ingredient checks and allergens you turn on, including any added from
          a patch-test link your clinic gave you. It is stored in a cookie in your browser in the same way. If you
          add an email address, it is also saved with your email so it follows you to every device you sign in on.
        </li>
        <li>
          <strong>Shelf</strong>: products you mark as owned, wanted, or finished, and whether they are
          opened. It is stored in our database, linked to a random session identifier (see Cookies below)
          rather than to your name.
        </li>
        <li>
          <strong>Outcome reports</strong>: whether a product helped a concern and for how many weeks you used
          it. It is stored in our database, linked to your session identifier. It appears on the site only as
          part of an aggregate User Score, never individually.
        </li>
        <li>
          <strong>Email address (optional)</strong>: if you choose &ldquo;Save your shelf &amp; get alerts,&rdquo;
          we store your email address, when you confirmed it, which of your browsers are linked to it, and your
          email preferences. See <a href="#email">Email</a> below.
        </li>
        <li>
          <strong>Check-in answers</strong>: if check-ins are on, your answers to them (better, about the same,
          worse, or stopped, and whether you had a skin reaction), with the product, the concern, how many weeks
          you had been using it and when you answered. They are stored with your email record and count only
          in aggregate.
        </li>
        <li>
          <strong>Routines, votes and reports</strong>: routines you submit, including any display name and
          notes you add, are <strong>public</strong>. Votes and reports are stored with your session
          identifier so one browser counts once.
        </li>
        <li>
          <strong>Clinician applications</strong>: if you apply on the{" "}
          <Link href="/for-clinicians">For clinicians</Link> page, we collect your name, email address,
          credentials (such as board certification and NPI number) and your message.
        </li>
        <li>
          <strong>Messages</strong>: if you email us, we keep your email address and what you send.
        </li>
      </ul>
      <h3>Information collected automatically</h3>
      <p>
        Like almost every website, our servers and hosting provider record technical information with each
        request: IP address, browser user agent, the page requested, the referring page, and the time. We use
        it to operate and secure the site, including rate limiting and blocking automated scraping. Counters
        used for rate limiting are held only in server memory.
      </p>

      <h2 id="cookies">2. Cookies</h2>
      <p>
        We use only first-party cookies that {SITE_NAME} needs to work. We use no advertising, analytics or
        cross-site tracking cookies.
      </p>
      <table>
        <thead>
          <tr>
            <th>Cookie</th>
            <th>Purpose</th>
            <th>Expires</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>sw_session</td>
            <td>A random identifier, created when you first save a shelf item, outcome, routine or vote, that ties those to your browser without an account. If you confirm an email address, it also links this browser to that email</td>
            <td>1 year</td>
          </tr>
          <tr>
            <td>sw_profile</td>
            <td>Your skin profile</td>
            <td>1 year</td>
          </tr>
          <tr>
            <td>sw_avoid</td>
            <td>Your avoid list</td>
            <td>1 year</td>
          </tr>
        </tbody>
      </table>
      <p>
        If you clear these cookies, the site forgets your profile and avoid list. Any shelf items and outcome
        reports stay in our database, but nothing links them to you any longer. If you have added an email, signing in
        again brings back your shelf, avoid list and skin profile (but not your pregnancy or breastfeeding answers), and
        signing out removes the profile and avoid-list cookies from that browser.
      </p>

      <h3 id="email">Email</h3>
      <p>Giving us an email address is optional. Nothing else on {SITE_NAME} requires it. If you add one:</p>
      <ul>
        <li>
          <strong>Sign-in links.</strong> We email a one-time link to confirm the address. It works once and
          expires after 15 minutes. We store only a scrambled (hashed) form of it, and delete the record about a
          day after it expires. Opening the link on another device links that browser to the same shelf, avoid list and skin profile.
        </li>
        <li>
          <strong>Check-in emails</strong> (on unless you turn them off): when you mark a product on your shelf
          as opened, we email you a short question 2, 4, 8 and 12 weeks later about how your concern is going.
          The links in them record your answer without signing in. Your 8-week answer (or the 12-week one, if you
          skipped week 8) counts toward that product&apos;s aggregate User Score.
        </li>
        <li>
          <strong>Safety-alert emails</strong> (on unless you turn them off): if the FDA announces a recall that
          matches a product on your shelf (owned or wanted), we email you once about that recall. Recall
          information comes from the FDA&apos;s public openFDA database; we do not send any of your information to
          the FDA.
        </li>
        <li>
          Every check-in and safety-alert email has a one-click unsubscribe link, and you can change either
          setting, sign a device out, or delete your email and everything saved with it on the{" "}
          <Link href="/account">Email settings</Link> page.
        </li>
        <li>We never send marketing email, and never sell, rent or share your address for anyone else&apos;s marketing.</li>
      </ul>

      <h2 id="use">3. How we use information</h2>
      <ul>
        <li>To provide the features you use: match scores, your shelf, ingredient checks and routines.</li>
        <li>To calculate aggregate User Scores and rank community routines.</li>
        <li>If you add an email: to sign you in by link, keep your shelf, avoid list and skin profile across devices, and send the check-ins and safety alerts you have turned on.</li>
        <li>To review clinician applications and reply to people who contact us.</li>
        <li>To keep the site secure and working, and to prevent abuse, fraud and scraping.</li>
        <li>To comply with the law and enforce our <Link href="/terms">Terms of Service</Link>.</li>
      </ul>
      <p>We do not use your information for advertising, and we do not build profiles of you for marketing.</p>

      <h2 id="health-data">4. Consumer health data</h2>
      <p>
        Your skin concerns, your pregnancy or breastfeeding status, your liked and disliked ingredients, your outcome reports and your check-in answers may count as
        &ldquo;consumer health data&rdquo; under laws such as Washington&apos;s My Health My Data Act,
        Nevada&apos;s consumer health data law, and the {LEGAL_STATE} Data Privacy Act. This section is our
        consumer health data privacy policy. It applies to that information in addition to the rest of this
        policy.
      </p>
      <ul>
        <li>
          <strong>What we collect and where it comes from:</strong> only what you enter yourself (the
          categories above). We do not buy or receive health information from others, and we do not infer
          conditions from your browsing.
        </li>
        <li>
          <strong>Why:</strong> only to provide the feature you are using, such as personalized matching or
          aggregate User Scores.
        </li>
        <li>
          <strong>Consent:</strong> nothing is collected until you choose to save a profile, submit an
          outcome, or answer a check-in, and each of those is an action you take for that purpose. You can withdraw at any time by
          clearing your profile on the <Link href="/profile">My skin</Link> page, clearing your cookies, or
          writing to us.
        </li>
        <li>
          <strong>Sharing:</strong> we share it only with the service providers that host and run the site,
          under their obligations to protect it, and where the law requires it. We never sell consumer health
          data and never use it for advertising.
        </li>
        <li>
          <strong>Your rights:</strong> you may ask us to confirm whether we hold your consumer health data,
          to give you a copy of it, or to delete it. Section 8 explains how.
        </li>
      </ul>

      <h2 id="share">5. How information is shared</h2>
      <p>We do not sell personal information. We share it only as follows:</p>
      <ul>
        <li>
          <strong>Service providers</strong> who run the site for us: our hosting provider (Railway) and, if you
          add an email address, our email delivery provider (Resend), which receives your address and the content
          of the emails we send you in order to deliver them. They process data on our instructions.
        </li>
        <li>
          <strong>Public content</strong>: routines you submit, including any display name, are visible to
          everyone.
        </li>
        <li>
          <strong>Legal and safety</strong>: when required by law or legal process, or to protect the rights,
          safety or property of {SITE_NAME}, our users or others.
        </li>
        <li>
          <strong>Business transfer</strong>: if {SITE_NAME} is merged, acquired or sold, information may pass to
          the new owner, and this policy will continue to apply to it.
        </li>
      </ul>
      <h3>Affiliate links and third-party content</h3>
      <p>
        Some product links are affiliate links. When you click one, you leave {SITE_NAME}. The retailer or
        affiliate network (for example, impact.com) may set its own cookies to record that you came from
        {SITE_NAME} and whether you bought something. That tracking is governed by their privacy policies. The
        commission reports we receive do not identify you to us. Outbound shopping links, including links to
        retailers and brand sites, may go through Sovrn, an affiliate service, which may set its own cookies.
      </p>
      <p>
        Some product images and video thumbnails load directly from outside sources such as Open Beauty
        Facts, retailers and YouTube. Those servers receive your IP address and browser information when the
        image loads.
      </p>

      <h2 id="retention">6. How long we keep information</h2>
      <ul>
        <li>Cookies expire one year after they are last set, or sooner if you clear them.</li>
        <li>
          Shelf items, outcome reports, routines and votes are kept for as long as the site offers those
          features, or until you ask us to delete them. Outcome reports may be kept in aggregate, de-identified
          form.
        </li>
        <li>
          Your email address, preferences, check-in schedule and answers, and the record of which safety alerts we
          sent you are kept until you delete them on the <Link href="/account">Email settings</Link> page or ask
          us to. Deleting removes them, along with your avoid list, shelf, regimen, outcome reports, votes, reports and any
          routines saved with that email, on every linked device. Sign-in link records are deleted about a day
          after the link expires. Copies held by our email provider are kept under its own retention limits.
        </li>
        <li>
          Clinician applications are kept while we review them and for up to two years afterwards, unless you
          ask us to delete yours sooner.
        </li>
        <li>Server logs are kept for a limited period set by our hosting provider, then deleted.</li>
      </ul>

      <h2 id="security">7. Security</h2>
      <p>
        We use reasonable safeguards to protect information: encrypted connections (HTTPS), cookies that page
        scripts cannot read, one-time sign-in links stored only in hashed form, signed and expiring links in our
        emails, and limits on who can access our systems. No method of storing or sending data is
        completely secure, so we cannot guarantee absolute security.
      </p>

      <h2 id="rights">8. Your choices and rights</h2>
      <ul>
        <li>
          Edit or clear your data at any time on the <Link href="/profile">My skin</Link>,{" "}
          <Link href="/shelf">My shelf</Link> and <Link href="/avoid">My avoid list</Link> pages, or by clearing
          your cookies. If you added an email, the <Link href="/account">Email settings</Link> page lets you turn
          off check-ins or safety alerts and delete your email and all data saved with it.
        </li>
        <li>
          Depending on where you live (including Connecticut, California, Washington and other US states), you
          may have the right to access, correct, delete or get a copy of your personal information, and to opt
          out of its sale, of targeted advertising and of profiling. We do not sell or target, but you may still
          make any request.
        </li>
        <li>
          We treat a Global Privacy Control signal from your browser as a valid request to opt out.
        </li>
      </ul>
      <p>
        To make a request, email {mail}. If you never added an email address, we may need details from you, such as
        what you saved and roughly when, to find information linked to your browser. We will not discriminate
        against you for exercising your rights. We aim to reply within 45 days. If we deny your request, you
        can appeal by replying with &ldquo;Appeal&rdquo; in the subject line. If you disagree with our
        decision on appeal, you may contact your state attorney general.
      </p>

      <h2 id="children">9. Children</h2>
      <p>
        {SITE_NAME} is not directed to children under 13, and we do not knowingly collect personal information
        from them. If you believe a child under 13 has given us information, email {mail} and we will delete
        it.
      </p>

      <h2 id="international">10. Where data is processed</h2>
      <p>
        {SITE_NAME} is operated from, and hosted in, the United States. If you use it from another country, your
        information will be processed in the US.
      </p>

      <h2 id="changes">11. Changes to this policy</h2>
      <p>
        We may update this policy. The date at the top shows when it last changed. If a change materially
        affects how we use information we already hold, we will post a clear notice on the site before it
        takes effect.
      </p>

      <h2 id="contact">12. Contact</h2>
      <p>Questions or requests about privacy: {mail}.</p>
    </LegalPage>
  );
}
