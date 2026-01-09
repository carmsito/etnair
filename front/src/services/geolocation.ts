/**
 * Service de géolocalisation utilisant Nominatim (OpenStreetMap)
 * 100% gratuit, aucun token requis
 * Documentation: https://nominatim.org/release-docs/latest/api/Overview/
 */

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org'

export interface GeoLocation {
  placeId: number
  displayName: string
  address: string
  city: string
  postalCode: string
  country: string
  lat: number
  lon: number
}

export interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
  address?: {
    house_number?: string
    road?: string
    suburb?: string
    city?: string
    town?: string
    village?: string
    municipality?: string
    postcode?: string
    country?: string
    country_code?: string
  }
}

/**
 * Recherche d'adresses avec autocomplétion
 * @param query - Le texte à rechercher
 * @param countryCode - Code pays pour limiter la recherche (ex: 'fr' pour France)
 */
export async function searchAddress(query: string, countryCode: string = 'fr'): Promise<GeoLocation[]> {
  if (!query || query.length < 3) return []
  
  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      addressdetails: '1',
      limit: '8',
      countrycodes: countryCode,
      'accept-language': 'fr',
    })
    
    const response = await fetch(`${NOMINATIM_BASE_URL}/search?${params}`, {
      headers: {
        'User-Agent': 'ETNAir/1.0 (contact@etnair.com)',
      },
    })
    
    if (!response.ok) {
      throw new Error('Erreur lors de la recherche')
    }
    
    const data: NominatimResult[] = await response.json()
    
    return data.map(parseNominatimResult)
  } catch (error) {
    console.error('Erreur géolocalisation:', error)
    return []
  }
}

/**
 * Recherche inversée : obtenir l'adresse à partir de coordonnées
 */
export async function reverseGeocode(lat: number, lon: number): Promise<GeoLocation | null> {
  try {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lon.toString(),
      format: 'json',
      addressdetails: '1',
      'accept-language': 'fr',
    })
    
    const response = await fetch(`${NOMINATIM_BASE_URL}/reverse?${params}`, {
      headers: {
        'User-Agent': 'ETNAir/1.0 (contact@etnair.com)',
      },
    })
    
    if (!response.ok) {
      throw new Error('Erreur lors de la recherche inversée')
    }
    
    const data: NominatimResult = await response.json()
    return parseNominatimResult(data)
  } catch (error) {
    console.error('Erreur géolocalisation inversée:', error)
    return null
  }
}

/**
 * Parse le résultat Nominatim en GeoLocation
 */
function parseNominatimResult(result: NominatimResult): GeoLocation {
  const addr = result.address || {}
  
  // Construire l'adresse complète
  let streetAddress = ''
  if (addr.house_number) streetAddress += addr.house_number + ' '
  if (addr.road) streetAddress += addr.road
  if (!streetAddress && addr.suburb) streetAddress = addr.suburb
  
  // Déterminer la ville (peut être city, town, village ou municipality)
  const city = addr.city || addr.town || addr.village || addr.municipality || ''
  
  return {
    placeId: result.place_id,
    displayName: result.display_name,
    address: streetAddress.trim(),
    city: city,
    postalCode: addr.postcode || '',
    country: addr.country || 'France',
    lat: parseFloat(result.lat),
    lon: parseFloat(result.lon),
  }
}

/**
 * Debounce helper pour éviter trop d'appels API
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Générer l'URL d'une carte statique OpenStreetMap
 */
export function getMapImageUrl(lat: number, lon: number, zoom: number = 15): string {
  // Utiliser OpenStreetMap tiles directement via une iframe
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.01}%2C${lat - 0.01}%2C${lon + 0.01}%2C${lat + 0.01}&layer=mapnik&marker=${lat}%2C${lon}`
}

/**
 * Générer l'URL vers OpenStreetMap pour un lien externe
 */
export function getMapUrl(lat: number, lon: number): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}&zoom=16`
}
