// Types shared between client and server.

export type HotelOffer = {
  hotelId: string;
  name: string;
  price: number;
  currency: string;
  supplier: string;
  rating: number;
  refundable: boolean;
};

export type SupplierResult = {
  supplier: string;
  status: "success" | "empty" | "failed" | "timeout";
  durationMs: number;
  offers: HotelOffer[];
  message: string | null;
};

export type HotelSearchResult = {
  runId: string;
  status: "completed" | "partial" | "empty" | "failed" | "cancelled";
  city: string;
  checkIn: string;
  checkOut: string;
  bestOffer: HotelOffer | null;
  supplierResults: SupplierResult[];
  completedAt: string;
  message: string | null;
};

export type SearchRun = {
  runId: string;
  city: string;
  dates: string;
  status: string;
  bestPrice: number | null;
  supplier: string | null;
  durationMs: number;
  createdAt: string;
};
