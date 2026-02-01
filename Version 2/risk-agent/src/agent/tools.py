"""LangChain tools for the risk analysis agent."""
from langchain.tools import tool
from typing import Dict, Any, List
from src.db.supabase import supabase
from src.utils.geo import haversine_distance, calculate_impact_radius, GeoPoint

@tool
def get_event_details(event_id: str) -> Dict[str, Any]:
    """
    Fetch complete details about a geopolitical event, natural disaster, or policy change.

    Args:
        event_id: UUID of the event

    Returns:
        Event details including type, severity, location, polygon, dates, description
    """
    try:
        result = supabase.table('events').select('*').eq('id', event_id).single().execute()

        if not result.data:
            return {"error": f"Event {event_id} not found"}

        event = result.data
        return {
            "id": event["id"],
            "type": event["type"],
            "title": event["title"],
            "description": event["description"],
            "severity": event["severity"],
            "location": event["location"],
            "polygon": event.get("polygon"),
            "start_date": event["start_date"],
            "end_date": event.get("end_date"),
            "source": event["source"]
        }
    except Exception as e:
        return {"error": str(e)}

@tool
def calculate_impact_radius_tool(event_type: str, severity: int) -> int:
    """
    Calculate the geographic impact radius (in meters) based on event type and severity.

    Args:
        event_type: Type of event (natural_disaster, weather, war, etc.)
        severity: Severity score 1-10

    Returns:
        Impact radius in meters
    """
    return calculate_impact_radius(event_type, severity)

@tool
def query_affected_nodes(event_location: GeoPoint, impact_radius_meters: int) -> List[Dict[str, Any]]:
    """
    Find all supplier nodes (companies, ports, factories) within the impact radius of an event.
    Database stores location as JSONB {lat, lng}, so we fetch all and filter in Python.

    Args:
        event_location: GeoPoint with lat and lng
        impact_radius_meters: Radius in meters

    Returns:
        List of affected nodes with details
    """
    try:
        # Fetch all companies - location is stored as JSONB
        all_nodes = supabase.table('companies').select('*').execute()

        affected = []
        for node in all_nodes.data or []:
            if 'location' in node and node['location']:
                # node['location'] is {lat: number, lng: number}
                distance_km = haversine_distance(event_location, node['location'])
                if distance_km * 1000 <= impact_radius_meters:
                    affected.append({
                        **node,
                        'distance_km': distance_km
                    })

        return affected
    except Exception as e:
        return []

@tool
def query_affected_connections(affected_node_ids: List[str]) -> List[Dict[str, Any]]:
    """
    Find all supply chain connections (shipping routes) affected by an event.
    A connection is affected if either endpoint (from/to node) is in the affected area.

    Args:
        affected_node_ids: List of node IDs already determined to be affected

    Returns:
        List of affected connections with endpoints and details
    """
    if not affected_node_ids:
        return []

    try:
        # Query connections where either endpoint is affected
        result = supabase.table('connections').select('''
            id, from_node_id, to_node_id, transport_mode, status, materials,
            from_node:companies!from_node_id(name, location, city, country),
            to_node:companies!to_node_id(name, location, city, country)
        ''').or_(f"from_node_id.in.({','.join(affected_node_ids)}),to_node_id.in.({','.join(affected_node_ids)})").execute()

        return result.data if result.data else []
    except Exception as e:
        return []

@tool
def find_alternative_suppliers(material_category: str, excluded_region_center: GeoPoint, exclusion_radius_meters: int) -> List[Dict[str, Any]]:
    """
    Find alternative suppliers that provide the same material but are located outside the affected region.

    Args:
        material_category: Material/component category needed (e.g., "Silicon Wafers", "DRAM Chips")
        excluded_region_center: GeoPoint center of area to avoid
        exclusion_radius_meters: Radius to exclude (impact radius + safety buffer)

    Returns:
        List of alternative suppliers ranked by suitability
    """
    try:
        # Get all suppliers with their company info
        # Note: Supabase foreign key syntax: company:companies!company_id(fields)
        all_suppliers = supabase.table('suppliers').select(
            'id, company_id, name, tier, materials'
        ).execute()

        # Get all companies to match supplier locations
        all_companies = supabase.table('companies').select('*').execute()
        company_map = {c['id']: c for c in (all_companies.data or [])}

        alternatives = []

        for supplier in all_suppliers.data or []:
            # Check if supplier provides the material
            if material_category not in (supplier.get('materials') or []):
                continue

            # Get company info
            company = company_map.get(supplier['company_id'])
            if not company or not company.get('location'):
                continue

            supplier_location = company['location']  # GeoPoint {lat, lng}

            distance_km = haversine_distance(excluded_region_center, supplier_location)
            distance_m = distance_km * 1000

            if distance_m > exclusion_radius_meters:
                alternatives.append({
                    "id": supplier['id'],
                    "company_id": supplier['company_id'],
                    "name": company['name'],
                    "location": supplier_location,
                    "city": company.get('city'),
                    "country": company.get('country'),
                    "tier": supplier.get('tier'),
                    "materials": supplier.get('materials'),
                    "distance_km": distance_km
                })

        # Sort by tier (lower is better) then distance
        alternatives.sort(key=lambda x: (x.get('tier', 999), x['distance_km']))

        return alternatives[:10]  # Return top 10
    except Exception as e:
        return []

@tool
def find_alternative_routes(from_node_id: str, to_node_id: str, excluded_region_center: GeoPoint, exclusion_radius_meters: int) -> List[Dict[str, Any]]:
    """
    Find alternative shipping routes from same supplier to destination that avoid the affected area.
    Searches for intermediate hubs/ports that can reroute the connection.

    Args:
        from_node_id: Origin supplier/node ID
        to_node_id: Destination node ID
        excluded_region_center: GeoPoint center of area to avoid
        exclusion_radius_meters: Radius to exclude

    Returns:
        List of alternative routes with intermediate hubs
    """
    try:
        # Find ports/hubs - filter by type in Python (Supabase may not support .in_() syntax cleanly)
        all_companies = supabase.table('companies').select('*').execute()

        safe_hubs = []

        for company in all_companies.data or []:
            # Only consider logistics hubs
            if company.get('type') not in ['port', 'airport', 'distribution']:
                continue

            hub_location = company.get('location')
            if not hub_location:
                continue

            distance_km = haversine_distance(excluded_region_center, hub_location)
            distance_m = distance_km * 1000

            if distance_m > exclusion_radius_meters:
                safe_hubs.append({
                    "id": company['id'],
                    "name": company['name'],
                    "type": company['type'],
                    "location": hub_location,
                    "city": company.get('city'),
                    "country": company.get('country'),
                    "distance_from_event_km": distance_km
                })

        # Sort by distance from event (further is safer)
        safe_hubs.sort(key=lambda x: x['distance_from_event_km'], reverse=True)

        return safe_hubs[:5]  # Return top 5 safest hubs
    except Exception as e:
        return []

@tool
def get_connection_details(connection_id: str) -> Dict[str, Any]:
    """
    Get complete details about a supply chain connection including endpoints, materials, and current status.

    Args:
        connection_id: UUID of the connection

    Returns:
        Connection details with from/to nodes, transport mode, materials
    """
    try:
        result = supabase.table('connections').select('''
            id, transport_mode, status, materials,
            from_node:companies!from_node_id(id, name, type, location, city, country),
            to_node:companies!to_node_id(id, name, type, location, city, country)
        ''').eq('id', connection_id).single().execute()

        return result.data if result.data else {"error": "Connection not found"}
    except Exception as e:
        return {"error": str(e)}

@tool
def get_supplier_materials(supplier_id: str) -> List[str]:
    """
    Get list of materials/components that a specific supplier provides.

    Args:
        supplier_id: UUID of the supplier company

    Returns:
        List of material categories
    """
    try:
        result = supabase.table('suppliers').select('materials').eq('company_id', supplier_id).execute()

        if result.data and len(result.data) > 0:
            return result.data[0].get('materials', [])
        return []
    except Exception as e:
        return []

@tool
def calculate_distance_tool(point1: GeoPoint, point2: GeoPoint) -> float:
    """
    Calculate geographic distance in kilometers between two points using Haversine formula.

    Args:
        point1: GeoPoint with lat and lng
        point2: GeoPoint with lat and lng

    Returns:
        Distance in kilometers
    """
    return haversine_distance(point1, point2)
