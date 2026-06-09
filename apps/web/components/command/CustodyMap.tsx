"use client";

import { useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import maplibregl, { GeoJSONSource, Map, Marker } from "maplibre-gl";
import { LiveDevice } from "@monad-sentinel/shared";
import { useSentinelStore } from "@/lib/store/sentinelStore";

const DEMO_ROUTE_COORDS: [number, number][] = [
  [-73.98624, 40.74805],
  [-73.98602, 40.74822],
  [-73.98578, 40.7484],
  [-73.98555, 40.74858],
  [-73.98528, 40.74874],
  [-73.98505, 40.74888]
];
const DEMO_DEVIATION_COORD: [number, number] = [-73.98518, 40.74812];
const DEMO_CHECKPOINT_COORD: [number, number] = [-73.98574, 40.74843];
const DEMO_DESTINATION_COORD = DEMO_ROUTE_COORDS[DEMO_ROUTE_COORDS.length - 1];

const style = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "OpenStreetMap"
    },
    plannedRoute: {
      type: "geojson",
      data: lineFeature(DEMO_ROUTE_COORDS)
    },
    actualRoute: {
      type: "geojson",
      data: lineFeature([DEMO_ROUTE_COORDS[0], DEMO_ROUTE_COORDS[0]])
    },
    destination: {
      type: "geojson",
      data: pointFeature(DEMO_DESTINATION_COORD)
    },
    checkpoint: {
      type: "geojson",
      data: pointFeature(DEMO_CHECKPOINT_COORD)
    },
    deviation: {
      type: "geojson",
      data: emptyFeatureCollection()
    }
  },
  layers: [
    {
      id: "osm",
      type: "raster",
      source: "osm",
      paint: { "raster-brightness-min": 0.05, "raster-brightness-max": 0.45, "raster-saturation": -0.85 }
    },
    {
      id: "route-corridor",
      type: "line",
      source: "plannedRoute",
      paint: { "line-color": "#25F384", "line-opacity": 0.16, "line-width": 20, "line-blur": 2 }
    },
    {
      id: "route-planned",
      type: "line",
      source: "plannedRoute",
      paint: { "line-color": "#25F384", "line-opacity": 0.72, "line-width": 3, "line-dasharray": [1.4, 1.2] }
    },
    {
      id: "route-actual",
      type: "line",
      source: "actualRoute",
      paint: { "line-color": "#4CC9F0", "line-opacity": 0.9, "line-width": 4 }
    },
    {
      id: "destination-halo",
      type: "circle",
      source: "destination",
      paint: { "circle-radius": 24, "circle-color": "#836EF9", "circle-opacity": 0.16, "circle-stroke-color": "#A98BFF", "circle-stroke-width": 2 }
    },
    {
      id: "checkpoint-dot",
      type: "circle",
      source: "checkpoint",
      paint: { "circle-radius": 10, "circle-color": "#25F384", "circle-opacity": 0.26, "circle-stroke-color": "#25F384", "circle-stroke-width": 2 }
    },
    {
      id: "deviation-dot",
      type: "circle",
      source: "deviation",
      paint: { "circle-radius": 18, "circle-color": "#FF3B5C", "circle-opacity": 0.28, "circle-stroke-color": "#FF3B5C", "circle-stroke-width": 3 }
    }
  ]
} as maplibregl.StyleSpecification;

function colorFor(device: LiveDevice) {
  if (!device.online) return "#716383";
  if (device.riskScore >= 70) return "#FF3B5C";
  if (device.riskScore >= 30) return "#FFB020";
  if (device.verification === "Verified") return "#25F384";
  return "#4CC9F0";
}

export function CustodyMap({ embedded = false }: { embedded?: boolean }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<Record<string, Marker>>({});
  const devices = useSentinelStore((state) => state.devices);
  const incidents = useSentinelStore((state) => state.incidents);
  const demoRoute = useSentinelStore((state) => state.demoRoute);
  const selectDevice = useSentinelStore((state) => state.selectDevice);
  const deviceList = useMemo(() => Object.values(devices), [devices]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapRef.current = new maplibregl.Map({
      container: containerRef.current,
      style,
      center: [-73.98566, 40.74844],
      zoom: 15,
      pitch: 62,
      bearing: -18,
      attributionControl: false
    });
    mapRef.current.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    return () => mapRef.current?.remove();
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const currentIds = new Set(deviceList.map((device) => device.id));
    for (const [id, marker] of Object.entries(markersRef.current)) {
      if (!currentIds.has(id)) {
        marker.remove();
        delete markersRef.current[id];
      }
    }
    deviceList.forEach((device) => {
      const element = document.createElement("div");
      const selected = demoRoute.selectedDeviceId === device.id;
      element.className = "relative grid size-8 place-items-center cursor-pointer";
      element.setAttribute("role", "button");
      element.setAttribute("aria-label", `Inspect ${device.alias}`);
      element.addEventListener("click", () => selectDevice(device.id));
      element.innerHTML = `<span style="position:absolute;width:${selected ? "36" : "28"}px;height:${selected ? "36" : "28"}px;border-radius:999px;border:${selected ? "1px solid #25F384" : "0"};background:${colorFor(
        device
      )};opacity:.18;animation:pulse-ring 1.6s ease-out infinite"></span><span style="width:13px;height:13px;border-radius:999px;background:${colorFor(
        device
      )};box-shadow:0 0 22px ${colorFor(device)}"></span>`;

      if (!markersRef.current[device.id]) {
        markersRef.current[device.id] = new maplibregl.Marker({ element, anchor: "center" })
          .setLngLat([device.lng, device.lat])
          .setPopup(new maplibregl.Popup({ offset: 18 }).setHTML(`<strong>${device.alias}</strong><br/>Risk ${device.riskScore}`))
          .addTo(map);
      } else {
        const marker = markersRef.current[device.id];
        marker.setLngLat([device.lng, device.lat]);
        marker.getElement().replaceWith(element);
        markersRef.current[device.id] = new maplibregl.Marker({ element, anchor: "center" }).setLngLat([device.lng, device.lat]).addTo(map);
        marker.remove();
      }
    });

    if (deviceList.length > 1) {
      const bounds = new maplibregl.LngLatBounds();
      deviceList.forEach((device) => bounds.extend([device.lng, device.lat]));
      map.fitBounds(bounds, { padding: 110, maxZoom: 16.5, duration: 900 });
    }
  }, [demoRoute.selectedDeviceId, deviceList, selectDevice]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const updateRoute = () => {
      const selected = demoRoute.selectedDeviceId ? devices[demoRoute.selectedDeviceId] : undefined;
      const trailCoords = selected?.trail?.map((point) => [point.lng, point.lat] as [number, number]) ?? [];
      const actualCoords = trailCoords.length > 1 ? trailCoords : progressCoords(demoRoute.progress, demoRoute.stage);
      const actualSource = map.getSource("actualRoute") as GeoJSONSource | undefined;
      const deviationSource = map.getSource("deviation") as GeoJSONSource | undefined;
      actualSource?.setData(lineFeature(actualCoords.length > 1 ? actualCoords : [DEMO_ROUTE_COORDS[0], DEMO_ROUTE_COORDS[0]]));
      deviationSource?.setData(demoRoute.stage === "deviation" ? pointFeature(DEMO_DEVIATION_COORD) : emptyFeatureCollection());
    };

    if (map.isStyleLoaded()) {
      updateRoute();
      return;
    }
    map.once("load", updateRoute);
  }, [demoRoute.progress, demoRoute.selectedDeviceId, demoRoute.stage, devices]);

  useEffect(() => {
    const latest = incidents[0];
    const map = mapRef.current;
    if (!latest || !map) return;
    const device = devices[latest.deviceId];
    if (!device) return;
    map.flyTo({ center: [device.lng, device.lat], zoom: 17, pitch: 68, speed: 0.9 });
  }, [incidents, devices]);

  const latestAlertDevice = incidents[0] ? devices[incidents[0].deviceId] : undefined;

  const content = (
    <>
      <div ref={containerRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent,rgba(5,2,10,.36)_65%,rgba(5,2,10,.9))]" />
      {latestAlertDevice && (
        <motion.div
          key={`${latestAlertDevice.id}-${incidents[0]?.createdAt}`}
          className="pointer-events-none absolute left-1/2 top-1/2 size-16 rounded-full border-2 border-[var(--tamper-red)]"
          style={{ animation: "tamper-ripple 1.2s ease-out forwards" }}
        />
      )}
      <div className="absolute left-4 top-4 rounded-md border border-[rgba(37,243,132,.24)] bg-black/45 px-3 py-2 text-xs text-[var(--verified-green)] backdrop-blur">
        Geo Map Mode · route corridor + destination geofence
      </div>
      <div className="absolute bottom-4 left-4 grid gap-1 rounded-md border border-white/10 bg-black/45 px-3 py-2 text-[10px] text-[var(--text-secondary)] backdrop-blur">
        <span className="text-[var(--verified-green)]">Approved route corridor</span>
        <span className={demoRoute.stage === "deviation" ? "text-[var(--tamper-red)]" : "text-[var(--chain-blue)]"}>
          {demoRoute.stage === "deviation" ? "Deviation threshold breached" : "Actual trace follows approved path"}
        </span>
      </div>
    </>
  );

  if (embedded) {
    return <div className="absolute inset-0">{content}</div>;
  }

  return (
    <div className="panel relative min-h-0 overflow-hidden rounded-lg">
      {content}
    </div>
  );
}

function lineFeature(coords: [number, number][]) {
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: coords
    }
  } as const;
}

function pointFeature(coord: [number, number]) {
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Point",
      coordinates: coord
    }
  } as const;
}

function emptyFeatureCollection() {
  return {
    type: "FeatureCollection",
    features: []
  } as const;
}

function progressCoords(progress: number, stage: string): [number, number][] {
  if (stage === "deviation") return [...DEMO_ROUTE_COORDS.slice(0, 4), DEMO_DEVIATION_COORD];
  const count = Math.max(2, Math.ceil(Math.min(Math.max(progress, 0.12), 1) * DEMO_ROUTE_COORDS.length));
  return DEMO_ROUTE_COORDS.slice(0, count);
}
