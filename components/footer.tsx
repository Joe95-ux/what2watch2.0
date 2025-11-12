import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col items-center justify-center gap-4">
          {/* Powered by TMDB */}
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs text-muted-foreground">Powered by</p>
            <Link
              href="https://www.themoviedb.org"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center hover:opacity-80 transition-opacity"
            >
              <Image
                src="/moviedb-logo2.svg"
                alt="The Movie Database"
                width={80}
                height={16}
                className="h-4 w-auto"
              />
            </Link>
          </div>
          {/* Copyright */}
          <p className="text-xs text-muted-foreground">
            &copy; {currentYear} What2Watch. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

