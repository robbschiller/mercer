export interface SnapshotSurface {
  name: string;
  dimensions: number[][] | null;
  totalSqft: number;
}

export interface SnapshotBuilding {
  label: string;
  count: number;
  surfaces: SnapshotSurface[];
  totalSqft: number;
}

export interface SnapshotLineItem {
  name: string;
  amount: number;
}

export interface ProposalSnapshot {
  propertyName: string;
  address: string;
  clientName: string;
  notes: string;
  buildings: SnapshotBuilding[];
  lineItems: SnapshotLineItem[];
  totalSqft: number;
  grandTotal: number;
  generatedAt: string;
  /** In-memory only for PDF render; never persist to `proposals.snapshot`. */
  satelliteImageDataUri?: string;
}
