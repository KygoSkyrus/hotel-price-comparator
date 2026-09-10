import { useState, type FormEvent } from "react";
import { searchHotels, cancelSearch } from "./api";
import type { HotelSearchResult, SupplierResult } from "./types";

const SCENARIOS = [
  { value: "default", label: "Normal comparison" },
  { value: "supplier-b-cheaper", label: "Supplier B cheaper" },
  { value: "same-rate", label: "Same rate (tie-break)" },
  { value: "supplier-a-fails", label: "Supplier A fails" },
  { value: "supplier-b-fails", label: "Supplier B fails" },
  { value: "both-fail", label: "Both suppliers fail" },
  { value: "one-empty", label: "One supplier empty" },
  { value: "both-empty", label: "Both suppliers empty" },
  { value: "supplier-a-timeout", label: "Supplier A timeout (>5s)" },
  { value: "supplier-a-retries", label: "Supplier A retries (2 failures)" },
];

function formatPrice(value: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDuration(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function StatusBadge({ status }: { status: string }) {
  const classMap: Record<string, string> = {
    completed: "badge badge--success",
    success: "badge badge--success",
    partial: "badge badge--warning",
    empty: "badge badge--warning",
    failed: "badge badge--error",
    timeout: "badge badge--error",
    cancelled: "badge badge--muted",
  };

  return (
    <span className={classMap[status] ?? "badge"}>
      {status}
    </span>
  );
}

function SupplierCard({ result }: { result: SupplierResult }) {
  return (
    <div className="supplier-card">
      <div className="supplier-card__header">
        <span className="supplier-card__name">{result.supplier}</span>
        <StatusBadge status={result.status} />
      </div>

      {result.offers.length > 0 ? (
        <div className="supplier-card__body">
          <div className="supplier-card__stat">
            <span className="supplier-card__value">{result.offers.length}</span>
            <span className="supplier-card__label">hotels found</span>
          </div>
          <div className="supplier-card__stat">
            <span className="supplier-card__value">
              {formatDuration(result.durationMs)}
            </span>
            <span className="supplier-card__label">response time</span>
          </div>
        </div>
      ) : (
        <p className="supplier-card__message">
          {result.message || "No results"}
        </p>
      )}

      {result.offers.length > 0 && (
        <ul className="supplier-card__offers">
          {result.offers.map((offer) => (
            <li key={offer.hotelId} className="offer-row">
              <span className="offer-row__name">{offer.name}</span>
              <span className="offer-row__price">
                {formatPrice(offer.price, offer.currency)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BestOffer({ result }: { result: HotelSearchResult }) {
  if (!result.bestOffer) {
    return (
      <div className="best-offer best-offer--empty">
        <h3>No rate to recommend</h3>
        <p>{result.message || "Neither supplier returned a bookable offer."}</p>
      </div>
    );
  }

  const offer = result.bestOffer;
  return (
    <div className="best-offer">
      <div className="best-offer__label">Best Available Rate</div>
      <div className="best-offer__hotel">{offer.name}</div>
      <div className="best-offer__price">
        {formatPrice(offer.price, offer.currency)}
        <span className="best-offer__per-night">/night</span>
      </div>
      <div className="best-offer__details">
        <span>From: {offer.supplier}</span>
        <span>Rating: {offer.rating.toFixed(1)}</span>
        <span>{offer.refundable ? "Refundable" : "Non-refundable"}</span>
      </div>
    </div>
  );
}

export default function App() {
  const [city, setCity] = useState("Lisbon");
  const [checkIn, setCheckIn] = useState(() =>
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
  );
  const [checkOut, setCheckOut] = useState(() =>
    new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
  );
  const [scenario, setScenario] = useState("default");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HotelSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const data = await searchHotels({ city, checkIn, checkOut, scenario });
      setResult(data);
      setActiveRunId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setActiveRunId(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    if (activeRunId) {
      await cancelSearch(activeRunId);
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Hotel Rate Comparator</h1>
        <p className="header__subtitle">
          Compare rates from two suppliers using Temporal workflows
        </p>
      </header>

      <main className="main">
        {/* Search Form */}
        <form className="search-form" onSubmit={handleSubmit}>
          <div className="search-form__fields">
            <label className="field">
              <span className="field__label">City</span>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Enter city name"
                required
                minLength={2}
                className="field__input"
              />
            </label>

            <label className="field">
              <span className="field__label">Check-in</span>
              <input
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                required
                className="field__input"
              />
            </label>

            <label className="field">
              <span className="field__label">Check-out</span>
              <input
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                required
                className="field__input"
              />
            </label>

            <label className="field">
              <span className="field__label">Test Scenario</span>
              <select
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                className="field__input"
              >
                {SCENARIOS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="search-form__actions">
            <button
              type="submit"
              disabled={loading}
              className="btn btn--primary"
            >
              {loading ? "Comparing…" : "Compare Rates"}
            </button>
            {loading && (
              <button
                type="button"
                onClick={handleCancel}
                className="btn btn--cancel"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {/* Error Message */}
        {error && (
          <div className="alert alert--error">
            <strong>Error:</strong> {error}
            <button
              onClick={() => setError(null)}
              className="alert__dismiss"
            >
              ×
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="loading">
            <div className="loading__spinner" />
            <p>Querying suppliers in parallel…</p>
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div className="results">
            <div className="results__header">
              <h2>Comparison Result</h2>
              <StatusBadge status={result.status} />
            </div>

            {/* Best Offer */}
            <BestOffer result={result} />

            {/* Supplier Breakdown */}
            <h3 className="results__section-title">Supplier Breakdown</h3>
            <div className="supplier-grid">
              {result.supplierResults.map((sr) => (
                <SupplierCard key={sr.supplier} result={sr} />
              ))}
            </div>

            {/* Run metadata */}
            <div className="results__meta">
              <span>Run ID: {result.runId}</span>
              <span>Completed: {new Date(result.completedAt).toLocaleString()}</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
