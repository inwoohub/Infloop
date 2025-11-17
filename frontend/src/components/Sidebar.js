// frontend/src/components/Sidebar.js
import React, { useState } from "react";
import "./Sidebar.css";

function Sidebar({ onStatusFilterChange, categoryFilter, onCategoryFilterChange }) {
  const [statusFilters, setStatusFilters] = useState({
    요청: true,
    진행: true,
    피드백: true,
    완료: true,
  });

  const handleStatusChange = (key) => (e) => {
    const newFilters = { ...statusFilters, [key]: e.target.checked };
    setStatusFilters(newFilters);
    onStatusFilterChange(newFilters);
  };

  return (
    <div className="Sidebar">
      <h3>업무 구분</h3>
      <ul>
        <li>
          <input
            type="radio"
            name="category"
            value="내 업무"
            checked={categoryFilter === "내 업무"}
            onChange={(e) => onCategoryFilterChange(e.target.value)}
          /> 내 업무
        </li>
        <li>
          <input
            type="radio"
            name="category"
            value="전체"
            checked={categoryFilter === "전체"}
            onChange={(e) => onCategoryFilterChange(e.target.value)}
          /> 전체
        </li>
      </ul>

      <h3>상태</h3>
      <ul>
        <li>
          <input
            type="checkbox"
            checked={statusFilters.요청}
            onChange={handleStatusChange("요청")}
          /> 요청
        </li>
        <li>
          <input
            type="checkbox"
            checked={statusFilters.진행}
            onChange={handleStatusChange("진행")}
          /> 진행
        </li>
        <li>
          <input
            type="checkbox"
            checked={statusFilters.피드백}
            onChange={handleStatusChange("피드백")}
          /> 피드백
        </li>
        <li>
          <input
            type="checkbox"
            checked={statusFilters.완료}
            onChange={handleStatusChange("완료")}
          /> 완료
        </li>
      </ul>
    </div>
  );
}

export default Sidebar;
