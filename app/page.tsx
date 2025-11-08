import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  Film, 
  Tv, 
  Heart, 
  List, 
  MessageSquare, 
  Sparkles,
  TrendingUp,
  Users,
  Search,
  Star
} from "lucide-react";
import { SignInButton } from "@clerk/nextjs";
import Navbar from "@/components/navbar/navbar";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative flex-1 flex items-center justify-center px-4 py-20 md:py-32 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-primary/5" />
        
        <div className="container relative z-10 max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">Your Personal Entertainment Hub</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Discover Your Next
            <br />
            <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              Favorite Watch
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            The ultimate platform for movie and TV show enthusiasts. 
            Find, organize, and share your favorite content with personalized recommendations 
            tailored just for you.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <SignInButton mode="modal">
              <Button size="lg" className="text-lg px-8 py-6">
                Get Started Free
              </Button>
            </SignInButton>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6" asChild>
              <Link href="/browse">Explore Now</Link>
            </Button>
          </div>
          
          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">10K+</div>
              <div className="text-sm text-muted-foreground">Movies & Shows</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">50K+</div>
              <div className="text-sm text-muted-foreground">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">100K+</div>
              <div className="text-sm text-muted-foreground">Reviews</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">5K+</div>
              <div className="text-sm text-muted-foreground">Playlists</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-32 bg-muted/30">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to Discover Great Content
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed to enhance your entertainment experience
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Search className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Smart Discovery</h3>
              <p className="text-muted-foreground">
                Find movies and TV shows with advanced filters by genre, year, rating, and more. 
                Get personalized recommendations based on your preferences.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Heart className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Favorites & Lists</h3>
              <p className="text-muted-foreground">
                Save your favorite movies and TV shows. Create custom playlists to organize 
                your watchlist exactly how you want.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Star className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Reviews & Ratings</h3>
              <p className="text-muted-foreground">
                Share your thoughts with detailed reviews and ratings. Help others discover 
                great content through your insights.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Community Forums</h3>
              <p className="text-muted-foreground">
                Join discussions about your favorite shows and movies. Connect with fellow 
                enthusiasts and share recommendations.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <List className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Custom Playlists</h3>
              <p className="text-muted-foreground">
                Create and share playlists with friends. Organize content by theme, mood, 
                or any category you can imagine.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Personalized Feed</h3>
              <p className="text-muted-foreground">
                Get a customized feed based on your preferences. Our onboarding process 
                learns what you love to show you the best content.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 md:py-32">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get started in minutes and discover your next favorite watch
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Sign Up & Onboard</h3>
              <p className="text-muted-foreground">
                Create your account and tell us about your preferences. 
                We'll customize your experience from day one.
              </p>
            </div>

            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Explore & Discover</h3>
              <p className="text-muted-foreground">
                Browse thousands of movies and TV shows. Use filters to find exactly 
                what you're looking for.
              </p>
            </div>

            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Save & Share</h3>
              <p className="text-muted-foreground">
                Add favorites, create playlists, write reviews, and share with friends. 
                Build your personal entertainment library.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 bg-primary/5">
        <div className="container max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Discover Your Next Favorite?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of users who are already discovering amazing movies and TV shows. 
            Start your journey today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <SignInButton mode="modal">
              <Button size="lg" className="text-lg px-8 py-6">
                Get Started Free
              </Button>
            </SignInButton>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6" asChild>
              <Link href="/browse">Browse Content</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-semibold mb-4">What2Watch</h3>
              <p className="text-sm text-muted-foreground">
                Your personal entertainment hub for discovering movies and TV shows.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Explore</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/browse" className="text-muted-foreground hover:text-foreground">Browse</Link></li>
                <li><Link href="/movies" className="text-muted-foreground hover:text-foreground">Movies</Link></li>
                <li><Link href="/tv" className="text-muted-foreground hover:text-foreground">TV Shows</Link></li>
                <li><Link href="/forums" className="text-muted-foreground hover:text-foreground">Forums</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Account</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/my-list" className="text-muted-foreground hover:text-foreground">My List</Link></li>
                <li><Link href="/playlists" className="text-muted-foreground hover:text-foreground">Playlists</Link></li>
                <li><Link href="/profile" className="text-muted-foreground hover:text-foreground">Profile</Link></li>
                <li><Link href="/settings" className="text-muted-foreground hover:text-foreground">Settings</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Connect</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/about" className="text-muted-foreground hover:text-foreground">About</Link></li>
                <li><Link href="/contact" className="text-muted-foreground hover:text-foreground">Contact</Link></li>
                <li><Link href="/privacy" className="text-muted-foreground hover:text-foreground">Privacy</Link></li>
                <li><Link href="/terms" className="text-muted-foreground hover:text-foreground">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} What2Watch. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
