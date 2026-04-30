import React from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

const PrivacyPage = () => {
  // Get current date in DD/MM/YYYY format
  const currentDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card className="max-w-[800px] mx-auto rounded-[5px]">
        <CardHeader className="bg-muted/50 py-3 rounded-t-[5px]">
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground mt-2">Date: {currentDate}</p>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <section>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Welcome to what2watch.net.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Your privacy is important to us. This Privacy Policy explains how what2watch.net ("we", "us", or "our") collects, uses, and protects your information when you use our website https://www.what2watch.net.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              When you interact with our website, we may collect the following information:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li><strong>Personal Information:</strong> such as your username and email address when you register or contact us.</li>
              <li><strong>Technical Data:</strong> including your IP address, browser type, device information, and browsing behavior via Google Analytics.</li>
              <li><strong>Cookies and Usage Data:</strong> we use cookies and similar tracking technologies to enhance your experience and serve personalized content and ads (via Google AdSense).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We use the collected data for the following purposes:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>To operate and maintain our website</li>
              <li>To provide and manage your premium account and purchases</li>
              <li>To respond to inquiries via contact forms</li>
              <li>To analyze website traffic and usage trends</li>
              <li>To comply with legal obligations</li>
              <li>To serve relevant ads through Google AdSense</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Legal Basis for Processing (for EU Users)</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              If you are located in the European Union, we process your personal information based on the following legal grounds:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Your consent (e.g. for marketing or cookies)</li>
              <li>Contractual necessity (e.g. premium account services)</li>
              <li>Compliance with legal obligations</li>
              <li>Legitimate interests (e.g. site analytics and security)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Google AdSense and Third-Party Advertising</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use Google AdSense to serve ads. Google and its partners may use cookies and other tracking technologies to personalize ads and measure performance.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              You can learn more about how Google uses your data{' '}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                here
              </a>.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              You may opt out of personalized advertising via{' '}
              <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Ad Settings
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. YouTube API Services</h2>
            <p className="text-muted-foreground leading-relaxed">
              what2watch.net uses YouTube API Services to provide video and channel-related functionality.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              By using features that rely on YouTube API Services, you acknowledge and agree that YouTube data handling is also governed by Google&apos;s Privacy Policy:
              {" "}
              <a
                href="http://www.google.com/policies/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                http://www.google.com/policies/privacy
              </a>
              .
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              If you have authorized YouTube-connected features, you can revoke what2watch.net access any time from Google security settings:
              {" "}
              <a
                href="https://security.google.com/settings/security/permissions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                https://security.google.com/settings/security/permissions
              </a>
              .
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              You can also request deletion of YouTube-related stored data from within your account controls or by contacting{" "}
              <a href="mailto:privacy@what2watch.net" className="text-primary hover:underline">
                privacy@what2watch.net
              </a>
              . We process deletion requests as soon as possible and within 7 days where required.
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
              <li>Refresh/update cadence: YouTube API cache is refreshed on-demand when features are used and by scheduled background jobs (daily checks, with more frequent refresh for enabled datasets).</li>
              <li>Retention/deletion cadence: Non-authorized YouTube API cache is automatically deleted after 30 days through a scheduled retention cleanup job.</li>
              <li>User revocation/deletion: after user revocation or deletion request, related authorized data is deleted as soon as possible and within 7 days.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Data Sharing</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We do not sell your personal information. We may share your data with:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Service providers (e.g., hosting, analytics, payment processors)</li>
              <li>Legal authorities if required by law</li>
              <li>Advertisers via Google AdSense (in accordance with their policies)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Depending on your location, you may have the following rights:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Access, correct, or delete your personal data</li>
              <li>Object to or restrict processing</li>
              <li>Withdraw consent at any time</li>
              <li>File a complaint with a data protection authority</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              To exercise your rights, contact us at:{' '}
              <a href="mailto:privacy@what2watch.net" className="text-primary hover:underline">
                privacy@what2watch.net
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain personal data only as long as necessary to fulfill the purposes outlined in this policy, or as required by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement appropriate technical and organizational measures to protect your data, but no method is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our services are not intended for children under the age of 13. We do not knowingly collect data from minors.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. International Transfers</h2>
            <p className="text-muted-foreground leading-relaxed">
              As we operate globally, your information may be transferred to and maintained on servers outside your country. We ensure such transfers comply with applicable laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. Changes will be posted on this page with a new "Effective Date".
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">13. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions or requests regarding this Privacy Policy, please contact us at:
            </p>
            <div className="mt-3 space-y-1 text-muted-foreground">
              <p>
                Email:{' '}
                <a href="mailto:privacy@what2watch.net" className="text-primary hover:underline">
                  privacy@what2watch.net
                </a>
              </p>
              <p>
                Website:{' '}
                <a href="https://www.what2watch.net/contact-us" className="text-primary hover:underline">
                  https://www.what2watch.net/contact-us
                </a>
              </p>
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  )
}

export default PrivacyPage