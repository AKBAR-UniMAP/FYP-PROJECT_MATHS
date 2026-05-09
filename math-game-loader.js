// Enhanced Unity WebGL Loader for Math Kids Game
// Includes advanced caching, error handling, and kid-friendly features

class MathGameLoader {
  constructor(config) {
    this.config = config;
    this.cache = null;
    this.isOffline = false;
    this.gameInstance = null;
    this.wasmOptimizer = null;
  }

  // Initialize the loader with enhanced features
  async initialize() {
    console.log("🚀 Initializing Math Adventure Game Loader...");

    // Check if WasmOptimizer is available
    if (typeof WasmOptimizer === 'undefined') {
      console.warn("⚠️ WasmOptimizer not available, using basic loader functionality");
      this.wasmOptimizer = null;
    } else {
      // Initialize WebAssembly optimizer
      this.wasmOptimizer = new WasmOptimizer();
      await this.wasmOptimizer.initialize();

      // Optimize config
      this.config = this.wasmOptimizer.getOptimizedConfig(this.config);
    }

    // Check online status
    this.checkOnlineStatus();

    // Initialize enhanced caching
    await this.initializeEnhancedCache();

    // Check browser compatibility
    this.checkBrowserCompatibility();

    return this;
  }

  // Check if user is online
  checkOnlineStatus() {
    this.isOffline = !navigator.onLine;
    window.addEventListener('online', () => {
      this.isOffline = false;
      console.log("📡 Back online! Game features restored.");
    });
    window.addEventListener('offline', () => {
      this.isOffline = true;
      console.log("📴 You're offline. Some features may be limited.");
    });
  }

  // Enhanced caching with IndexedDB optimization
  async initializeEnhancedCache() {
    try {
      if ('caches' in window && 'indexedDB' in window) {
        this.cache = await caches.open('math-adventure-cache-v1.0');
        console.log("💾 Enhanced caching enabled for faster loading!");
      } else {
        console.warn("⚠️ Advanced caching not supported. Using basic caching.");
      }
    } catch (error) {
      console.warn("⚠️ Cache initialization failed:", error);
    }
  }

  // Browser compatibility check with kid-friendly messages
  checkBrowserCompatibility() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    if (!gl) {
      throw new Error("WebGL support required for math games! Please update your browser. 🎮");
    }

    if (!window.WebAssembly) {
      throw new Error("WebAssembly needed for smooth gameplay! Try a modern browser. ⚡");
    }

    // Check for recommended features
    const recommended = {
      webgl2: !!canvas.getContext('webgl2'),
      threads: !!window.SharedArrayBuffer,
      fullscreen: !!(document.fullscreenEnabled || document.webkitFullscreenEnabled)
    };

    if (!recommended.webgl2) {
      console.warn("🌟 WebGL 2.0 not available. Some visual effects may be limited.");
    }

    console.log("✅ Browser compatibility check passed!");
  }

  // Enhanced asset loading with progress tracking
  async loadAssets(progressCallback) {
    const assets = [
      { url: this.config.dataUrl, name: 'Game Data' },
      { url: this.config.frameworkUrl, name: 'Game Engine' },
      { url: this.config.codeUrl, name: 'Game Code' }
    ];

    let loadedCount = 0;
    const totalAssets = assets.length;

    for (const asset of assets) {
      try {
        await this.loadAsset(asset.url, asset.name);
        loadedCount++;
        const progress = loadedCount / totalAssets;
        progressCallback(progress);
      } catch (error) {
        console.error(`❌ Failed to load ${asset.name}:`, error);
        throw error;
      }
    }
  }

  // Load individual asset with caching and fallback
  async loadAsset(url, name) {
    // Try cache first
    if (this.cache && !this.isOffline) {
      try {
        const cachedResponse = await this.cache.match(url);
        if (cachedResponse) {
          console.log(`💾 Loaded ${name} from cache`);
          return cachedResponse;
        }
      } catch (error) {
        console.warn(`⚠️ Cache miss for ${name}:`, error);
      }
    }

    // Fetch from network with fallback for compressed files
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Cache the response
      if (this.cache && response.ok) {
        try {
          this.cache.put(url, response.clone());
        } catch (error) {
          console.warn(`⚠️ Failed to cache ${name}:`, error);
        }
      }

      console.log(`📥 Downloaded ${name}`);
      return response;
    } catch (error) {
      // If compressed file fails, try uncompressed version
      if (url.endsWith('.gz')) {
        const uncompressedUrl = url.slice(0, -3); // Remove .gz extension
        console.warn(`⚠️ Compressed ${name} failed, trying uncompressed version...`);
        try {
          const response = await fetch(uncompressedUrl);
          if (response.ok) {
            console.log(`📥 Downloaded uncompressed ${name}`);
            return response;
          }
        } catch (fallbackError) {
          console.error(`❌ Both compressed and uncompressed ${name} failed`);
        }
      }
      throw error;
    }
  }

  // Create Unity instance with enhanced error handling and fallback
  async createInstance(canvas, progressCallback) {
    let currentConfig = this.config;
    let attemptCount = 0;
    const maxAttempts = 2;

    while (attemptCount < maxAttempts) {
      try {
        console.log(`🎯 Creating Unity instance for Math Adventure (attempt ${attemptCount + 1})...`);

        // Preload WebAssembly if optimizer is available.
        // WasmOptimizer handles skipping compressed URLs (including query strings).
        if (this.wasmOptimizer && !this.wasmOptimizer.fallbackMode) {
          await this.wasmOptimizer.preloadWasm(currentConfig.codeUrl);
        }

        // Load assets first
        await this.loadAssetsWithConfig(currentConfig, progressCallback);

        // Create the Unity instance
        this.gameInstance = await window.createUnityInstance(canvas, currentConfig, progressCallback);

        console.log("🎉 Math Adventure loaded successfully!");

        // Set up enhanced event handlers
        this.setupEventHandlers();

        return this.gameInstance;

      } catch (error) {
        console.error(`💥 Failed to create Unity instance (attempt ${attemptCount + 1}):`, error);

        attemptCount++;

        // If this is the first attempt and we were using compressed files, only try uncompressed
        // if those files actually exist. Many Unity WebGL exports ship ONLY .gz assets.
        if (attemptCount === 1 && this.isUsingCompressedFiles(currentConfig)) {
          const maybeUncompressed = await this.tryGetUncompressedConfigIfAvailable(currentConfig);
          if (maybeUncompressed) {
            console.log("🔄 Switching to uncompressed files...");
            currentConfig = maybeUncompressed;
            continue;
          }
        }

        // Provide more specific error messages for common issues
        let friendlyError = this.getKidFriendlyError(error);

        if (error.message.includes('SyntaxError') || error.message.includes('Invalid or unexpected token')) {
          friendlyError = "These Unity files are compressed (.gz), but the server isn't sending the right gzip headers. If you're running locally, use a server that sets Content-Encoding: gzip for .gz files. 📦";
        } else if (error.message.includes('WebAssembly.compile') || error.message.includes('magic word')) {
          friendlyError = "The WebAssembly file being loaded isn't a real .wasm binary (often caused by missing gzip headers or a 404/HTML response). Check your server headers for .wasm(.gz). ⚙️";
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          friendlyError = "Can't download the game files. Check your internet connection and try again! 📡";
        }

        throw new Error(friendlyError);
      }
    }
  }

  // Only fall back to uncompressed URLs if the uncompressed artifacts exist.
  // Returns a config object or null.
  async tryGetUncompressedConfigIfAvailable(config) {
    const uncompressed = {
      dataUrl: config.dataUrl.replace('.gz', ''),
      frameworkUrl: config.frameworkUrl.replace('.gz', ''),
      codeUrl: config.codeUrl.replace('.gz', ''),
      streamingAssetsUrl: config.streamingAssetsUrl,
      companyName: config.companyName,
      productName: config.productName,
      productVersion: config.productVersion,
      showBanner: config.showBanner,
    };

    const urlsToCheck = [uncompressed.dataUrl, uncompressed.frameworkUrl, uncompressed.codeUrl];
    const checks = await Promise.all(urlsToCheck.map((url) => this.urlExists(url)));
    return checks.every(Boolean) ? uncompressed : null;
  }

  async urlExists(url) {
    try {
      const response = await fetch(url, { method: 'HEAD', cache: 'no-store' });
      return response.ok;
    } catch {
      return false;
    }
  }

  // Check if config is using compressed files
  isUsingCompressedFiles(config) {
    return config.dataUrl.endsWith('.gz') ||
           config.frameworkUrl.endsWith('.gz') ||
           config.codeUrl.endsWith('.gz');
  }

  // Get uncompressed version of config
  getUncompressedConfig() {
    return {
      dataUrl: this.config.dataUrl.replace('.gz', ''),
      frameworkUrl: this.config.frameworkUrl.replace('.gz', ''),
      codeUrl: this.config.codeUrl.replace('.gz', ''),
      streamingAssetsUrl: this.config.streamingAssetsUrl,
      companyName: this.config.companyName,
      productName: this.config.productName,
      productVersion: this.config.productVersion,
      showBanner: this.config.showBanner,
    };
  }

  // Load assets with specific config
  async loadAssetsWithConfig(config, progressCallback) {
    const assets = [
      { url: config.dataUrl, name: 'Game Data' },
      { url: config.frameworkUrl, name: 'Game Engine' },
      { url: config.codeUrl, name: 'Game Code' }
    ];

    let loadedCount = 0;
    const totalAssets = assets.length;

    for (const asset of assets) {
      try {
        await this.loadAsset(asset.url, asset.name);
        loadedCount++;
        const progress = loadedCount / totalAssets;
        progressCallback(progress);
      } catch (error) {
        console.error(`❌ Failed to load ${asset.name}:`, error);
        throw error;
      }
    }
  }

  // Set up enhanced event handlers
  setupEventHandlers() {
    if (!this.gameInstance) return;

    // Enhanced fullscreen handling
    const fullscreenButton = document.querySelector("#unity-fullscreen-button");
    if (fullscreenButton) {
      fullscreenButton.addEventListener('click', () => {
        this.enterFullscreen();
      });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      switch(e.key.toLowerCase()) {
        case 'f':
          e.preventDefault();
          this.enterFullscreen();
          break;
        case 'escape':
          if (document.fullscreenElement) {
            document.exitFullscreen();
          }
          break;
      }
    });

    // Canvas event enhancements
    const canvas = document.querySelector("#unity-canvas");
    if (canvas) {
      canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault(); // Prevent right-click menu
      });

      // Touch events for mobile
      if ('ontouchstart' in window) {
        canvas.addEventListener('touchstart', (e) => {
          // Prevent default touch behaviors that might interfere with game
          if (e.touches.length > 1) {
            e.preventDefault();
          }
        }, { passive: false });
      }
    }
  }

  // Enhanced fullscreen with fallback
  async enterFullscreen() {
    try {
      if (!this.gameInstance) return;

      if (document.fullscreenEnabled || document.webkitFullscreenEnabled) {
        await this.gameInstance.SetFullscreen(1);
      } else {
        console.warn("⚠️ Fullscreen not supported on this device");
        alert("Fullscreen mode is not available on your device. 📱");
      }
    } catch (error) {
      console.error("❌ Fullscreen failed:", error);
    }
  }

  // Get kid-friendly error messages
  getKidFriendlyError(error) {
    const message = error.message || error.toString();

    const errorMap = {
      "WebAssembly": "Oops! Your browser needs an update to play math games. Try Chrome, Firefox, or Safari! 🌟",
      "WebGL": "Math games need special graphics! Please update your browser or enable graphics settings. 🎨",
      "network": "Can't connect to load the game. Check your internet and try again! 📡",
      "memory": "Not enough memory to load the game. Try closing other tabs or apps! 💾",
      "fullscreen": "Can't go fullscreen right now. Try again or play in window mode! 🖥️",
      "unsupported": "Your browser is too old for this game. Please update to a newer version! 🔄"
    };

    for (const [key, friendlyMessage] of Object.entries(errorMap)) {
      if (message.toLowerCase().includes(key.toLowerCase())) {
        return new Error(friendlyMessage);
      }
    }

    return new Error("Something went wrong loading the game. Please refresh the page and try again! 🎮");
  }

  // Cleanup method
  async cleanup() {
    if (this.wasmOptimizer) {
      this.wasmOptimizer.cleanup();
    }

    if (this.gameInstance) {
      try {
        await this.gameInstance.Quit();
      } catch (error) {
        console.warn("⚠️ Error during cleanup:", error);
      }
    }

    if (this.cache) {
      // Clear old cache entries if needed
      try {
        const keys = await this.cache.keys();
        const oldEntries = keys.filter(request =>
          request.url.includes('math-adventure-cache-v0.')
        );

        await Promise.all(oldEntries.map(request =>
          this.cache.delete(request)
        ));

        if (oldEntries.length > 0) {
          console.log("🧹 Cleaned up old cache entries");
        }
      } catch (error) {
        console.warn("⚠️ Cache cleanup failed:", error);
      }
    }
  }
}

// Export for use in main script
window.MathGameLoader = MathGameLoader;