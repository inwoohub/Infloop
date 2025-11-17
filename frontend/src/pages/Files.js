// frontend/src/pages/TaskPage.js

import React from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import Topbarst from "../components/Topbarst";
import "./TaskPage.css";
import "./Files.css";







function Files() {
  return (
    <div className="FilesPage">
      <div className="Files_ContentContainer">
        <Sidebar />
        <div className="Files_MainContent">
          <Topbarst />
          <Topbar />
        </div>
      </div>
    </div>
  );
}

export default Files;