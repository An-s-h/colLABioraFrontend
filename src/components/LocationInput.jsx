import { useEffect, useRef, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { MapPin, Loader2 } from "lucide-react";

// Popular cities for instant suggestions (shown immediately while API loads)
const POPULAR_LOCATIONS = [
  "New York, United States",
  "Los Angeles, United States",
  "Chicago, United States",
  "Houston, United States",
  "San Francisco, United States",
  "Boston, United States",
  "Seattle, United States",
  "Miami, United States",
  "London, United Kingdom",
  "Toronto, Canada",
  "Vancouver, Canada",
  "Sydney, Australia",
  "Melbourne, Australia",
  "Mumbai, India",
  "Delhi, India",
  "Bangalore, India",
  "Singapore",
  "Dubai, United Arab Emirates",
  "Paris, France",
  "Berlin, Germany",
  "Tokyo, Japan",
  "Hong Kong",
  "Shanghai, China",
  "Beijing, China",
  "Seoul, South Korea",
  "São Paulo, Brazil",
  "Mexico City, Mexico",
  "Amsterdam, Netherlands",
  "Stockholm, Sweden",
  "Zurich, Switzerland",
  "Tel Aviv, Israel",
  "Cape Town, South Africa",
  "Lagos, Nigeria",
  "Cairo, Egypt",
  "Bangkok, Thailand",
  "Kuala Lumpur, Malaysia",
  "Jakarta, Indonesia",
  "Manila, Philippines",
  "Ho Chi Minh City, Vietnam",
  "Auckland, New Zealand",
];

// Simple in-memory cache for API results
const searchCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export default function LocationInput({
  value,
  onChange,
  placeholder = "e.g. New York, USA or City, Country",
  className = "",
  inputClassName = "",
  disabled = false,
  name,
  ...rest
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [apiSuggestions, setApiSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const blurTimeoutRef = useRef(null);
  const inputRef = useRef(null);
  const requestTimeoutRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Instant local suggestions based on query (no API call needed)
  const localSuggestions = useMemo(() => {
    if (!value || value.trim().length < 1) return [];
    const query = value.toLowerCase().trim();
    return POPULAR_LOCATIONS.filter((loc) =>
      loc.toLowerCase().includes(query)
    ).slice(0, 6);
  }, [value]);

  // Combined suggestions: local first, then API results (deduplicated)
  const suggestions = useMemo(() => {
    const combined = [...localSuggestions];

    // Add API suggestions that aren't already in local
    apiSuggestions.forEach((apiSug) => {
      const isDuplicate = combined.some(
        (local) => local.toLowerCase() === apiSug.toLowerCase()
      );
      if (!isDuplicate) {
        combined.push(apiSug);
      }
    });

    return combined.slice(0, 8);
  }, [localSuggestions, apiSuggestions]);

  // Get suggestions from OpenStreetMap Nominatim with caching
  const getPlaceSuggestions = async (query) => {
    if (!query || query.trim().length < 2) {
      setApiSuggestions([]);
      return;
    }

    const cacheKey = query.toLowerCase().trim();

    // Check cache first
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setApiSuggestions(cached.results);
      setIsLoading(false);
      return;
    }

    // Clear previous timeout and abort previous request
    if (requestTimeoutRef.current) {
      clearTimeout(requestTimeoutRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Very short debounce (50ms) - just enough to batch rapid keystrokes
    requestTimeoutRef.current = setTimeout(async () => {
      setIsLoading(true);
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?` +
            new URLSearchParams({
              q: query,
              format: "json",
              addressdetails: 1,
              limit: 8,
              featuretype: "city",
            }),
          {
            signal: abortControllerRef.current.signal,
            headers: {
              "Accept-Language": "en",
            },
          }
        );

        if (!response.ok) throw new Error("Failed to fetch");

        const data = await response.json();

        // Format results
        const formattedSuggestions = data
          .map((item) => {
            const parts = [];
            const addr = item.address || {};

            const city =
              addr.city ||
              addr.town ||
              addr.village ||
              addr.municipality ||
              addr.county ||
              item.name;

            if (city) parts.push(city);

            const state = addr.state || addr.region || addr.province;
            if (state && state !== city) parts.push(state);

            const country = addr.country;
            if (country) parts.push(country);

            return parts.length > 0 ? parts.join(", ") : item.display_name;
          })
          .filter((s, i, arr) => arr.indexOf(s) === i);

        // Cache the results
        searchCache.set(cacheKey, {
          results: formattedSuggestions,
          timestamp: Date.now(),
        });

        setApiSuggestions(formattedSuggestions);
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Error fetching location suggestions:", error);
        }
      } finally {
        setIsLoading(false);
      }
    }, 50); // Very short debounce for near-instant feel
  };

  // Update API suggestions when value changes
  useEffect(() => {
    if (value && value.trim().length >= 2) {
      getPlaceSuggestions(value);
    } else {
      setApiSuggestions([]);
    }

    return () => {
      if (requestTimeoutRef.current) {
        clearTimeout(requestTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [value]);

  // Open dropdown when we have suggestions
  useEffect(() => {
    if (suggestions.length > 0 && value && value.trim().length >= 1) {
      setIsDropdownOpen(true);
      updateDropdownPosition();
    }
  }, [suggestions, value]);

  const showDropdown =
    isDropdownOpen && suggestions.length > 0 && value?.trim()?.length >= 1;

  const updateDropdownPosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropdownHeight = 320;

      const positionBelow =
        spaceBelow > dropdownHeight || spaceBelow > spaceAbove;

      setDropdownPosition({
        top: positionBelow ? rect.bottom + 4 : rect.top - dropdownHeight - 4,
        left: rect.left,
        width: Math.max(rect.width, 200),
      });
    }
  };

  useEffect(() => {
    if (showDropdown) {
      updateDropdownPosition();
      let rafId;
      let ticking = false;

      const handleScroll = () => {
        if (!ticking) {
          ticking = true;
          rafId = requestAnimationFrame(() => {
            updateDropdownPosition();
            ticking = false;
          });
        }
      };

      const handleResize = () => {
        if (rafId) cancelAnimationFrame(rafId);
        updateDropdownPosition();
      };

      window.addEventListener("scroll", handleScroll, {
        passive: true,
        capture: true,
      });
      document.addEventListener("scroll", handleScroll, {
        passive: true,
        capture: true,
      });
      window.addEventListener("resize", handleResize, { passive: true });

      const intervalId = setInterval(updateDropdownPosition, 100);

      return () => {
        if (rafId) cancelAnimationFrame(rafId);
        clearInterval(intervalId);
        window.removeEventListener("scroll", handleScroll, { capture: true });
        document.removeEventListener("scroll", handleScroll, { capture: true });
        window.removeEventListener("resize", handleResize);
      };
    }
  }, [showDropdown, value]);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
      if (requestTimeoutRef.current) {
        clearTimeout(requestTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const closeDropdown = (delay = 0) => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    blurTimeoutRef.current = setTimeout(() => {
      setIsDropdownOpen(false);
      setActiveIndex(-1);
    }, delay);
  };

  const handleInputChange = (event) => {
    const newValue = event.target.value;
    onChange?.(newValue);
    setActiveIndex(-1);

    if (newValue && newValue.trim().length >= 1) {
      setIsDropdownOpen(true);
    } else {
      setIsDropdownOpen(false);
      setApiSuggestions([]);
    }

    setTimeout(() => updateDropdownPosition(), 0);
  };

  const handleFocus = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    if (!disabled) {
      if (value && value.trim().length >= 1 && suggestions.length > 0) {
        setIsDropdownOpen(true);
        updateDropdownPosition();
      } else if (value && value.trim().length >= 2) {
        setIsDropdownOpen(true);
        getPlaceSuggestions(value);
      }
    }
  };

  const handleBlur = (event) => {
    const relatedTarget = event.relatedTarget || document.activeElement;
    const dropdown = document.querySelector("[data-location-dropdown]");

    if (dropdown && relatedTarget && dropdown.contains(relatedTarget)) {
      return;
    }

    closeDropdown(150);
  };

  const handleSelectSuggestion = (suggestion) => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    onChange?.(suggestion);
    setActiveIndex(-1);
    setIsDropdownOpen(false);
    setApiSuggestions([]);
  };

  const handleKeyDown = (event) => {
    if (event.key === "ArrowDown" && suggestions.length > 0) {
      event.preventDefault();
      setIsDropdownOpen(true);
      setActiveIndex((prev) => {
        const nextIndex = prev + 1;
        if (nextIndex >= suggestions.length) return 0;
        return nextIndex;
      });
      return;
    }

    if (event.key === "ArrowUp" && suggestions.length > 0) {
      event.preventDefault();
      setIsDropdownOpen(true);
      setActiveIndex((prev) => {
        const nextIndex = prev - 1;
        if (nextIndex < 0) return suggestions.length - 1;
        return nextIndex;
      });
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        handleSelectSuggestion(suggestions[activeIndex]);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeDropdown();
    }
  };

  const dropdownContent = showDropdown && (
    <div
      data-location-dropdown
      className="fixed overflow-hidden rounded-xl border bg-white shadow-xl"
      style={{
        top: `${dropdownPosition.top}px`,
        left: `${dropdownPosition.left}px`,
        width: `${Math.max(dropdownPosition.width, 200)}px`,
        maxWidth: "calc(100vw - 2rem)",
        zIndex: 9999,
        borderColor: "#E8E8E8",
        maxHeight: "320px",
      }}
      onMouseDown={(e) => {
        e.preventDefault();
      }}
    >
      <ul
        className="overflow-y-auto overscroll-contain"
        style={{
          maxHeight: "320px",
          scrollBehavior: "smooth",
        }}
      >
        {suggestions.map((suggestion, index) => {
          const isLocal = localSuggestions.includes(suggestion);
          return (
            <li
              key={`${suggestion}-${index}`}
              onMouseDown={(event) => {
                event.preventDefault();
                handleSelectSuggestion(suggestion);
              }}
              onMouseEnter={() => setActiveIndex(index)}
              className={clsx(
                "flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors cursor-pointer"
              )}
              style={
                index === activeIndex
                  ? {
                      backgroundColor: "rgba(208, 196, 226, 0.3)",
                      color: "#2F3C96",
                    }
                  : {
                      color: "#787878",
                    }
              }
            >
              <MapPin
                size={14}
                style={{
                  color: index === activeIndex ? "#2F3C96" : "#D0C4E2",
                  flexShrink: 0,
                }}
              />
              <span className="truncate flex-1">{suggestion}</span>
              {index === activeIndex && (
                <span
                  className="text-[10px] font-semibold uppercase tracking-wide shrink-0"
                  style={{ color: "#2F3C96" }}
                >
                  Enter ↵
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {isLoading && (
        <div
          className="flex items-center justify-center gap-2 px-3 py-2 border-t"
          style={{ borderColor: "#E8E8E8" }}
        >
          <Loader2
            size={12}
            className="animate-spin"
            style={{ color: "#2F3C96" }}
          />
          <span className="text-xs" style={{ color: "#787878" }}>
            Finding more...
          </span>
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className={clsx("relative", className)}>
        <div className="relative">
          <MapPin
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "#D0C4E2" }}
          />
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            name={name}
            className={clsx(
              "w-full rounded-xl border bg-white pl-9 pr-3 py-2.5 text-sm transition-all focus:outline-none focus:ring-2",
              inputClassName
            )}
            style={{
              borderColor: "#E8E8E8",
              color: "#2F3C96",
              "--tw-ring-color": "#D0C4E2",
            }}
            autoComplete="off"
            {...rest}
          />
        </div>
      </div>
      {typeof document !== "undefined" &&
        createPortal(dropdownContent, document.body)}
    </>
  );
}
