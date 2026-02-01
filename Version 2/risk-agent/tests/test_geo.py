"""Test geographic utilities."""
from src.utils.geo import haversine_distance, calculate_impact_radius

def test_haversine_distance():
    """Test distance calculation between two points."""
    # San Francisco to Los Angeles (approx 559 km)
    sf = {"lat": 37.7749, "lng": -122.4194}
    la = {"lat": 34.0522, "lng": -118.2437}

    distance = haversine_distance(sf, la)

    assert 550 < distance < 570  # Approximate range

def test_calculate_impact_radius():
    """Test impact radius calculation."""
    # Severity 5 natural disaster should be 150km
    radius = calculate_impact_radius("natural_disaster", 5)
    assert radius == 150_000

    # Severity 8 war should be 600km (300km * 2.0 multiplier)
    radius = calculate_impact_radius("war", 8)
    assert radius == 600_000

    # Severity 2 should be 50km
    radius = calculate_impact_radius("tariff", 2)
    assert radius == 25_000  # 50km * 0.5 tariff multiplier
