export type FeatureProps = {
  id: string;
  title: string;
  description?: string;
  coordinates: [number, number];
  type?: 'drinking' | 'decorative' | 'toilet';
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
};