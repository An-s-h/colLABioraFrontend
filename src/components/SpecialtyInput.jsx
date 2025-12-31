import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { Info, X } from "lucide-react";
import specialtyDataset from "../data/specialtyDataset.json";

export default function SpecialtyInput({
  value,
  onChange,
  placeholder = "e.g. Oncology, Cardiology",
  className = "",
  inputClassName = "",
  maxSuggestions = 8,
  disabled = false,
  ...rest
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showDefinition, setShowDefinition] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const blurTimeoutRef = useRef(null);
  const inputRef = useRef(null);
  const definitionTooltipRef = useRef(null);

  // Filter suggestions based on input value
  const suggestions = useMemo(() => {
    if (!value || !value.trim()) return [];
    
    const searchTerm = value.toLowerCase().trim();
    const filtered = specialtyDataset.filter((item) => {
      const displayLower = item.displayText.toLowerCase();
      const classificationLower = item.classification.toLowerCase();
      const specializationLower = item.specialization.toLowerCase();
      
      return (
        displayLower.includes(searchTerm) ||
        classificationLower.includes(searchTerm) ||
        specializationLower.includes(searchTerm)
      );
    });

    // Sort by relevance (exact matches first, then by position of match)
    return filtered
      .sort((a, b) => {
        const aDisplay = a.displayText.toLowerCase();
        const bDisplay = b.displayText.toLowerCase();
        const aStarts = aDisplay.startsWith(searchTerm);
        const bStarts = bDisplay.startsWith(searchTerm);
        
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        
        return aDisplay.localeCompare(bDisplay);
      })
      .slice(0, maxSuggestions);
  }, [value, maxSuggestions]);

  const showDropdown =
    isDropdownOpen && suggestions.length > 0 && value?.trim()?.length > 0;

  // Update dropdown position
  const updateDropdownPosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropdownHeight = 240;
      const positionBelow = spaceBelow > dropdownHeight || spaceBelow > spaceAbove;

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

      window.addEventListener("scroll", handleScroll, { passive: true, capture: true });
      document.addEventListener("scroll", handleScroll, { passive: true, capture: true });
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
    };
  }, []);

  // Position tooltip when it's shown
  useEffect(() => {
    if (!showDefinition || !definitionTooltipRef.current) return;

    const positionTooltip = () => {
      const tooltip = definitionTooltipRef.current;
      if (!tooltip) return;

      // Find the info button that was clicked
      const infoButtons = document.querySelectorAll('[data-specialty-dropdown] button[type="button"]');
      let iconRect = null;
      
      infoButtons.forEach((btn) => {
        const listItem = btn.closest('li');
        if (listItem) {
          const text = listItem.querySelector('span').textContent;
          if (text === showDefinition.displayText) {
            iconRect = btn.getBoundingClientRect();
          }
        }
      });

      if (iconRect) {
        requestAnimationFrame(() => {
          const tooltipRect = tooltip.getBoundingClientRect();
          const spaceBelow = window.innerHeight - iconRect.bottom;
          const spaceAbove = iconRect.top;
          const tooltipHeight = tooltipRect.height || 200;
          
          const positionBelow = spaceBelow > tooltipHeight || spaceBelow > spaceAbove;
          
          tooltip.style.top = positionBelow
            ? `${iconRect.bottom + 8}px`
            : `${iconRect.top - tooltipHeight - 8}px`;
          tooltip.style.left = `${Math.min(iconRect.left, window.innerWidth - 400)}px`;
          tooltip.style.maxWidth = `${Math.min(400, window.innerWidth - iconRect.left - 16)}px`;
        });
      }
    };

    // Position after a short delay to ensure DOM is ready
    const timeoutId = setTimeout(positionTooltip, 10);
    
    // Also position on scroll/resize
    window.addEventListener('scroll', positionTooltip, { passive: true });
    window.addEventListener('resize', positionTooltip, { passive: true });

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('scroll', positionTooltip);
      window.removeEventListener('resize', positionTooltip);
    };
  }, [showDefinition]);

  // Close tooltip when clicking outside
  useEffect(() => {
    if (!showDefinition) return;

    const handleClickOutside = (event) => {
      const tooltip = document.querySelector('[data-definition-tooltip]');
      const dropdown = document.querySelector('[data-specialty-dropdown]');
      
      // Don't close if clicking on info button
      const clickedButton = event.target.closest('button[type="button"]');
      if (clickedButton && clickedButton.querySelector('svg')) {
        return;
      }
      
      if (
        tooltip &&
        !tooltip.contains(event.target) &&
        dropdown &&
        !dropdown.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setShowDefinition(null);
      }
    };

    // Use a small delay to avoid closing immediately when clicking the info button
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDefinition]);

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
    onChange?.(event.target.value);
    setActiveIndex(-1);
    if (!isDropdownOpen) {
      setIsDropdownOpen(true);
    }
    setTimeout(() => updateDropdownPosition(), 0);
  };

  const handleFocus = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    if (!disabled) {
      setIsDropdownOpen(true);
      updateDropdownPosition();
    }
  };

  const handleBlur = (event) => {
    // Don't close if clicking on info button or tooltip
    const relatedTarget = event.relatedTarget || document.activeElement;
    const dropdown = document.querySelector('[data-specialty-dropdown]');
    const tooltip = document.querySelector('[data-definition-tooltip]');
    
    // Check if clicking on info button
    if (relatedTarget && relatedTarget.closest('button[type="button"]')) {
      const button = relatedTarget.closest('button[type="button"]');
      if (button && button.querySelector('svg')) {
        // This is likely the info button, don't close
        return;
      }
    }
    
    if (
      (dropdown && relatedTarget && dropdown.contains(relatedTarget)) ||
      (tooltip && relatedTarget && tooltip.contains(relatedTarget))
    ) {
      return;
    }
    
    // Only close dropdown, keep tooltip open if it's showing
    closeDropdown(150);
  };

  const handleSelectSuggestion = (suggestion) => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    onChange?.(suggestion.displayText);
    setActiveIndex(-1);
    setIsDropdownOpen(false);
    setShowDefinition(null);
  };

  const handleInfoClick = (e, suggestion) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Prevent input blur
    if (inputRef.current) {
      inputRef.current.focus();
    }
    
    // If clicking the same suggestion, toggle it off
    if (showDefinition && showDefinition.displayText === suggestion.displayText) {
      setShowDefinition(null);
      return;
    }
    
    // Set the suggestion - positioning will be handled by useEffect
    setShowDefinition(suggestion);
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
      setShowDefinition(null);
    }
  };

  const dropdownContent = showDropdown && (
    <div
      data-specialty-dropdown
      className="fixed overflow-hidden rounded-lg border bg-white shadow-xl z-[9999]"
      style={{
        top: `${dropdownPosition.top}px`,
        left: `${dropdownPosition.left}px`,
        width: `${Math.max(dropdownPosition.width, 200)}px`,
        maxWidth: "calc(100vw - 2rem)",
        borderColor: "#E8E8E8",
        maxHeight: "240px",
      }}
      onMouseDown={(e) => {
        e.preventDefault();
      }}
    >
      <ul
        className="overflow-y-auto overscroll-contain"
        style={{
          maxHeight: "240px",
          scrollBehavior: "smooth",
        }}
      >
        {suggestions.map((suggestion, index) => (
          <li
            key={`${suggestion.displayText}-${index}`}
            onMouseDown={(event) => {
              event.preventDefault();
              handleSelectSuggestion(suggestion);
            }}
            onMouseEnter={() => setActiveIndex(index)}
            className={clsx(
              "flex items-center justify-between gap-2 px-3 py-2 text-sm transition-colors cursor-pointer"
            )}
            style={
              index === activeIndex
                ? {
                    backgroundColor: "rgba(245, 242, 248, 1)",
                    color: "#2F3C96",
                  }
                : {
                    color: "#787878",
                  }
            }
          >
            <span className="truncate flex-1">{suggestion.displayText}</span>
            <button
              type="button"
              onClick={(e) => handleInfoClick(e, suggestion)}
              className="shrink-0 p-1 rounded hover:bg-white/50 transition-colors"
              style={{ color: "#2F3C96" }}
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onMouseUp={(e) => {
                e.stopPropagation();
              }}
            >
              <Info size={14} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  const definitionTooltip = showDefinition && (
    <div
      ref={definitionTooltipRef}
      data-definition-tooltip
      className="fixed bg-white rounded-lg border shadow-xl p-3 z-[10000]"
      style={{
        borderColor: "#D0C4E2",
        boxShadow: "0 10px 40px rgba(208, 196, 226, 0.3)",
        maxWidth: "400px",
        minWidth: "250px",
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4
          className="font-semibold text-sm"
          style={{ color: "#2F3C96" }}
        >
          {showDefinition.displayText}
        </h4>
        <button
          type="button"
          onClick={() => setShowDefinition(null)}
          className="shrink-0 p-0.5 rounded hover:bg-gray-100 transition-colors"
          style={{ color: "#787878" }}
        >
          <X size={14} />
        </button>
      </div>
      <p
        className="text-xs leading-relaxed"
        style={{ color: "#787878" }}
      >
        {showDefinition.definition}
      </p>
    </div>
  );

  return (
    <>
      <div className={clsx("relative", className)}>
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
          className={clsx(
            "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
            inputClassName
          )}
          autoComplete="off"
          {...rest}
        />
      </div>
      {typeof document !== "undefined" && createPortal(dropdownContent, document.body)}
      {typeof document !== "undefined" &&
        showDefinition &&
        createPortal(definitionTooltip, document.body)}
    </>
  );
}

