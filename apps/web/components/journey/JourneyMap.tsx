"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { type GeoJSONSource, type Map, type Marker, type StyleSpecification } from "maplibre-gl";
import { AlertTriangle, MapPinned, Navigation, PackageCheck } from "lucide-react";

export type LngLat = [number, number];

export type JourneyStop = {
  id: string;
  label: string;
  coordinates: LngLat;
  dwellMinutes: number;
  authorized: boolean;
};

export type JourneyIncident = {
  id: string;
  label: string;
  kind: "shock" | "temperature";
  coordinates: LngLat;
  severity: "watch" | "critical";
};

export type JourneyBatchAnchor = {
  id: string;
  label: string;
  sequence: number;
  coordinates: LngLat;
  status: string;
};

export type JourneyMapData = {
  plannedRoute: LngLat[];
  actualRoute: LngLat[];
  deviationRoute: LngLat[];
  destinationGeofence: LngLat[];
  stops: JourneyStop[];
  incidents: JourneyIncident[];
  batchAnchors: JourneyBatchAnchor[];
  currentPosition: LngLat;
};

type JourneyMapProps = {
  data: JourneyMapData;
};

const osmRasterStyle = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution:
        '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a>'
    }
  },
  layers: [
    {
      id: "osm-raster",
      type: "raster",
      source: "osm",
      paint: {
        "raster-opacity": 0.82,
        "raster-saturation": -0.65,
        "raster-contrast": 0.18,
        "raster-brightness-min": 0.08,
        "raster-brightness-max": 0.72
      }
    }
  ]
} as StyleSpecification;

function lineString(coordinates: LngLat[]) {
  if (coordinates.length < 2) {
    return {
      type: "FeatureCollection",
      features: []
    };
  }

  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates
    }
  };
}

function pointCollection<T extends { id: string; coordinates: LngLat }>(items: T[]) {
  return {
    type: "FeatureCollection",
    features: items.map((item) => ({
      type: "Feature",
      properties: { ...item, coordinates: undefined },
      geometry: {
        type: "Point",
        coordinates: item.coordinates
      }
    }))
  };
}

function polygon(coordinates: LngLat[]) {
  const closed = coordinates.length && coordinates[0]?.join(",") !== coordinates.at(-1)?.join(",") ? [...coordinates, coordinates[0]] : coordinates;
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [closed]
    }
  };
}

function source(map: Map, id: string) {
  return map.getSource(id) as GeoJSONSource | undefined;
}

function allCoordinates(data: JourneyMapData) {
  return [
    ...data.plannedRoute,
    ...data.actualRoute,
    ...data.deviationRoute,
    ...data.destinationGeofence,
    ...data.stops.map((stop) => stop.coordinates),
    ...data.incidents.map((incident) => incident.coordinates),
    ...data.batchAnchors.map((batch) => batch.coordinates),
    data.currentPosition
  ].filter((coord): coord is LngLat => Number.isFinite(coord[0]) && Number.isFinite(coord[1]));
}

function addJourneyLayers(map: Map, data: JourneyMapData) {
  map.addSource("destination-geofence", { type: "geojson", data: polygon(data.destinationGeofence) });
  map.addSource("planned-route", { type: "geojson", data: lineString(data.plannedRoute) });
  map.addSource("actual-route", { type: "geojson", data: lineString(data.actualRoute) });
  map.addSource("deviation-route", { type: "geojson", data: lineString(data.deviationRoute) });
  map.addSource("stops", { type: "geojson", data: pointCollection(data.stops) });
  map.addSource("incidents", { type: "geojson", data: pointCollection(data.incidents) });
  map.addSource("batch-anchors", { type: "geojson", data: pointCollection(data.batchAnchors) });
  map.addSource("current-position", { type: "geojson", data: pointCollection([{ id: "current", coordinates: data.currentPosition }]) });

  map.addLayer({
    id: "destination-geofence-fill",
    type: "fill",
    source: "destination-geofence",
    paint: { "fill-color": "#836EF9", "fill-opacity": 0.16 }
  });
  map.addLayer({
    id: "destination-geofence-line",
    type: "line",
    source: "destination-geofence",
    paint: { "line-color": "#A98BFF", "line-width": 2.5, "line-dasharray": [2, 1.5] }
  });
  map.addLayer({
    id: "planned-route-line",
    type: "line",
    source: "planned-route",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": "#836EF9", "line-width": 7, "line-opacity": 0.72, "line-dasharray": [1.5, 1.5] }
  });
  map.addLayer({
    id: "actual-route-line",
    type: "line",
    source: "actual-route",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": "#25F384", "line-width": 4, "line-opacity": 0.95 }
  });
  map.addLayer({
    id: "deviation-route-line",
    type: "line",
    source: "deviation-route",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": "#FF3B5C", "line-width": 5.5, "line-opacity": 0.95 }
  });
  map.addLayer({
    id: "stop-dwell-circles",
    type: "circle",
    source: "stops",
    paint: {
      "circle-color": ["case", ["boolean", ["get", "authorized"], true], "#4CC9F0", "#FF3B5C"],
      "circle-opacity": 0.24,
      "circle-radius": ["interpolate", ["linear"], ["get", "dwellMinutes"], 0, 14, 30, 34, 90, 48],
      "circle-stroke-color": ["case", ["boolean", ["get", "authorized"], true], "#4CC9F0", "#FF3B5C"],
      "circle-stroke-width": 2
    }
  });
  map.addLayer({
    id: "batch-anchor-circles",
    type: "circle",
    source: "batch-anchors",
    paint: {
      "circle-color": "#836EF9",
      "circle-radius": 7,
      "circle-opacity": 0.86,
      "circle-stroke-color": "#F4EEFF",
      "circle-stroke-width": 1.5
    }
  });
  map.addLayer({
    id: "incident-circles",
    type: "circle",
    source: "incidents",
    paint: {
      "circle-color": ["case", ["==", ["get", "kind"], "temperature"], "#FF3B5C", "#FFB020"],
      "circle-radius": ["case", ["==", ["get", "severity"], "critical"], 11, 8],
      "circle-opacity": 0.94,
      "circle-stroke-color": "#05020A",
      "circle-stroke-width": 2
    }
  });
  map.addLayer({
    id: "current-position-halo",
    type: "circle",
    source: "current-position",
    paint: { "circle-color": "#25F384", "circle-radius": 20, "circle-opacity": 0.18 }
  });
  map.addLayer({
    id: "current-position-core",
    type: "circle",
    source: "current-position",
    paint: {
      "circle-color": "#25F384",
      "circle-radius": 7,
      "circle-opacity": 1,
      "circle-stroke-color": "#05020A",
      "circle-stroke-width": 2
    }
  });
}

function updateJourneySources(map: Map, data: JourneyMapData) {
  source(map, "destination-geofence")?.setData(polygon(data.destinationGeofence) as never);
  source(map, "planned-route")?.setData(lineString(data.plannedRoute) as never);
  source(map, "actual-route")?.setData(lineString(data.actualRoute) as never);
  source(map, "deviation-route")?.setData(lineString(data.deviationRoute) as never);
  source(map, "stops")?.setData(pointCollection(data.stops) as never);
  source(map, "incidents")?.setData(pointCollection(data.incidents) as never);
  source(map, "batch-anchors")?.setData(pointCollection(data.batchAnchors) as never);
  source(map, "current-position")?.setData(pointCollection([{ id: "current", coordinates: data.currentPosition }]) as never);
}

function fitJourney(map: Map, data: JourneyMapData) {
  const coordinates = allCoordinates(data);
  if (!coordinates.length) return;
  const bounds = new maplibregl.LngLatBounds(coordinates[0], coordinates[0]);
  coordinates.forEach((coord) => bounds.extend(coord));
  map.fitBounds(bounds, { padding: 74, maxZoom: 14, duration: 900 });
}

function createCurrentMarker() {
  const element = document.createElement("div");
  element.className = "journey-current-marker";
  element.setAttribute("aria-label", "Current shipment position");
  return element;
}

function hasWebGlSupport() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl") ?? canvas.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}

function FallbackJourneyMap({ data, reason }: { data: JourneyMapData; reason: string }) {
  return (
    <div className="journey-map-fallback">
      <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(131,110,249,.14)_1px,transparent_1px),linear-gradient(90deg,rgba(131,110,249,.14)_1px,transparent_1px)] [background-size:42px_42px]" />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 500" preserveAspectRatio="none" aria-hidden="true">
        <path d="M90 350 C 250 245, 370 395, 500 270 S 760 120, 910 140" fill="none" stroke="rgba(131,110,249,.4)" strokeWidth="28" strokeLinecap="round" />
        <path d="M90 350 C 250 245, 370 395, 500 270 S 760 120, 910 140" fill="none" stroke="#25F384" strokeWidth="5" strokeLinecap="round" />
        <path d="M510 268 C 560 345, 650 355, 710 300" fill="none" stroke="#FF3B5C" strokeWidth="7" strokeLinecap="round" />
      </svg>
      <div className="relative z-10 flex h-full flex-col justify-between p-5">
        <div className="max-w-md rounded-lg border border-[rgba(255,59,92,.26)] bg-black/55 p-4 backdrop-blur">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--warning-amber)]">
            <AlertTriangle size={17} /> Map degraded gracefully
          </div>
          <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">{reason}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-md border border-white/10 bg-black/45 p-3 backdrop-blur">
            <div className="text-[0.65rem] uppercase tracking-[0.16em] text-[var(--text-secondary)]">Route points</div>
            <div className="mt-1 text-sm">{data.actualRoute.length} actual coordinates</div>
          </div>
          <div className="rounded-md border border-white/10 bg-black/45 p-3 backdrop-blur">
            <div className="text-[0.65rem] uppercase tracking-[0.16em] text-[var(--text-secondary)]">Stops</div>
            <div className="mt-1 text-sm">{data.stops.length} dwell markers</div>
          </div>
          <div className="rounded-md border border-white/10 bg-black/45 p-3 backdrop-blur">
            <div className="text-[0.65rem] uppercase tracking-[0.16em] text-[var(--text-secondary)]">Evidence anchors</div>
            <div className="mt-1 text-sm">{data.batchAnchors.length} batch markers</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function JourneyMap({ data }: JourneyMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const currentMarkerRef = useRef<Marker | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const mapData = useMemo(() => data, [data]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || mapError) return;
    if (!hasWebGlSupport()) {
      setMapError("This browser does not expose enough WebGL support for MapLibre. The route summary is still available below.");
      return;
    }

    let map: Map | null = null;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: osmRasterStyle,
        center: mapData.currentPosition,
        zoom: 12,
        pitch: 47,
        bearing: -12,
        attributionControl: { compact: true }
      });
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
      map.on("load", () => {
        if (!map) return;
        addJourneyLayers(map, mapData);
        currentMarkerRef.current = new maplibregl.Marker({ element: createCurrentMarker(), anchor: "center" }).setLngLat(mapData.currentPosition).addTo(map);
        fitJourney(map, mapData);
      });
      map.on("error", (event) => {
        const message = event.error?.message ?? "";
        if (message.toLowerCase().includes("webgl") || message.toLowerCase().includes("style")) {
          setMapError(`MapLibre could not initialize the map style: ${message}`);
        }
      });
    } catch (error) {
      setMapError(error instanceof Error ? error.message : "MapLibre could not load in this browser.");
    }

    return () => {
      currentMarkerRef.current?.remove();
      currentMarkerRef.current = null;
      map?.remove();
      mapRef.current = null;
    };
  }, [mapData, mapError]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.loaded()) return;
    updateJourneySources(map, mapData);
    currentMarkerRef.current?.setLngLat(mapData.currentPosition);
    fitJourney(map, mapData);
  }, [mapData]);

  if (mapError) {
    return <FallbackJourneyMap data={data} reason={mapError} />;
  }

  return (
    <div className="journey-map-shell">
      <div ref={containerRef} className="journey-map-container" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_46%,transparent,rgba(5,2,10,.2)_62%,rgba(5,2,10,.72))]" />
      <div className="journey-map-badge left-4 top-4">
        <Navigation size={15} />
        OSM MapLibre Journey View
      </div>
      <div className="journey-map-badge right-4 top-4">
        <PackageCheck size={15} />
        Current position
      </div>
      <div className="journey-map-legend">
        <span><i className="bg-[var(--monad-purple)]" /> Planned route</span>
        <span><i className="bg-[var(--verified-green)]" /> Actual route</span>
        <span><i className="bg-[var(--tamper-red)]" /> Deviation</span>
        <span><i className="bg-[var(--warning-amber)]" /> Shock/temp incident</span>
        <span><i className="bg-[var(--chain-blue)]" /> Stop/dwell</span>
      </div>
      <div className="journey-map-attribution">
        <MapPinned size={13} />
        OSM raster fallback with customer-authorized overlays
      </div>
    </div>
  );
}
