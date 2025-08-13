import React from 'react';
import Mapbox from '@rnmapbox/maps';

type MapLayersProps = {
  selectedId: string;
  makeSelectedIconSize: (base: number) => any;
  datasets: { fountainsDecorative: boolean; toiletsPublic: boolean };
  useDecorWms: boolean;
  featureCollection: any;
  sourceRef: React.RefObject<Mapbox.ShapeSource>;
  onPress: (e: any) => void;
};

export function MapLayers({
  selectedId,
  makeSelectedIconSize,
  datasets,
  useDecorWms,
  featureCollection,
  sourceRef,
  onPress,
}: MapLayersProps) {
  return (
    <>
      <Mapbox.Images
        images={{
          fountainDrink: require('../../../../assets/water-drop.png'),
          fountainDecor: require('../../../../assets/decor.png'),
          toilet: require('../../../../assets/toilet.png'),
        }}
      />

      {datasets.fountainsDecorative && useDecorWms ? (
        <Mapbox.RasterSource
          id="decorWms"
          tileUrlTemplates={[
            'https://gdi.berlin.de/services/wms/zierbrunnen?service=WMS&version=1.3.0&request=GetMap&format=image/png&transparent=true&layers=zierbrunnen&styles=&crs=EPSG:3857&bbox={bbox-epsg-3857}&width=256&height=256',
          ]}
          tileSize={256}
        >
          <Mapbox.RasterLayer id="decorWmsLayer" style={{ rasterOpacity: 0.8 }} />
        </Mapbox.RasterSource>
      ) : null}

      <Mapbox.ShapeSource
        id="fountains"
        ref={sourceRef}
        shape={featureCollection as any}
        cluster
        clusterRadius={44}
        clusterMaxZoomLevel={13}
        hitbox={{ width: 30, height: 30 } as any}
        onPress={onPress}
      >
        <Mapbox.CircleLayer
          key="selectedHalo"
          id="selectedHalo"
          filter={["==", ["get", "id"], selectedId] as any}
          style={{
            circleRadius: 12,
            circleColor: '#ffffff',
            circleOpacity: 0.8,
            circleStrokeColor: '#1d8bf1',
            circleStrokeWidth: 2,
          }}
        />

        <Mapbox.CircleLayer
          key="clusteredPoints"
          id="clusteredPoints"
          filter={["has", "point_count"] as any}
          style={{
            circleColor: '#1d8bf1',
            circleOpacity: 0.85,
            circleRadius: [
              'step',
              ['get', 'point_count'],
              16,
              20,
              20,
              50,
              26,
            ] as any,
          }}
        />

        <Mapbox.SymbolLayer
          key="clusterCount"
          id="clusterCount"
          filter={["has", "point_count"] as any}
          style={{ textField: ['get', 'point_count'] as any, textSize: 12, textColor: '#ffffff' }}
        />

        <Mapbox.SymbolLayer
          key="fountainSymbolsDrinking"
          id="fountainSymbolsDrinking"
          filter={["==", ["get", "type"], "drinking"] as any}
          style={{
            iconImage: 'fountainDrink',
            iconSize: makeSelectedIconSize(0.2),
            iconAllowOverlap: true,
            iconIgnorePlacement: true,
            iconAnchor: 'bottom',
          }}
        />

        {datasets.fountainsDecorative ? (
          <Mapbox.SymbolLayer
            key="fountainSymbolsDecor"
            id="fountainSymbolsDecor"
            filter={["==", ["get", "type"], "decorative"] as any}
            style={{
              iconImage: 'fountainDecor',
              iconSize: makeSelectedIconSize(1),
              iconAllowOverlap: true,
              iconIgnorePlacement: true,
              iconAnchor: 'bottom',
            }}
          />
        ) : null}

        {datasets.toiletsPublic ? (
          <Mapbox.SymbolLayer
            key="toiletsSymbols"
            id="toiletsSymbols"
            filter={["==", ["get", "type"], "toilet"] as any}
            style={{
              iconImage: 'toilet',
              iconSize: makeSelectedIconSize(0.18),
              iconAllowOverlap: true,
              iconIgnorePlacement: true,
              iconAnchor: 'bottom',
            }}
          />
        ) : null}
      </Mapbox.ShapeSource>
    </>
  );
}


