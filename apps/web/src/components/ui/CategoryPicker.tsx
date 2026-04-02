import { useState } from "react";
import { Modal } from "@/components/ui/Modal";

interface CategoryOption {
  id: string;
  name: string;
  icon: string;
  color: string;
  sub_categories?: Array<{ id: string; name: string }>;
}

interface CategoryPickerProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryOption[];
  selectedId?: string;
  onSelect: (categoryId: string, subCategoryId?: string) => void;
  allowNone?: boolean;
}

export function CategoryPicker({
  isOpen,
  onClose,
  categories,
  selectedId,
  onSelect,
  allowNone = true,
}: CategoryPickerProps) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.sub_categories?.some((s) =>
        s.name.toLowerCase().includes(search.toLowerCase())
      )
  );

  function handleSelect(catId: string, subId?: string) {
    onSelect(catId, subId);
    setSearch("");
    setExpandedId(null);
    onClose();
  }

  function handleToggle(catId: string) {
    const cat = categories.find((c) => c.id === catId);
    if (cat?.sub_categories && cat.sub_categories.length > 0) {
      setExpandedId(expandedId === catId ? null : catId);
    } else {
      handleSelect(catId);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pilih Kategori">
      <div className="flex flex-col">
        {/* Search */}
        <div className="px-4 pt-3 pb-2 sticky top-0 bg-white dark:bg-[#1C1D1A] z-10">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E9B98] dark:text-[#4A4948]"
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kategori..."
              className={[
                "w-full pl-9 pr-3 py-2.5 rounded-[10px] text-[13px]",
                "bg-[#F0EEE9] dark:bg-[#242522]",
                "border border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]",
                "text-[#1A1917] dark:text-[#F0EEE9]",
                "placeholder:text-[#9E9B98] dark:placeholder:text-[#4A4948]",
                "focus:outline-none focus:border-[var(--accent)]",
              ].join(" ")}
            />
          </div>
        </div>

        {/* No category option */}
        {allowNone && (
          <button
            type="button"
            onClick={() => handleSelect("")}
            className={[
              "flex items-center gap-3 px-4 py-3 w-full text-left",
              "border-b border-[rgba(0,0,0,0.05)] dark:border-[rgba(255,255,255,0.05)]",
              "hover:bg-[#F0EEE9] dark:hover:bg-[#242522] transition-colors",
              !selectedId ? "bg-[#F0EEE9]/60 dark:bg-[#242522]/60" : "",
            ].join(" ")}
          >
            <div className="w-9 h-9 rounded-[10px] bg-[#E8E6E0] dark:bg-[#333432] flex items-center justify-center text-[16px]">
              ✕
            </div>
            <span className="text-[13px] font-medium text-[#6B6864] dark:text-[#9E9B96]">
              Tanpa kategori
            </span>
          </button>
        )}

        {/* Category list */}
        <div className="pb-4">
          {filtered.map((cat) => {
            const isExpanded = expandedId === cat.id;
            const hasSubs = cat.sub_categories && cat.sub_categories.length > 0;
            const isSelected = cat.id === selectedId;

            return (
              <div key={cat.id}>
                <button
                  type="button"
                  onClick={() => handleToggle(cat.id)}
                  className={[
                    "flex items-center gap-3 px-4 py-3 w-full text-left",
                    "border-b border-[rgba(0,0,0,0.04)] dark:border-[rgba(255,255,255,0.04)]",
                    "hover:bg-[#F0EEE9] dark:hover:bg-[#242522] transition-colors",
                    "active:bg-[#E8E6E0] dark:active:bg-[#2C2D2A]",
                    isSelected ? "bg-[#F0EEE9]/60 dark:bg-[#242522]/60" : "",
                  ].join(" ")}
                >
                  {/* Icon */}
                  <div
                    className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[16px] shrink-0"
                    style={{ backgroundColor: cat.color ? `${cat.color}1A` : "rgba(46,125,90,0.1)" }}
                  >
                    {cat.icon}
                  </div>

                  {/* Name */}
                  <span className="flex-1 text-[13px] font-semibold text-[#1A1917] dark:text-[#F0EEE9]">
                    {cat.name}
                  </span>

                  {/* Expand arrow / check */}
                  {isSelected && !hasSubs ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : hasSubs ? (
                    <svg
                      width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      className={[
                        "text-[#9E9B98] dark:text-[#4A4948] transition-transform duration-200",
                        isExpanded ? "rotate-180" : "",
                      ].join(" ")}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  ) : null}
                </button>

                {/* Sub-categories */}
                {isExpanded && hasSubs && (
                  <div className="bg-[#F7F6F3] dark:bg-[#161715]">
                    {/* Select parent without sub */}
                    <button
                      type="button"
                      onClick={() => handleSelect(cat.id)}
                      className={[
                        "flex items-center gap-3 pl-[60px] pr-4 py-2.5 w-full text-left",
                        "border-b border-[rgba(0,0,0,0.04)] dark:border-[rgba(255,255,255,0.04)]",
                        "hover:bg-[#EAE8E3] dark:hover:bg-[#1E1F1C] transition-colors",
                      ].join(" ")}
                    >
                      <span className="text-[12px] font-medium text-[#6B6864] dark:text-[#9E9B96]">
                        {cat.name} (semua)
                      </span>
                    </button>

                    {cat.sub_categories!.map((sub) => (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => handleSelect(cat.id, sub.id)}
                        className={[
                          "flex items-center gap-3 pl-[60px] pr-4 py-2.5 w-full text-left",
                          "border-b border-[rgba(0,0,0,0.03)] dark:border-[rgba(255,255,255,0.03)]",
                          "hover:bg-[#EAE8E3] dark:hover:bg-[#1E1F1C] transition-colors",
                        ].join(" ")}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-[#9E9B98] dark:bg-[#4A4948]" />
                        <span className="text-[12px] font-medium text-[#1A1917] dark:text-[#F0EEE9]">
                          {sub.name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-[13px] text-[#9E9B98] dark:text-[#4A4948]">
                Kategori tidak ditemukan
              </p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
