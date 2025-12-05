import { useState } from "react";
import { SearchFilter } from "../SearchFilter";

export default function SearchFilterExample() {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name-asc");
  const [rating, setRating] = useState<number | null>(null);
  const [dept, setDept] = useState("all");

  return (
    <div className="max-w-2xl">
      <SearchFilter
        searchQuery={search}
        onSearchChange={setSearch}
        sortBy={sort}
        onSortChange={setSort}
        filterRating={rating}
        onFilterRatingChange={setRating}
        departments={["Computer Science", "Electronics", "Mechanical"]}
        selectedDepartment={dept}
        onDepartmentChange={setDept}
        placeholder="Search teachers by name or subject..."
      />
    </div>
  );
}
