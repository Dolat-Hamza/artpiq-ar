'use client'
// Thin compatibility shim — the real code lives in src/lib/ar/*.
// Server-side AR model generation now happens in API routes (see
// src/app/api/ar/*). Legacy client-side exporters + blob URLs are gone.

export { loadTexture, preloadArtworkTextures, buildPaintingMesh } from './ar/client'
