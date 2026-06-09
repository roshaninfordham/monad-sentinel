"use client";

import { useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import maplibregl, { Map, Marker } from "maplibre-gl";
import { LiveDevice } from "@monad-sentinel/shared";
import { useSentinelStore } from "@/lib/store/sentinelStore";

const style = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "OpenStreetMap"
    }
  },
  layers: [
    {
      id: "osm",
      type: "raster",
      source: "osm",
      paint: { "raster-brightness-min": 0.05, "raster-brightness-max": 0.45, "raster-saturation": -0.85 }
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

export function CustodyMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<Record<string, Marker>>({});
  const devices = useSentinelStore((state) => state.devices);
  const incidents = useSentinelStore((state) => state.incidents);
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
      element.className = "relative grid size-8 place-items-center";
      element.innerHTML = `<span style="position:absolute;width:28px;height:28px;border-radius:999px;background:${colorFor(
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
  }, [deviceList]);

  useEffect(() => {
    const latest = incidents[0];
    const map = mapRef.current;
    if (!latest || !map) return;
    const device = devices[latest.deviceId];
    if (!device) return;
    map.flyTo({ center: [device.lng, device.lat], zoom: 17, pitch: 68, speed: 0.9 });
  }, [incidents, devices]);

  const latestAlertDevice = incidents[0] ? devices[incidents[0].deviceId] : undefined;

  return (
    <div className="panel relative min-h-0 overflow-hidden rounded-lg">
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
        3D custody map · indoor demo spatialization
      </div>
    </div>
  );
}
