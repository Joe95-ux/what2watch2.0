/**
 * OMDB API utilities
 * Documentation: http://www.omdbapi.com/
 */

const OMDB_BASE_URL = 'http://www.omdbapi.com/';

export interface OMDBResponse {
  Title: string;
  Year: string;
  Rated: string;
  Released: string;
  Runtime: string;
  Genre: string;
  Director: string;
  Writer: string;
  Actors: string;
  Plot: string;
  Language: string;
  Country: string;
  Awards: string;
  Poster: string;
  Ratings: Array<{
    Source: string;
    Value: string;
  }>;
  Metascore: string;
  imdbRating: string;
  imdbVotes: string;
  imdbID: string;
  Type: string;
  DVD: string;
  BoxOffice: string;
  Production: string;
  Website: string;
  Response: string;
  Error?: string;
}

export interface IMDbRating {
  rating: number;
  votes: number;
  source: 'imdb';
}

export interface OMDBFullData {
  imdbRating: number | null;
  imdbVotes: number | null;
  metascore: number | null;
  rottenTomatoes: {
    critic?: number | null;
    audience?: number | null;
  } | null;
  awards: string | null;
  rated: string | null; // MPAA rating
  boxOffice: string | null;
  production: string | null;
  dvd: string | null;
  website: string | null;
}

/**
 * Fetch full OMDB data using IMDb ID
 */
export async function getOMDBFullData(imdbId: string): Promise<OMDBFullData | null> {
  const apiKey = process.env.OMDB_API_KEY;
  if (!apiKey) {
    console.warn('OMDB_API_KEY is not set');
    return null;
  }

  try {
    const url = new URL(OMDB_BASE_URL);
    url.searchParams.append('i', imdbId);
    url.searchParams.append('apikey', apiKey);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url.toString(), {
        signal: controller.signal,
        next: { revalidate: 86400 }, // Cache for 24 hours
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`OMDB API error: ${response.statusText} (${response.status})`);
      }

      const data = await response.json() as OMDBResponse;

      if (data.Response === 'False' || data.Error) {
        throw new Error(data.Error || 'OMDB API returned an error');
      }

      // Parse IMDb rating
      const imdbRating = data.imdbRating && data.imdbRating !== 'N/A' 
        ? parseFloat(data.imdbRating) 
        : null;
      const imdbVotes = data.imdbVotes && data.imdbVotes !== 'N/A'
        ? parseInt(data.imdbVotes.replace(/,/g, ''), 10)
        : null;

      // Parse Metascore
      const metascore = data.Metascore && data.Metascore !== 'N/A'
        ? parseInt(data.Metascore, 10)
        : null;

      // Parse Rotten Tomatoes ratings
      let rottenTomatoes: { critic?: number | null; audience?: number | null } | null = null;
      if (data.Ratings && Array.isArray(data.Ratings)) {
        const rtCritic = data.Ratings.find(r => r.Source === 'Rotten Tomatoes');
        
        if (rtCritic) {
          // RT ratings are typically in format "85%" or "85/100"
          const criticValue = rtCritic.Value.replace('%', '').split('/')[0];
          const criticNum = parseInt(criticValue, 10);
          rottenTomatoes = {
            critic: !isNaN(criticNum) && criticNum > 0 ? criticNum : null,
          };
        }
      }

      return {
        imdbRating: imdbRating && !isNaN(imdbRating) && imdbRating > 0 ? imdbRating : null,
        imdbVotes: imdbVotes && !isNaN(imdbVotes) ? imdbVotes : null,
        metascore: metascore && !isNaN(metascore) && metascore > 0 ? metascore : null,
        rottenTomatoes,
        awards: data.Awards && data.Awards !== 'N/A' ? data.Awards : null,
        rated: data.Rated && data.Rated !== 'N/A' ? data.Rated : null,
        boxOffice: data.BoxOffice && data.BoxOffice !== 'N/A' ? data.BoxOffice : null,
        production: data.Production && data.Production !== 'N/A' ? data.Production : null,
        dvd: data.DVD && data.DVD !== 'N/A' ? data.DVD : null,
        website: data.Website && data.Website !== 'N/A' ? data.Website : null,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError' || error.message.includes('timeout')) {
          throw new Error('Request timeout: OMDB API took too long to respond');
        }
      }
      
      throw error;
    }
  } catch (error) {
    console.error('Error fetching OMDB full data:', error);
    return null;
  }
}

/**
 * Fetch IMDb rating from OMDB API using IMDb ID
 */
export async function getIMDBRating(imdbId: string): Promise<IMDbRating | null> {
  const apiKey = process.env.OMDB_API_KEY;
  if (!apiKey) {
    console.warn('OMDB_API_KEY is not set');
    return null;
  }

  try {
    const url = new URL(OMDB_BASE_URL);
    url.searchParams.append('i', imdbId);
    url.searchParams.append('apikey', apiKey);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(url.toString(), {
        signal: controller.signal,
        next: { revalidate: 86400 }, // Cache for 24 hours
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`OMDB API error: ${response.statusText} (${response.status})`);
      }

      const data = await response.json() as OMDBResponse;

      if (data.Response === 'False' || data.Error) {
        throw new Error(data.Error || 'OMDB API returned an error');
      }

      if (data.imdbRating && data.imdbRating !== 'N/A') {
        const rating = parseFloat(data.imdbRating);
        const votes = data.imdbVotes && data.imdbVotes !== 'N/A' 
          ? parseInt(data.imdbVotes.replace(/,/g, ''), 10) 
          : 0;

        if (!isNaN(rating) && rating > 0) {
          return {
            rating,
            votes,
            source: 'imdb',
          };
        }
      }

      return null;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError' || error.message.includes('timeout')) {
          throw new Error('Request timeout: OMDB API took too long to respond');
        }
      }
      
      throw error;
    }
  } catch (error) {
    console.error('Error fetching IMDb rating from OMDB:', error);
    return null;
  }
}

