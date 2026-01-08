import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  className = "",
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const selectRef = useRef(null);
  const dropdownRef = useRef(null);
  const blurTimeoutRef = useRef(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Update dropdown position
  const updateDropdownPosition = () => {
    if (selectRef.current) {
      const rect = selectRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropdownHeight = 240;

      const positionBelow =
        spaceBelow > dropdownHeight || spaceBelow > spaceAbove;

      // Calculate minimum width based on longest option text
      const minWidth = Math.max(
        rect.width,
        ...options.map((opt) => {
          // Estimate text width (rough calculation: ~8px per character for small text)
          return Math.min(opt.label.length * 8 + 80, 500); // Max 500px, 80px padding for icons/spacing
        })
      );

      setDropdownPosition({
        top: positionBelow ? rect.bottom + 4 : rect.top - dropdownHeight - 4,
        left: rect.left,
        width: Math.max(rect.width, minWidth),
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
      const handleScroll = () => updateDropdownPosition();
      const handleResize = () => updateDropdownPosition();
      window.addEventListener("scroll", handleScroll, true);
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("scroll", handleScroll, true);
        window.removeEventListener("resize", handleResize);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        selectRef.current &&
        !selectRef.current.contains(event.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        closeDropdown();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const closeDropdown = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    setIsOpen(false);
  };

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    closeDropdown();
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleToggle();
      return;
    }

    if (e.key === "Escape") {
      closeDropdown();
      return;
    }

    if (!isOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const currentIndex = options.findIndex((opt) => opt.value === value);
      const nextIndex =
        currentIndex < options.length - 1 ? currentIndex + 1 : 0;
      onChange(options[nextIndex].value);
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      const currentIndex = options.findIndex((opt) => opt.value === value);
      const prevIndex =
        currentIndex > 0 ? currentIndex - 1 : options.length - 1;
      onChange(options[prevIndex].value);
      return;
    }
  };

  const dropdownContent = isOpen && (
    <div
      ref={dropdownRef}
      data-custom-select-dropdown
      className="fixed overflow-hidden rounded-lg border bg-white shadow-xl z-[10000]"
      style={{
        top: `${dropdownPosition.top}px`,
        left: `${dropdownPosition.left}px`,
        width: `${dropdownPosition.width}px`,
        minWidth: "200px",
        maxWidth: "calc(100vw - 2rem)",
        maxHeight: "240px",
        borderColor: "rgba(208, 196, 226, 0.3)",
        overflowX: "hidden",
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <ul
        className="overflow-y-auto overflow-x-hidden overscroll-contain"
        style={{
          maxHeight: "240px",
          scrollBehavior: "smooth",
        }}
      >
        {options.map((option, index) => {
          const isSelected = option.value === value;
          return (
            <li
              key={option.value}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(option.value);
              }}
              className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm transition-colors cursor-pointer min-w-0"
              style={
                isSelected
                  ? {
                      backgroundColor: "rgba(232, 224, 239, 0.6)",
                      color: "#2F3C96",
                    }
                  : {
                      color: "#787878",
                    }
              }
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor =
                    "rgba(245, 242, 248, 1)";
                  e.currentTarget.style.color = "#2F3C96";
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "#787878";
                }
              }}
            >
              <span className="flex-1 min-w-0 whitespace-normal break-words">{option.label}</span>
              {isSelected && (
                <Check
                  className="w-4 h-4 shrink-0"
                  style={{ color: "#2F3C96" }}
                />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );

  return (
    <>
      <div
        ref={selectRef}
        className={`relative ${className}`}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div
          className={`w-full px-3 py-2 pr-8 border rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all cursor-pointer ${
            disabled
              ? "opacity-50 cursor-not-allowed"
              : "hover:border-indigo-300"
          } ${
            isOpen
              ? "border-indigo-500 ring-2 ring-indigo-500"
              : "border-slate-300"
          }`}
        >
          <span className="block truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown
          className={`absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          style={{ color: "#787878" }}
        />
      </div>
      {typeof document !== "undefined" &&
        createPortal(dropdownContent, document.body)}
    </>
  );
}

