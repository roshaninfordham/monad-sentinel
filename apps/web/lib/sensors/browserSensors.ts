export type SensorPermissionState = "not_requested" | "requesting" | "granted" | "denied" | "fallback";

export type LocationPermissionResult =
  | { status: "granted"; watchId: number; position: GeolocationPosition }
  | { status: "denied"; reason: string };

export type MotionPermissionResult = { status: "granted" } | { status: "denied"; reason: string };
export type BrowserSensorHints = {
  secureContext: boolean;
  likelyInAppBrowser: boolean;
  userAgent: string;
  locationPermission?: PermissionState | "unsupported" | "unknown";
  guidance: string[];
};

const locationOptions: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 10000
};

function locationErrorReason(error: GeolocationPositionError) {
  if (error.code === error.PERMISSION_DENIED) {
    return "Location permission was denied by the browser or operating system. Open this page in Safari/Chrome, allow Location for this site, and enable Precise Location if available.";
  }
  if (error.code === error.POSITION_UNAVAILABLE) {
    return "Location is unavailable right now. Move near a window, disable low-power restrictions, or use indoor demo spatialization.";
  }
  if (error.code === error.TIMEOUT) {
    return "Location request timed out before a GPS/network fix arrived. Retry once, then use indoor demo spatialization if the room blocks GPS.";
  }
  return error.message || "Location request failed.";
}

function isLikelyInAppBrowser(userAgent: string) {
  return /FBAN|FBAV|Instagram|Line\/|LinkedInApp|Twitter|TikTok|Snapchat|WhatsApp|MicroMessenger/i.test(userAgent);
}

export async function readLocationPermissionState(): Promise<PermissionState | "unsupported" | "unknown"> {
  if (typeof navigator === "undefined" || !("permissions" in navigator)) return "unsupported";
  try {
    const status = await navigator.permissions.query({ name: "geolocation" as PermissionName });
    return status.state;
  } catch {
    return "unknown";
  }
}

export async function getSensorEnvironmentHints(): Promise<BrowserSensorHints> {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return { secureContext: false, likelyInAppBrowser: false, userAgent: "", locationPermission: "unknown", guidance: [] };
  }

  const userAgent = navigator.userAgent;
  const secureContext = window.isSecureContext;
  const likelyInAppBrowser = isLikelyInAppBrowser(userAgent);
  const locationPermission = await readLocationPermissionState();
  const guidance: string[] = [];

  if (!secureContext) {
    guidance.push("Location requires HTTPS. Use the Vercel demo URL, not an IP address or plain HTTP link.");
  }
  if (likelyInAppBrowser) {
    guidance.push("QR scanners and social-app browsers often block sensor prompts. Open this link in Safari or Chrome before enabling Location.");
  }
  if (locationPermission === "denied") {
    guidance.push("This browser reports Location as blocked. Reset the site permission, then tap Retry permissions.");
  }

  return { secureContext, likelyInAppBrowser, userAgent, locationPermission, guidance };
}

export async function requestLocationSensor(
  onPosition: (position: GeolocationPosition) => void,
  onWatchError?: (reason: string) => void
): Promise<LocationPermissionResult> {
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
    return { status: "denied", reason: "Geolocation is not available in this browser." };
  }
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return { status: "denied", reason: "Location requires a secure HTTPS browser context. Open the public Vercel URL in Safari or Chrome." };
  }

  return await new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onPosition(position);
        const watchId = navigator.geolocation.watchPosition(
          onPosition,
          (error) => onWatchError?.(locationErrorReason(error)),
          locationOptions
        );
        resolve({ status: "granted", watchId, position });
      },
      (error) => resolve({ status: "denied", reason: locationErrorReason(error) }),
      locationOptions
    );
  });
}

export async function requestMotionPermission(): Promise<MotionPermissionResult> {
  if (typeof window === "undefined" || typeof DeviceMotionEvent === "undefined") {
    return { status: "denied", reason: "Motion sensors are not available in this browser." };
  }

  const motionConstructor = DeviceMotionEvent as typeof DeviceMotionEvent & {
    requestPermission?: () => Promise<"granted" | "denied">;
  };

  if (typeof motionConstructor.requestPermission === "function") {
    try {
      const permission = await motionConstructor.requestPermission();
      if (permission !== "granted") {
        return { status: "denied", reason: "Motion permission was denied." };
      }
    } catch {
      return { status: "denied", reason: "Motion permission request failed." };
    }
  }

  return { status: "granted" };
}
