"""Geographic utility functions."""
from math import radians, sin, cos, sqrt, atan2
from typing import TypedDict

class GeoPoint(TypedDict):
    """Geographic point matching TypeScript GeoPoint."""
    lat: float
    lng: float

def haversine_distance(point1: GeoPoint, point2: GeoPoint) -> float:
    """
    Calculate geographic distance in kilometers between two points using Haversine formula.

    Args:
        point1: GeoPoint with lat and lng
        point2: GeoPoint with lat and lng

    Returns:
        Distance in kilometers
    """
    R = 6371  # Earth's radius in km

    lat1, lon1 = radians(point1['lat']), radians(point1['lng'])
    lat2, lon2 = radians(point2['lat']), radians(point2['lng'])

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))

    return R * c

def calculate_impact_radius(event_type: str, severity: int) -> int:
    """
    Calculate the geographic impact radius (in meters) based on event type and severity.

    Args:
        event_type: Type of event (natural_disaster, weather, war, geopolitical, tariff, infrastructure)
        severity: Severity score 1-10

    Returns:
        Impact radius in meters
    """
    # Base radius by severity
    if severity <= 3:
        base_radius = 50_000  # 50km
    elif severity <= 6:
        base_radius = 150_000  # 150km
    else:
        base_radius = 300_000  # 300km

    # Modifiers by event type
    multipliers = {
        "weather": 1.5,  # Typhoons/hurricanes affect wider area
        "war": 2.0,      # Wars affect entire regions
        "geopolitical": 1.3,
        "natural_disaster": 1.0,
        "tariff": 0.5,   # Tariffs are country-level, not geographic
        "infrastructure": 0.8
    }

    multiplier = multipliers.get(event_type, 1.0)
    return int(base_radius * multiplier)
