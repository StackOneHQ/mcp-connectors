import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { parse as parseHTML } from 'node-html-parser';
import { z } from 'zod';

interface TennisCourt {
  name: string;
  address: string;
  availableTimes: string[];
  hasMembersTimes: boolean;
}

const BASE_URL = 'https://www.lta.org.uk/play/book-a-tennis-court/';
const SEARCH_URL = 'https://www.lta.org.uk/play/book-a-tennis-court/results/';

const fetchCourtAvailability = async (
  latitude: number,
  longitude: number,
  location: string,
  date: string,
  timeRange: string
): Promise<TennisCourt[]> => {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    location,
    date,
    timeRange,
  });

  const url = `${BASE_URL}?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const html = await response.text();
    const courts = parseCourtResults(html);
    return courts;
  } catch (error) {
    throw error;
  }
};

const parseCourtResults = (html: string): TennisCourt[] => {
  const courts: TennisCourt[] = [];
  const root = parseHTML(html);


  // Look for court listings with the actual class found in the HTML
  // The divs have multiple classes: lta-card lta-card--borderless lta-card-court-booking
  const courtListings = root.querySelectorAll('.lta-card.lta-card--borderless.lta-card-court-booking');

  for (const listing of courtListings) {
    // Extract venue name from h2 inside lta-card-header
    const nameElem = listing.querySelector('.lta-card-title a');
    const name = nameElem?.text.trim() || '';

    // Extract address from the court details span
    const detailsElem = listing.querySelector('.lta-cart-court-details span');
    let address = '';
    if (detailsElem) {
      // Extract just the postcode part (before the distance)
      const addressText = detailsElem.text.trim();
      const addressMatch = addressText.match(/^([A-Z]{1,2}\d{1,2}\s*\d{1,2}[A-Z]{2})/);
      address = addressMatch ? addressMatch[1] : addressText.split('(')[0].trim();
    }

    // Extract available times from the availability hours div
    const availableTimesElements = listing.querySelectorAll('.lta-court-availability-hours span');
    const availableTimes: string[] = [];
    
    for (const timeElem of availableTimesElements) {
      const time = timeElem.text.trim();
      if (time && time.includes('-')) {
        availableTimes.push(time);
      }
    }

    // Check for member times by looking for member-related text
    const availabilityDiv = listing.querySelector('.lta-card-court-availability');
    const hasMembersTimes = availabilityDiv ? availabilityDiv.text.toLowerCase().includes('member') : false;

    if (name) {
      courts.push({
        name,
        address: address || 'Address not available',
        availableTimes,
        hasMembersTimes,
      });
    }
  }


  return courts;
};

const formatCourtsForLLM = (courts: TennisCourt[]): string => {
  if (courts.length === 0) {
    return 'No tennis courts found with availability for the specified location and time range.';
  }

  const output = [`Found ${courts.length} tennis courts with availability:\n`];

  for (let i = 0; i < courts.length; i++) {
    const court = courts[i];
    output.push(`${i + 1}. ${court.name}`);
    output.push(`   Address: ${court.address}`);
    
    if (court.availableTimes.length > 0) {
      output.push(`   Available times: ${court.availableTimes.join(', ')}`);
    } else {
      output.push('   No available times in the selected range');
    }
    
    if (court.hasMembersTimes) {
      output.push('   Note: Member\'s times also available');
    }
    
    output.push(''); // Empty line between courts
  }

  return output.join('\n');
};

const parseTimeRange = (timeRange: string): { startHour: number; endHour: number } => {
  const [start, end] = timeRange.split('-');
  const startHour = parseInt(start.split(':')[0], 10);
  const endHour = parseInt(end.split(':')[0], 10);
  return { startHour, endHour };
};

export const LTAConnectorConfig = mcpConnectorConfig({
  name: 'LTA Tennis Courts',
  key: 'lta',
  logo: 'https://www.lta.org.uk/4a0c7f/globalassets/images/lta-logo.svg',
  version: '1.0.0',
  credentials: z.object({}),
  setup: z.object({}),
  examplePrompt:
    'Find available tennis courts in London for tomorrow afternoon between 2pm and 5pm.',
  tools: (tool) => ({
    FIND_COURTS: tool({
      name: 'find_courts',
      description: 'Find available tennis courts at a specific location and time',
      schema: z.object({
        latitude: z.number().describe('Latitude coordinate of the search location'),
        longitude: z.number().describe('Longitude coordinate of the search location'),
        location: z.string().describe('Location name (e.g., "London, UK")'),
        date: z.string().describe('Date in YYYY-MM-DD format'),
        timeRange: z
          .string()
          .default('12:00-17:00')
          .describe('Time range in HH:MM-HH:MM format (e.g., "12:00-17:00")'),
      }),
      handler: async (args, _context) => {
        try {
          const courts = await fetchCourtAvailability(
            args.latitude,
            args.longitude,
            args.location,
            args.date,
            args.timeRange
          );
          return formatCourtsForLLM(courts);
        } catch (error) {
          return `An error occurred while searching for tennis courts: ${
            error instanceof Error ? error.message : String(error)
          }`;
        }
      },
    }),
    SEARCH_BY_CITY: tool({
      name: 'search_by_city',
      description: 'Search for tennis courts by city name with automatic geocoding',
      schema: z.object({
        city: z.string().describe('City name (e.g., "London", "Manchester")'),
        date: z.string().describe('Date in YYYY-MM-DD format'),
        startTime: z
          .string()
          .default('12:00')
          .describe('Start time in HH:MM format (e.g., "14:00")'),
        endTime: z
          .string()
          .default('17:00')
          .describe('End time in HH:MM format (e.g., "17:00")'),
      }),
      handler: async (args, _context) => {
        try {
          // Geocode the city to get coordinates
          const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            args.city
          )},UK&limit=1`;
          
          const geoResponse = await fetch(geocodeUrl, {
            headers: {
              'User-Agent': 'LTA Tennis Court Finder',
            },
          });
          
          if (!geoResponse.ok) {
            throw new Error('Failed to geocode city');
          }
          
          const geoData = await geoResponse.json();
          if (!geoData || geoData.length === 0) {
            return `Could not find coordinates for city: ${args.city}`;
          }
          
          const latitude = parseFloat(geoData[0].lat);
          const longitude = parseFloat(geoData[0].lon);
          const location = `${args.city}, UK`;
          const timeRange = `${args.startTime}-${args.endTime}`;
          
          const courts = await fetchCourtAvailability(
            latitude,
            longitude,
            location,
            args.date,
            timeRange
          );
          
          return formatCourtsForLLM(courts);
        } catch (error) {
          return `An error occurred while searching for tennis courts: ${
            error instanceof Error ? error.message : String(error)
          }`;
        }
      },
    }),
  }),
});