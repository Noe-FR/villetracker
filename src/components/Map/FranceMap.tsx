import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, ZoomControl, useMap } from "react-leaflet";
import L from "leaflet";
import { api } from "../../api/client";
import "leaflet/dist/leaflet.css";

// Static GeoJSON — departements simplified, public domain
const DEPT_GEOJSON_URL =
  "https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements-version-simplifiee.geojson";

interface Props {
  selectedCode: string | null;
  onSelectCommune: (code: string) => void;
}

const FRANCE_BOUNDS = L.latLngBounds([41.2, -5.5], [51.3, 9.8]);
const COMMUNE_ZOOM = 9;
const canvasRenderer = L.canvas({ padding: 0.5, tolerance: 3 });

export function communeStyle(code: string, sel: string | null): L.PathOptions {
  const s = code === sel;
  return {
    fillColor: s ? "#1d4ed8" : "#93c5fd",
    fillOpacity: s ? 0.65 : 0.30,
    color: s ? "#1d4ed8" : "#3b82f6",
    weight: s ? 2.5 : 1.2,
  };
}

function deptStyle(): L.PathOptions {
  return { fillColor: "#3b82f6", fillOpacity: 0.07, color: "#3b82f6", weight: 1.5 };
}

function MapLayers({ selectedCode, onSelectCommune }: Props) {
  const map = useMap();

  const onSelectRef     = useRef(onSelectCommune);
  const selectedRef     = useRef(selectedCode);
  const deptLayerRef    = useRef<L.GeoJSON | null>(null);
  const communeLayerRef = useRef<L.GeoJSON | null>(null);
  const activeDeptRef   = useRef<string | null>(null);
  const loadCommunesRef = useRef<(code: string) => void>(() => {});

  useEffect(() => { onSelectRef.current = onSelectCommune; }, [onSelectCommune]);

  useEffect(() => {
    selectedRef.current = selectedCode;
    communeLayerRef.current?.setStyle(
      (f) => communeStyle(f?.properties?.code_insee ?? "", selectedCode)
    );
  }, [selectedCode]);

  useEffect(() => {
    loadCommunesRef.current = (deptCode: string) => {
      if (activeDeptRef.current === deptCode) return;

      if (communeLayerRef.current) {
        if (map.hasLayer(communeLayerRef.current)) map.removeLayer(communeLayerRef.current);
        communeLayerRef.current = null;
      }
      activeDeptRef.current = deptCode;

      api.getCommunesByDept(deptCode).then((data) => {
        if (activeDeptRef.current !== deptCode) return;

        const layer = L.geoJSON(data as GeoJSON.GeoJsonObject, {
          // @ts-ignore
          renderer: canvasRenderer,
          style: (f) => communeStyle(f?.properties?.code_insee ?? "", selectedRef.current),
          onEachFeature(feature, fl) {
            const code: string = feature.properties?.code_insee ?? "";
            const nom: string  = feature.properties?.nom ?? "";
            const pop: number | undefined = feature.properties?.population;

            (fl as L.Path).on({
              mouseover(e) {
                if (code !== selectedRef.current)
                  (e.target as L.Path).setStyle({ fillOpacity: 0.45, fillColor: "#2563eb", weight: 1.5 });
              },
              mouseout(e) {
                (e.target as L.Path).setStyle(communeStyle(code, selectedRef.current));
              },
              click() { onSelectRef.current(code); },
            });

            fl.bindTooltip(
              `<b>${nom}</b>${pop ? `<br/><span style="color:#64748b;font-size:11px">${new Intl.NumberFormat("fr-FR").format(pop)} hab.</span>` : ""}`,
              { sticky: true, className: "map-tooltip", direction: "auto" }
            );
          },
        });

        communeLayerRef.current = layer;
        if (map.getZoom() >= COMMUNE_ZOOM) layer.addTo(map);
      }).catch(() => {
        if (activeDeptRef.current === deptCode) activeDeptRef.current = null;
      });
    };
  }, [map]);

  useEffect(() => {
    const handleMove = () => {
      const z = map.getZoom();
      if (z < COMMUNE_ZOOM) {
        if (communeLayerRef.current) {
          if (map.hasLayer(communeLayerRef.current)) map.removeLayer(communeLayerRef.current);
          communeLayerRef.current = null;
          activeDeptRef.current = null;
        }
      } else {
        if (communeLayerRef.current && !map.hasLayer(communeLayerRef.current))
          communeLayerRef.current.addTo(map);
      }
    };
    map.on("zoomend", handleMove);
    return () => { map.off("zoomend", handleMove); };
  }, [map]);

  // Departments layer from static CDN
  useEffect(() => {
    let cancelled = false;

    fetch(DEPT_GEOJSON_URL)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;

        const layer = L.geoJSON(data as GeoJSON.GeoJsonObject, {
          // @ts-ignore
          renderer: canvasRenderer,
          style: deptStyle,
          onEachFeature(feature, fl) {
            const code: string = feature.properties?.code ?? "";
            const nom: string  = feature.properties?.nom ?? "";

            (fl as L.Path).on({
              mouseover(e) {
                if (map.getZoom() < COMMUNE_ZOOM) {
                  (e.target as L.Path).setStyle({ fillOpacity: 0.25, weight: 2.5, color: "#1d4ed8" });
                  (e.target as L.Path).bringToFront();
                }
              },
              mouseout(e) {
                if (map.getZoom() < COMMUNE_ZOOM) layer.resetStyle(e.target as L.Layer);
              },
              click(e) {
                loadCommunesRef.current(code);
                try {
                  map.fitBounds((e.target as L.Polygon).getBounds(), { padding: [40, 40], maxZoom: 11 });
                } catch { /* empty */ }
              },
            });

            fl.bindTooltip(
              `<b>${nom}</b> <span style="color:#64748b;font-size:11px">(${code})</span>`,
              { sticky: true, className: "map-tooltip", direction: "auto" }
            );
          },
        });

        layer.addTo(map);
        deptLayerRef.current = layer;
      })
      .catch(console.error);

    return () => {
      cancelled = true;
      if (deptLayerRef.current) map.removeLayer(deptLayerRef.current);
      if (communeLayerRef.current) {
        if (map.hasLayer(communeLayerRef.current)) map.removeLayer(communeLayerRef.current);
        communeLayerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  // Zoom to selected commune (e.g. from search)
  useEffect(() => {
    if (!selectedCode) return;

    api.getCommuneGeo(selectedCode).then((geo) => {
      if (geo.geometry) {
        const bounds = L.geoJSON({ type: "Feature", geometry: geo.geometry as GeoJSON.Geometry, properties: {} }).getBounds();
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [60, 60] });
      }
      if (geo.departement_code) loadCommunesRef.current(geo.departement_code);
    }).catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCode]);

  return null;
}

export function FranceMap({ selectedCode, onSelectCommune }: Props) {
  return (
    <MapContainer
      center={[46.5, 2.3]}
      zoom={6}
      minZoom={5}
      maxZoom={16}
      maxBounds={FRANCE_BOUNDS}
      maxBoundsViscosity={1.0}
      zoomControl={false}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={19}
      />
      <ZoomControl position="bottomright" />
      <MapLayers selectedCode={selectedCode} onSelectCommune={onSelectCommune} />
    </MapContainer>
  );
}
