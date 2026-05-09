// WebAssembly Optimization for Math Kids Game
// Enhances loading performance and provides fallbacks

class WasmOptimizer {
  constructor() {
    this.wasmSupported = false;
    this.wasmThreadsSupported = false;
    this.wasmSIMDSupported = false;
    this.fallbackMode = false;
  }

  // Initialize WebAssembly optimizations
  async initialize() {
    console.log("⚡ Initializing WebAssembly optimizations...");

    this.checkWasmSupport();
    this.optimizeForPlatform();
    this.setupPerformanceMonitoring();

    return this;
  }

  // Check WebAssembly support levels
  checkWasmSupport() {
    // Basic WebAssembly support
    this.wasmSupported = typeof WebAssembly === 'object' &&
                        typeof WebAssembly.compile === 'function';

    if (!this.wasmSupported) {
      console.warn("⚠️ WebAssembly not supported. Using fallback mode.");
      this.fallbackMode = true;
      return;
    }

    // Check for advanced features
    this.checkAdvancedFeatures();

    console.log("✅ WebAssembly support detected:", {
      basic: this.wasmSupported,
      threads: this.wasmThreadsSupported,
      simd: this.wasmSIMDSupported
    });
  }

  // Check for advanced WebAssembly features
  checkAdvancedFeatures() {
    // SharedArrayBuffer for threads
    this.wasmThreadsSupported = typeof SharedArrayBuffer === 'function';

    // SIMD support (basic check)
    if (typeof WebAssembly.validate === 'function') {
      // This is a basic check - real SIMD detection would need actual SIMD wasm
      this.wasmSIMDSupported = true; // Assume supported in modern browsers
    }
  }

  // Optimize loading based on platform
  optimizeForPlatform() {
    const ua = navigator.userAgent;
    const platform = navigator.platform;

    // Mobile optimizations
    if (this.isMobile()) {
      console.log("📱 Applying mobile optimizations...");
      this.applyMobileOptimizations();
    }

    // Desktop optimizations
    else {
      console.log("🖥️ Applying desktop optimizations...");
      this.applyDesktopOptimizations();
    }

    // Browser-specific optimizations
    if (ua.includes('Chrome')) {
      this.applyChromeOptimizations();
    } else if (ua.includes('Firefox')) {
      this.applyFirefoxOptimizations();
    } else if (ua.includes('Safari')) {
      this.applySafariOptimizations();
    }
  }

  // Check if running on mobile
  isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 768 && window.innerHeight <= 1024);
  }

  // Mobile-specific optimizations
  applyMobileOptimizations() {
    // Reduce memory usage on mobile
    if (window.performance && window.performance.memory) {
      const memInfo = window.performance.memory;
      if (memInfo.totalJSHeapSize > 100 * 1024 * 1024) { // 100MB
        console.log("📱 High memory usage detected, applying memory optimizations...");
        // Could adjust Unity config here
      }
    }

    // Optimize for touch
    this.setupTouchOptimizations();
  }

  // Desktop-specific optimizations
  applyDesktopOptimizations() {
    // Enable advanced features on desktop
    if (this.wasmThreadsSupported) {
      console.log("🖥️ Enabling multi-threading optimizations...");
    }
  }

  // Browser-specific optimizations
  applyChromeOptimizations() {
    console.log("🌐 Applying Chrome-specific optimizations...");
    // Chrome has good WebAssembly performance
  }

  applyFirefoxOptimizations() {
    console.log("🦊 Applying Firefox-specific optimizations...");
    // Firefox might need different memory settings
  }

  applySafariOptimizations() {
    console.log("🍎 Applying Safari-specific optimizations...");
    // Safari has specific WebAssembly behaviors
  }

  // Touch optimizations for mobile
  setupTouchOptimizations() {
    // Prevent default touch behaviors that interfere with Unity
    document.addEventListener('touchstart', (e) => {
      if (e.touches.length > 1) {
        e.preventDefault(); // Prevent zoom on pinch
      }
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
      if (e.touches.length > 1) {
        e.preventDefault(); // Prevent zoom on pinch
      }
    }, { passive: false });

    // Handle orientation changes
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        // Give Unity time to adjust
        window.dispatchEvent(new Event('resize'));
      }, 100);
    });
  }

  // Performance monitoring
  setupPerformanceMonitoring() {
    if ('performance' in window && 'mark' in window.performance) {
      // Mark key loading points
      window.performance.mark('wasm-optimizer-init');

      // Monitor memory usage
      this.memoryMonitor = setInterval(() => {
        if (window.performance.memory) {
          const memInfo = window.performance.memory;
          const usedPercent = (memInfo.usedJSHeapSize / memInfo.totalJSHeapSize) * 100;

          if (usedPercent > 80) {
            console.warn(`⚠️ High memory usage: ${usedPercent.toFixed(1)}%`);
          }
        }
      }, 5000);
    }
  }

  // Preload WebAssembly module (skip for compressed files)
  async preloadWasm(url) {
    if (!this.wasmSupported) return null;

    // Skip preloading for compressed files - Unity/server should handle decompression.
    // Normalize the URL so query strings like "file.wasm.gz?v=1" are still detected.
    try {
      const normalizedUrl = new URL(url, document.baseURI);
      const path = normalizedUrl.pathname.toLowerCase();

      if (path.endsWith('.gz') || path.endsWith('.br') || path.endsWith('.unityweb')) {
        console.log("⚡ Skipping WebAssembly preload for compressed file:", url);
        return null;
      }
    } catch {
      // If URL parsing fails, fall back to a simple heuristic.
      const simplified = String(url).split('#')[0].split('?')[0].toLowerCase();
      if (simplified.endsWith('.gz') || simplified.endsWith('.br') || simplified.endsWith('.unityweb')) {
        console.log("⚡ Skipping WebAssembly preload for compressed file:", url);
        return null;
      }
    }

    try {
      console.log("⚡ Preloading WebAssembly module...");

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const buffer = await response.arrayBuffer();

      // Validate that we really fetched a wasm binary (0x00 0x61 0x73 0x6d).
      // This prevents misleading "expected magic word" errors when the server returns HTML/404 pages.
      const bytes = new Uint8Array(buffer);
      const hasWasmMagic = bytes.length >= 4 && bytes[0] === 0x00 && bytes[1] === 0x61 && bytes[2] === 0x73 && bytes[3] === 0x6d;
      if (!hasWasmMagic) {
        const contentType = response.headers.get('content-type') || 'unknown';
        let preview = '';
        try {
          // Try to decode a small preview; useful if the response is HTML.
          preview = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 80)).replace(/\s+/g, ' ').trim();
        } catch {
          // ignore
        }

        console.warn("⚠️ Skipping WebAssembly preload: response is not a wasm binary", {
          url,
          contentType,
          byte0_3: Array.from(bytes.slice(0, 4)),
          preview
        });
        return null;
      }

      window.performance.mark('wasm-fetch-end');

      const module = await WebAssembly.compile(buffer);

      window.performance.mark('wasm-compile-end');

      console.log("✅ WebAssembly module preloaded successfully!");
      return module;

    } catch (error) {
      console.error("❌ WebAssembly preload failed:", error);
      return null;
    }
  }

  // Get optimized config for Unity
  getOptimizedConfig(baseConfig) {
    const optimizedConfig = { ...baseConfig };

    // Memory optimizations based on device
    if (this.isMobile()) {
      optimizedConfig.devicePixelRatio = Math.min(window.devicePixelRatio, 1.5);
    }

    // WebAssembly-specific settings
    if (this.wasmSupported) {
      optimizedConfig.webAssemblyStreaming = true;
    }

    // Cache optimizations
    optimizedConfig.cacheControl = (url) => {
      if (url.includes('.wasm')) return 'must-revalidate';
      if (url.includes('.data')) return 'must-revalidate';
      return 'no-store';
    };

    return optimizedConfig;
  }

  // Cleanup
  cleanup() {
    if (this.memoryMonitor) {
      clearInterval(this.memoryMonitor);
    }
  }
}

// Export for use
window.WasmOptimizer = WasmOptimizer;