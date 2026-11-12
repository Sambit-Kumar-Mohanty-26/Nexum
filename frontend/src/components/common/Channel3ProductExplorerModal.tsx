"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  ShoppingBag,
  ExternalLink,
  Copy,
  Check,
  X,
  Sparkles,
  Layers,
  Tag,
  ShieldCheck,
  Package,
} from "lucide-react";

export interface Channel3ProductItem {
  id: string;
  sku: string;
  title: string;
  brand: string;
  category: string;
  description: string;
  priceCents: number;
  priceDisplay: string;
  currency: string;
  imageUrl: string;
  retailer: string;
  inStock: boolean;
  attributes: Record<string, string | number>;
}

interface Channel3ProductExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct?: (product: Channel3ProductItem) => void;
  initialQuery?: string;
  initialCategory?: string;
}

const CATEGORIES = ["ALL", "Footwear", "Electronics", "Hardware", "Apparel"];

const FALLBACK_PRODUCTS: Channel3ProductItem[] = [
  {
    id: "c3_prod_001",
    sku: "C3-NIKE-71Q8E1Y",
    title: "Nike Air Max 270 React Running Shoes",
    brand: "Nike",
    category: "Footwear",
    description: "Breathable mesh upper with dual-density foam midsole and large Max Air heel unit.",
    priceCents: 15000,
    priceDisplay: "$150.00 USD",
    currency: "USD",
    imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80",
    retailer: "Foot Locker",
    inStock: true,
    attributes: { color: "Black/White/Solar Red", size: "US 10.5", weightGrams: 310 },
  },
  {
    id: "c3_prod_002",
    sku: "C3-APPL-AIRPODS-PRO-2",
    title: "Apple AirPods Pro (2nd Gen) with MagSafe USB-C Case",
    brand: "Apple",
    category: "Electronics",
    description: "Up to 2x more Active Noise Cancellation, Adaptive Audio, and Transparency mode.",
    priceCents: 24900,
    priceDisplay: "$249.00 USD",
    currency: "USD",
    imageUrl: "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=400&q=80",
    retailer: "Best Buy",
    inStock: true,
    attributes: { chip: "Apple H2", batteryHours: 30, connectivity: "Bluetooth 5.3" },
  },
  {
    id: "c3_prod_003",
    sku: "C3-DJI-MATRICE-300",
    title: "DJI Matrice 300 RTK Commercial Inspection Drone",
    brand: "DJI",
    category: "Hardware",
    description: "Industrial multi-hazard surveying drone with 55 min flight time and 15 km transmission.",
    priceCents: 1250000,
    priceDisplay: "$12,500.00 USD",
    currency: "USD",
    imageUrl: "https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=400&q=80",
    retailer: "B&H Photo",
    inStock: true,
    attributes: { maxPayloadKg: 2.7, windResistanceMs: 15, operationalTemp: "-20C to 50C" },
  },
  {
    id: "c3_prod_004",
    sku: "C3-PATA-TORRENTSHELL",
    title: "Patagonia Torrentshell 3L Waterproof Rain Jacket",
    brand: "Patagonia",
    category: "Apparel",
    description: "3-layer H2No Performance Standard waterproof/breathable shell with 100% recycled nylon face.",
    priceCents: 17900,
    priceDisplay: "$179.00 USD",
    currency: "USD",
    imageUrl: "https://images.unsplash.com/photo-1544441893-675973e31985?w=400&q=80",
    retailer: "REI",
    inStock: true,
    attributes: { material: "100% Recycled Nylon", waterproofRatingMm: 20000 },
  },
];

export default function Channel3ProductExplorerModal({
  isOpen,
  onClose,
  onSelectProduct,
  initialQuery = "shoes",
  initialCategory = "ALL",
}: Channel3ProductExplorerModalProps) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [products, setProducts] = useState<Channel3ProductItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedSku, setCopiedSku] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Channel3ProductItem | null>(null);

  const filterFallback = useCallback((q: string, cat: string): Channel3ProductItem[] => {
    const qTrim = (q || "").trim().toLowerCase();
    const qStem = qTrim.replace(/s$/, "");
    return FALLBACK_PRODUCTS.filter((p) => {
      if (cat !== "ALL" && p.category.toLowerCase() !== cat.toLowerCase()) {
        return false;
      }
      if (!qTrim) return true;
      return (
        p.title.toLowerCase().includes(qTrim) ||
        p.title.toLowerCase().includes(qStem) ||
        p.description.toLowerCase().includes(qTrim) ||
        p.brand.toLowerCase().includes(qTrim) ||
        p.sku.toLowerCase().includes(qTrim) ||
        p.category.toLowerCase().includes(qTrim)
      );
    });
  }, []);

  const fetchProducts = useCallback(async (q: string, cat: string) => {
    setIsLoading(true);
    try {
      const url = new URL("/api/channel3/products", window.location.origin);
      url.searchParams.set("query", q || "product");
      if (cat !== "ALL") {
        url.searchParams.set("category", cat);
      }
      url.searchParams.set("limit", "12");

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data && data.success && Array.isArray(data.products) && data.products.length > 0) {
          setProducts(data.products);
          return;
        }
      }
      // If live endpoint returned no matching items or errored, use reliable fallback
      setProducts(filterFallback(q, cat));
    } catch (err) {
      console.warn("Channel 3 lookup using local fallback:", err);
      setProducts(filterFallback(q, cat));
    } finally {
      setIsLoading(false);
    }
  }, [filterFallback]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      fetchProducts(query, category);
    }, 250);
    return () => clearTimeout(timer);
  }, [isOpen, fetchProducts, query, category]);

  const handleCopySpec = (product: Channel3ProductItem) => {
    const jsonStr = JSON.stringify(
      {
        sku: product.sku,
        title: product.title,
        brand: product.brand,
        priceDisplay: product.priceDisplay,
        attributes: product.attributes,
        referenceDataSource: "Channel3_Universal_Catalog",
      },
      null,
      2
    );
    navigator.clipboard.writeText(jsonStr);
    setCopiedSku(product.sku);
    setTimeout(() => setCopiedSku(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Product Catalog &amp; Data Discovery
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                  Channel 3 Universal
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Query multi-channel retail SKUs to enrich project scopes and reference deliverable datasets.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="px-5 py-3 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products, shoes, drones, sensors, electronics..."
              className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-slate-900 placeholder:text-slate-400 transition"
            />
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none p-0.5 bg-slate-200/50 rounded-lg border border-slate-200/70">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition whitespace-nowrap cursor-pointer ${
                  category === cat
                    ? "bg-white text-slate-900 shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-3.5 rounded-xl border border-slate-200/80 bg-white flex gap-3.5 animate-pulse">
                  <div className="w-20 h-20 rounded-lg bg-slate-100 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-100 rounded w-1/3" />
                    <div className="h-4 bg-slate-100 rounded w-4/5" />
                    <div className="h-3 bg-slate-100 rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <Package className="w-8 h-8 text-slate-300 mx-auto" />
              <h4 className="text-sm font-semibold text-slate-800">No products matched query</h4>
              <p className="text-xs text-slate-500">Try a different search term or category filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {products.map((p) => {
                const isSelected = selectedProduct?.id === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProduct(p)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex gap-3.5 ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-50/20 shadow-xs ring-1 ring-indigo-500/20"
                        : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/40"
                    }`}
                  >
                    {/* Product Image */}
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200 relative">
                      <img
                        src={p.imageUrl}
                        alt={p.title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Details */}
                    <div className="min-w-0 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {p.brand}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 truncate">
                            {p.sku}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 line-clamp-1 mt-0.5">
                          {p.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                          {p.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2">
                        <span className="font-mono font-bold text-xs text-slate-900">
                          {p.priceDisplay}
                        </span>

                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleCopySpec(p)}
                            className="px-2 py-1 rounded-md text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1 cursor-pointer"
                            title="Copy structured SKU JSON spec"
                          >
                            {copiedSku === p.sku ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedSku === p.sku ? "Copied" : "JSON"}</span>
                          </button>

                          {onSelectProduct && (
                            <button
                              type="button"
                              onClick={() => onSelectProduct(p)}
                              className="px-2.5 py-1 rounded-md text-[10px] font-semibold bg-slate-900 hover:bg-slate-800 text-white transition flex items-center gap-1 cursor-pointer"
                            >
                              <span>Attach to Scope</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-[11px]">Channel 3 Data Protocol &bull; Minor-unit integer pricing</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

