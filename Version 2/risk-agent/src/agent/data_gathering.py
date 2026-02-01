"""Deterministic data gathering functions for risk assessment."""
from typing import Dict, Any, List
from src.db.supabase import supabase
from src.utils.geo import haversine_distance, calculate_impact_radius, GeoPoint


async def get_event_data(event_id: str) -> Dict[str, Any]:
    """
    Fetch complete event details from database.

    Args:
        event_id: UUID of the event

    Returns:
        Event data including type, severity, location, etc.

    Raises:
        ValueError: If event not found
    """
    try:
        result = supabase.table('events').select('*').eq('id', event_id).single().execute()

        if not result.data:
            raise ValueError(f"Event {event_id} not found")

        event = result.data

        # Build location from lat/lng if not already present
        location = event.get("location")
        if not location and event.get("lat") is not None and event.get("lng") is not None:
            location = {"lat": event["lat"], "lng": event["lng"]}

        return {
            "id": event["id"],
            "type": event["type"],
            "title": event["title"],
            "description": event["description"],
            "severity": event["severity"],
            "location": location,
            "polygon": event.get("polygon"),
            "start_date": event["start_date"],
            "end_date": event.get("end_date"),
            "source": event["source"]
        }
    except Exception as e:
        raise ValueError(f"Failed to fetch event {event_id}: {str(e)}")


async def query_affected_nodes(event_location: GeoPoint, impact_radius_meters: int) -> List[Dict[str, Any]]:
    """
    Find all supplier nodes within the impact radius.

    Args:
        event_location: Event location with lat/lng
        impact_radius_meters: Impact radius in meters

    Returns:
        List of affected nodes with distance information
    """
    try:
        # Fetch all companies - location stored as JSONB
        all_nodes = supabase.table('companies').select('*').execute()

        affected = []
        for node in all_nodes.data or []:
            # Check for location field OR lat/lng columns
            node_location = None
            if 'location' in node and node['location']:
                node_location = node['location']
            elif node.get('lat') is not None and node.get('lng') is not None:
                node_location = {'lat': node['lat'], 'lng': node['lng']}

            if node_location:
                distance_km = haversine_distance(event_location, node_location)
                if distance_km * 1000 <= impact_radius_meters:
                    affected.append({
                        'id': node['id'],
                        'name': node['name'],
                        'type': node['type'],
                        'location': node_location,
                        'distance_km': round(distance_km, 2),
                        'city': node.get('city'),
                        'country': node.get('country'),
                        'products': node.get('products', [])
                    })

        # Sort by distance (closest first)
        affected.sort(key=lambda x: x['distance_km'])
        return affected

    except Exception as e:
        print(f"Error querying affected nodes: {e}")
        return []


async def query_affected_connections(affected_node_ids: List[str]) -> List[Dict[str, Any]]:
    """
    Find all connections with affected endpoints.

    Args:
        affected_node_ids: List of affected node IDs

    Returns:
        List of affected connections
    """
    if not affected_node_ids:
        return []

    try:
        # Query connections where either endpoint is affected
        all_connections = supabase.table('connections').select('*').execute()

        affected_set = set(affected_node_ids)
        affected_connections = []

        for conn in all_connections.data or []:
            if conn['from_node_id'] in affected_set or conn['to_node_id'] in affected_set:
                affected_connections.append({
                    'id': conn['id'],
                    'from_node_id': conn['from_node_id'],
                    'to_node_id': conn['to_node_id'],
                    'transport_mode': conn['transport_mode'],
                    'materials': conn.get('materials', []),
                    'lead_time_days': conn.get('lead_time_days')
                })

        return affected_connections

    except Exception as e:
        print(f"Error querying affected connections: {e}")
        return []


async def find_alternative_supplier_candidates(
    affected_nodes: List[Dict[str, Any]],
    event_location: GeoPoint,
    impact_radius_meters: int,
    max_candidates: int = 10
) -> List[Dict[str, Any]]:
    """
    Find alternative supplier candidates outside the danger zone.

    Combines distance filtering (safety) with similarity scoring (capabilities).

    Args:
        affected_nodes: List of affected suppliers
        event_location: Event location
        impact_radius_meters: Danger zone radius
        max_candidates: Maximum candidates to return

    Returns:
        List of ranked alternative supplier candidates
    """
    if not affected_nodes:
        return []

    try:
        # Get all companies
        all_nodes = supabase.table('companies').select('*').execute()

        # Extract affected node IDs and their products
        affected_ids = {node['id'] for node in affected_nodes}
        affected_products = set()
        for node in affected_nodes:
            affected_products.update(node.get('products', []))

        # Find safe alternatives
        candidates = []
        safe_distance_km = (impact_radius_meters / 1000) + 50  # Add 50km buffer

        for node in all_nodes.data or []:
            # Skip if already affected
            if node['id'] in affected_ids:
                continue

            # Get location (support both location field and lat/lng columns)
            node_location = None
            if 'location' in node and node['location']:
                node_location = node['location']
            elif node.get('lat') is not None and node.get('lng') is not None:
                node_location = {'lat': node['lat'], 'lng': node['lng']}

            # Must have location
            if not node_location:
                continue

            # Check if outside danger zone
            distance_km = haversine_distance(event_location, node_location)
            if distance_km < safe_distance_km:
                continue

            # Calculate similarity score
            node_products = set(node.get('products', []))
            similarity_score = 0

            # Product overlap
            if affected_products and node_products:
                overlap = len(affected_products & node_products)
                similarity_score += overlap * 10

            # Same type bonus
            affected_types = {n['type'] for n in affected_nodes}
            if node['type'] in affected_types:
                similarity_score += 5

            # Proximity bonus (closer is better, but still safe)
            proximity_bonus = max(0, 100 - distance_km)
            similarity_score += proximity_bonus * 0.1

            candidates.append({
                'id': node['id'],
                'name': node['name'],
                'type': node['type'],
                'location': node_location,
                'distance_km': round(distance_km, 2),
                'products': node.get('products', []),
                'similarity_score': round(similarity_score, 2),
                'matching_products': list(affected_products & node_products)
            })

        # Sort by similarity score (highest first)
        candidates.sort(key=lambda x: x['similarity_score'], reverse=True)

        return candidates[:max_candidates]

    except Exception as e:
        print(f"Error finding alternative suppliers: {e}")
        return []


async def find_alternative_route_candidates(
    affected_connections: List[Dict[str, Any]],
    event_location: GeoPoint,
    impact_radius_meters: int,
    max_candidates: int = 10
) -> List[Dict[str, Any]]:
    """
    Find alternative route candidates that avoid the danger zone.

    Args:
        affected_connections: List of affected routes
        event_location: Event location
        impact_radius_meters: Danger zone radius
        max_candidates: Maximum candidates to return

    Returns:
        List of alternative route candidates
    """
    if not affected_connections:
        return []

    try:
        # Get all connections and companies (for endpoint locations)
        all_connections = supabase.table('connections').select('*').execute()
        all_companies = supabase.table('companies').select('id, location').execute()

        # Build location lookup (support both location field and lat/lng columns)
        location_map = {}
        for company in all_companies.data or []:
            if company.get('location'):
                location_map[company['id']] = company['location']
            elif company.get('lat') is not None and company.get('lng') is not None:
                location_map[company['id']] = {'lat': company['lat'], 'lng': company['lng']}

        # Extract affected connection IDs and materials
        affected_ids = {conn['id'] for conn in affected_connections}
        affected_materials = set()
        for conn in affected_connections:
            affected_materials.update(conn.get('materials', []))

        # Find safe alternative routes
        candidates = []
        safe_distance_km = (impact_radius_meters / 1000) + 50

        for conn in all_connections.data or []:
            # Skip if already affected
            if conn['id'] in affected_ids:
                continue

            # Get endpoint locations
            from_loc = location_map.get(conn['from_node_id'])
            to_loc = location_map.get(conn['to_node_id'])

            if not from_loc or not to_loc:
                continue

            # Check if both endpoints are outside danger zone
            from_dist = haversine_distance(event_location, from_loc)
            to_dist = haversine_distance(event_location, to_loc)

            if from_dist < safe_distance_km or to_dist < safe_distance_km:
                continue

            # Calculate similarity
            conn_materials = set(conn.get('materials', []))
            similarity_score = 0

            # Material overlap
            if affected_materials and conn_materials:
                overlap = len(affected_materials & conn_materials)
                similarity_score += overlap * 10

            # Transport mode match
            affected_modes = {c['transport_mode'] for c in affected_connections}
            if conn['transport_mode'] in affected_modes:
                similarity_score += 5

            candidates.append({
                'id': conn['id'],
                'from_node_id': conn['from_node_id'],
                'to_node_id': conn['to_node_id'],
                'transport_mode': conn['transport_mode'],
                'materials': conn.get('materials', []),
                'lead_time_days': conn.get('lead_time_days'),
                'min_distance_from_event_km': round(min(from_dist, to_dist), 2),
                'similarity_score': round(similarity_score, 2),
                'matching_materials': list(affected_materials & conn_materials)
            })

        # Sort by similarity
        candidates.sort(key=lambda x: x['similarity_score'], reverse=True)

        return candidates[:max_candidates]

    except Exception as e:
        print(f"Error finding alternative routes: {e}")
        return []


async def update_affected_entities_status(
    affected_entities: List[Dict],
    risk_category: str
) -> None:
    """
    Update connection and node statuses in database based on risk assessment.

    Args:
        affected_entities: List of affected entities from risk assessment
        risk_category: Risk level (healthy, monitoring, at-risk, critical, disrupted)
    """
    try:
        # Update connection statuses
        connection_ids = [
            entity['id'] for entity in affected_entities
            if entity['type'] == 'connection'
        ]

        if connection_ids:
            supabase.table('connections').update({
                'status': risk_category
            }).in_('id', connection_ids).execute()
            print(f"Updated {len(connection_ids)} connections to status: {risk_category}")

        # Update node statuses (if nodes table has status field)
        node_ids = [
            entity['id'] for entity in affected_entities
            if entity['type'] == 'node'
        ]

        if node_ids:
            # Note: Check if companies table has status field
            # If not, we may need to add it or skip this
            print(f"Found {len(node_ids)} affected nodes (status update skipped - no status field in companies table)")

    except Exception as e:
        print(f"Error updating entity statuses: {e}")


async def gather_risk_context(event_id: str) -> Dict[str, Any]:
    """
    Main entry point: Gather all data needed for risk assessment.

    Args:
        event_id: UUID of the event to analyze

    Returns:
        Complete context with all gathered data
    """
    # 1. Fetch event details
    event = await get_event_data(event_id)

    # 2. Calculate impact radius
    impact_radius_meters = calculate_impact_radius(event['type'], event['severity'])

    # 3. Find affected nodes
    affected_nodes = await query_affected_nodes(event['location'], impact_radius_meters)

    # 4. Find affected connections
    affected_node_ids = [node['id'] for node in affected_nodes]
    affected_connections = await query_affected_connections(affected_node_ids)

    # 5. Find alternative supplier candidates
    alternative_suppliers = await find_alternative_supplier_candidates(
        affected_nodes,
        event['location'],
        impact_radius_meters
    )

    # 6. Find alternative route candidates
    alternative_routes = await find_alternative_route_candidates(
        affected_connections,
        event['location'],
        impact_radius_meters
    )

    return {
        'event': event,
        'impact_radius_km': round(impact_radius_meters / 1000, 2),
        'affected_nodes': affected_nodes,
        'affected_connections': affected_connections,
        'alternative_supplier_candidates': alternative_suppliers,
        'alternative_route_candidates': alternative_routes,
        'summary_stats': {
            'total_affected_nodes': len(affected_nodes),
            'total_affected_connections': len(affected_connections),
            'alternative_suppliers_found': len(alternative_suppliers),
            'alternative_routes_found': len(alternative_routes)
        }
    }
