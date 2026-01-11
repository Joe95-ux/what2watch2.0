import React from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

const TermsPage = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card className="max-w-[800px] mx-auto rounded-[5px]">
        <CardHeader className="bg-muted/50 py-3 rounded-t-[5px]">
          <h1 className="text-3xl font-bold">Terms of Service</h1>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. General</h2>
            <p className="text-muted-foreground leading-relaxed">
              By using the what2watch.net website (www.what2watch.net) and/or purchasing a premium account, you agree to the following terms of service. If you do not agree with these terms, please do not use this service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Access Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              A premium account grants you a limited, non-transferable right to access data exclusively available to paying users. This access may not be shared, sold, transferred, or used for commercial purposes without explicit permission from the what2watch.net team.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Prohibition of Automated Data Collection (Scraping)</h2>
            <p className="text-muted-foreground leading-relaxed">
              The use of automated tools or scripts to collect data from what2watch.net is strictly prohibited. what2watch.net uses advanced detection systems to identify suspicious activities, including automated behavior and scraping attempts. Upon detection, we reserve the right to immediately suspend or terminate the account without prior notice and without a refund.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Content Sharing</h2>
            <p className="text-muted-foreground leading-relaxed">
              All data accessed through a premium account on what2watch.net is for personal use only. Sharing, publishing, or selling any portion of the content without written permission is strictly prohibited.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Refund Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              If a user violates these terms (e.g. scraping, sharing data, system abuse), the account may be suspended or permanently deactivated without eligibility for a refund.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              what2watch.net reserves the right to modify these terms at any time. Updated terms will be posted on the website, and continued use of the service constitutes acceptance of the changes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Package and Pricing Changes</h2>
            <p className="text-muted-foreground leading-relaxed">
              what2watch.net reserves the right to modify subscription packages, available features, and pricing at any time, without prior notice. Such changes do not entitle the user to a refund, including cases where the user decides to discontinue the service due to new conditions.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  )
}

export default TermsPage