import React from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

const AboutPage = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card className="max-w-[800px] mx-auto rounded-[5px]">
        <CardHeader className="bg-muted/50 py-3 rounded-t-[5px]">
          <h1 className="text-3xl font-bold">About Us</h1>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">What is what2watch?</h2>
            <p className="text-muted-foreground leading-relaxed">
              what2watch.net is a comprehensive platform designed to help you discover, organize, and enjoy your favorite movies and TV shows. We provide a seamless experience for managing your watchlists, exploring personalized recommendations, and staying up-to-date with the latest content across various streaming platforms.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Our platform combines powerful search capabilities, intelligent recommendations, and user-friendly tools to make finding your next favorite watch effortless. Whether you're looking for the latest releases, classic films, or hidden gems, what2watch.net is your trusted companion in the world of entertainment.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Our Mission</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our mission is to simplify the entertainment discovery process and help users make informed decisions about what to watch. We strive to create an intuitive, accessible platform that connects viewers with content they'll love, while respecting their privacy and providing a secure, trustworthy experience.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              We believe that finding great content shouldn't be overwhelming. By leveraging technology and user insights, we aim to transform how people discover and engage with movies and TV shows, making entertainment more enjoyable and accessible for everyone.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Our Vision</h2>
            <p className="text-muted-foreground leading-relaxed">
              We envision a future where discovering entertainment is effortless, personalized, and enjoyable. Our goal is to become the go-to platform for entertainment discovery, where users can confidently find content that matches their preferences, mood, and interests.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              We are committed to continuous innovation, improving our recommendations, expanding our content database, and enhancing user experience while maintaining the highest standards of privacy and data protection. We aim to build a community of entertainment enthusiasts who trust us with their viewing preferences and rely on us for their entertainment discovery needs.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Our Commitment to Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              At what2watch.net, your privacy is not just a policy—it's a fundamental principle that guides everything we do. We understand that your viewing preferences and personal information are sensitive, and we are committed to protecting them with the utmost care and transparency.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              We implement industry-standard security measures to safeguard your data, use encryption where appropriate, and never sell your personal information to third parties. We collect only the information necessary to provide you with the best possible experience, and we give you full control over your data.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              You have the right to access, modify, or delete your personal information at any time. We are transparent about our data practices and provide clear information about how we use your data in our Privacy Policy. Your trust is essential to us, and we work continuously to earn and maintain it through responsible data handling and privacy protection.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  )
}

export default AboutPage