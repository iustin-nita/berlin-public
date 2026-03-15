import { CategoryKey } from '../constants/categories';

export type FeatureProps = {
  id: string;
  title: string;
  description?: string;
  coordinates: [number, number];
  type?: CategoryKey;
  imageUrl?: string;
  // Optional structured metadata for toilets (rendered in details sheet)
  toilet?: {
    operator?: string;
    district?: string;
    hours?: string;
    fee?: number | null;
    payment?: string;
    hasChangingTable?: boolean | null;
    barrierFree?: boolean | null;
    barrierReduced?: boolean | null;
  };
  // Optional metadata for drinking fountains
  drinking?: {
    district?: string;
    yearBuilt?: number | null;
    fountainType?: string;
    restrictions?: string;
    info?: string;
    infoUrl?: string | null;
    number?: number | null;
    postalCode?: number | null;
  };
  // Bathing spots
  bathing?: {
    waterQuality?: string;
    cyanobacteria?: string;
    season?: string;
    district?: string;
  };
  // Cool spaces
  coolSpace?: {
    hours?: string;
    wheelchairAccessible?: boolean | null;
    spaceType?: string;
    district?: string;
  };
  // BBQ areas
  bbq?: {
    bookingUrl?: string;
    fee?: string;
    rules?: string;
    district?: string;
  };
  // Bike repair stations
  bikeRepair?: {
    district?: string;
    stationType?: string;
  };
  // EV charging stations
  evCharging?: {
    connectorTypes?: string;
    powerKw?: number | null;
    operator?: string;
    isPublic?: boolean | null;
    address?: string;
  };
  // Playgrounds
  playground?: {
    area?: number | null;
    equipment?: string;
    district?: string;
  };
};
