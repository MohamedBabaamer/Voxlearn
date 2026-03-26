import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Series, Course } from "../types";
import {
  getAllSeries,
  getAllCourses,
  createSeries,
  updateSeries,
  deleteSeries,
} from "../services/database.service";

const AdminSeries: React.FC = () => {
  const navigate = useNavigate();
  const [series, setSeries] = useState<Series[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSeries, setEditingSeries] = useState<Series | null>(null);
  const [showWarning, setShowWarning] = useState(true);
  const [notification, setNotification] = useState<{
    id?: string;
    type: "success" | "error";
    message: string;
  } | null>(null);
  
  // New state for enhanced features
  const [sortColumn, setSortColumn] = useState<"type" | "title" | "course">("title");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hasFilter, setHasFilter] = useState(false);

  const [formData, setFormData] = useState({
    courseId: "",
    title: "",
    titleMode: "auto" as "auto" | "manual", // Toggle between auto-generate and manual
    type: "TD" as "TD" | "TP" | "Exam",
    driveUrl: "",
    solutionUrl: "",
    hasSolution: false,
    // New fields for auto-generation
    language: "fr" as "fr" | "en",
    seriesNumber: "1",
    chapterTitle: "", // Optional chapter/topic title
    academicYear: "", // Optional year
    examType: "Final" as "Final" | "TD" | "TP" | "Rattrapage" | "Devoir",
  });

  // const [showMdModal, setShowMdModal] = useState<string | null>(null);

  // Format title by replacing _ and - with spaces
  const formatTitle = (title: string): string => {
    return title.replace(/[_-]/g, " ");
  };

  // Auto-generate title based on type and inputs
  const generateTitle = (): string => {
    const {
      type,
      language,
      seriesNumber,
      chapterTitle,
      academicYear,
      examType,
    } = formData;

    if (type === "Exam") {
      // Examen_TD_2024-2025 (French) or Exam_TW_2024-2025 (English)
      const examPrefix = language === "fr" ? "Examen" : "Exam";
      const examTypeMapped =
        examType === "TD" && language === "en"
          ? "TW"
          : examType === "TP" && language === "en"
            ? "PW"
            : examType;
      return `${examPrefix}_${examTypeMapped}_${academicYear}`;
    } else {
      // TD/TP with optional chapter title and year
      const typePrefix =
        type === "TD" && language === "en"
          ? "TW"
          : type === "TP" && language === "en"
            ? "PW"
            : type;

      // Build parts: TD1, optional chapter, optional year
      const parts = [`${typePrefix}${seriesNumber}`];

      if (chapterTitle.trim()) {
        parts.push(chapterTitle.trim());
      }

      if (academicYear.trim()) {
        parts.push(academicYear.trim());
      }

      // Join with " : " separator
      return parts.join(" : ");
    }
  };

  // Handle year change and auto-format as YYYY-YYYY+1
  const handleYearChange = (year: number) => {
    const nextYear = year + 1;
    const formattedYear = `${year}-${nextYear}`;
    setFormData({ ...formData, academicYear: formattedYear });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    console.log("🔄 AdminSeries: Starting to fetch data...");
    setLoading(true);
    try {
      console.log("📡 AdminSeries: Calling getAllSeries and getAllCourses...");
      const [seriesData, coursesData] = await Promise.all([
        getAllSeries(),
        getAllCourses(),
      ]);
      console.log(
        "✅ AdminSeries: Series fetched:",
        seriesData.length,
        "items",
      );
      console.log(
        "✅ AdminSeries: Courses fetched:",
        coursesData.length,
        "items",
      );
      setSeries(seriesData);
      setCourses(coursesData);
      if (coursesData.length > 0 && !formData.courseId) {
        setFormData((prev) => ({ ...prev, courseId: coursesData[0].id }));
      }
    } catch (error: any) {
      console.error("❌ AdminSeries: Error fetching data:", error);
      console.error("❌ Error message:", error.message);
      console.error("❌ Error code:", error.code);
      setNotification({
        type: "error",
        message: `Failed to load data: ${error.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCourseId, filterType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate manual title
    if (formData.titleMode === "manual" && !formData.title.trim()) {
      setNotification({
        type: "error",
        message: "Please fill out the title field when using manual mode!",
      });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    try {
      const selectedCourse = courses.find((c) => c.id === formData.courseId);

      const seriesData: any = {
        courseId: formData.courseId,
        title: formatTitle(
          formData.titleMode === "auto" ? generateTitle() : formData.title,
        ), // Use auto or manual title
        type: formData.type,
        driveUrl: formData.driveUrl,
        hasSolution: formData.hasSolution,
        date: new Date().toISOString(), // Add current date
      };

      if (formData.hasSolution && formData.solutionUrl) {
        seriesData.solutionUrl = formData.solutionUrl;
      }

      if (selectedCourse?.academicYear) {
        seriesData.academicYear = selectedCourse.academicYear;
      }

      if (editingSeries) {
        await updateSeries(editingSeries.id!, seriesData);
        setNotification({ id: String(Date.now()), type: "success", message: "Series updated successfully!" });
      } else {
        await createSeries(seriesData);
        setNotification({ id: String(Date.now()), type: "success", message: "Series created successfully!" });
      }

      handleCloseModal();
      await fetchData(); // Refresh data after success
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      console.error("Error saving series:", error);
      setNotification({ id: String(Date.now()), type: "error", message: error.message || "Failed to save series" });
    }
  };

  const handleEdit = (item: Series) => {
    setEditingSeries(item);
    setFormData({
      courseId: item.courseId || "",
      title: item.title || "",
      titleMode: "auto", // Always default to auto mode on edit for safety
      type: item.type || "TD",
      driveUrl: item.driveUrl || "",
      solutionUrl: item.solutionUrl || "",
      hasSolution: !!item.hasSolution,
      language: item.language || "fr",
      seriesNumber: item.seriesNumber || "1",
      chapterTitle: item.chapterTitle || "",
      academicYear: item.academicYear || "",
      examType: item.examType || "Final",
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this series?")) return;

    try {
      await deleteSeries(id);
      setNotification({
        type: "success",
        message: "Series deleted successfully!",
      });
      await fetchData(); // Refresh data after delete
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error("Error deleting series:", error);
      setNotification({ type: "error", message: "Failed to delete series" });
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSeries(null);
    // Auto-select filtered course if one is selected, otherwise use first course
    const defaultCourseId =
      selectedCourseId !== "all" ? selectedCourseId : courses[0]?.id || "";
    setFormData({
      courseId: defaultCourseId,
      title: "",
      titleMode: "auto",
      type: "TD",
      driveUrl: "",
      solutionUrl: "",
      hasSolution: false,
      language: "fr",
      seriesNumber: "1",
      chapterTitle: "",
      academicYear: "",
      examType: "Final",
    });
  };

  const filteredSeries = series
    .filter((item) => {
      const matchCourse =
        selectedCourseId === "all" || item.courseId === selectedCourseId;
      const matchType = filterType === "All" || item.type === filterType;
      let matchesSearch = true;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const course = courses.find((c) => c.id === item.courseId);
        const code = course?.code?.toLowerCase() || "";
        const prof = (course?.professor || "").toLowerCase();
        const title = (item.title || "").toLowerCase();
        matchesSearch = code.includes(q) || prof.includes(q) || title.includes(q);
      }
      return matchCourse && matchType && matchesSearch;
    })
    .sort((a, b) => {
      let compareA: string = "";
      let compareB: string = "";
      
      if (sortColumn === "type") {
        compareA = a.type;
        compareB = b.type;
      } else if (sortColumn === "course") {
        const courseA = courses.find((c) => c.id === a.courseId);
        const courseB = courses.find((c) => c.id === b.courseId);
        compareA = courseA?.code || "";
        compareB = courseB?.code || "";
      } else {
        compareA = a.title.toLowerCase();
        compareB = b.title.toLowerCase();
      }
      
      const result = compareA.localeCompare(compareB);
      return sortDirection === "asc" ? result : -result;
    });

  const totalPages = Math.ceil(filteredSeries.length / itemsPerPage);
  const paginatedSeries = filteredSeries.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (column: "type" | "title" | "course") => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(paginatedSeries.map((item) => item.id!)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const confirmed = window.confirm(
      `Delete ${selectedIds.size} selected series? This cannot be undone!`
    );
    if (!confirmed) return;

    try {
      await Promise.all(
        Array.from(selectedIds).map((id: string) => deleteSeries(id))
      );
      setNotification({
        type: "success",
        message: `${selectedIds.size} series deleted successfully!`,
      });
      setSelectedIds(new Set());
      await fetchData();
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error("Error bulk deleting series:", error);
      setNotification({
        type: "error",
        message: "Failed to delete some series",
      });
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "TD":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
      case "TP":
        return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300";
      case "Exam":
        return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300";
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 z-50 flex items-center justify-center">
        <div className="text-center space-y-8 p-8">
          {/* Animated Logo/Icon */}
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="relative bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-2xl border border-slate-200 dark:border-slate-700">
              <span className="material-symbols-outlined text-7xl text-primary animate-bounce">
                assignment
              </span>
            </div>
          </div>

          {/* Loading Rings */}
          <div className="flex justify-center items-center gap-3">
            <div className="relative w-20 h-20">
              {/* Outer spinning ring */}
              <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-700/50 rounded-full"></div>
              <div
                className="absolute inset-0 border-4 border-primary dark:border-primary/80 border-t-transparent rounded-full animate-spin"
                style={{ animationDuration: "0.6s" }}
              ></div>

              {/* Inner spinning ring (opposite direction) */}
              <div className="absolute inset-2 border-4 border-slate-100 dark:border-slate-800 rounded-full"></div>
              <div
                className="absolute inset-2 border-4 border-primary/50 dark:border-primary/30 border-b-transparent rounded-full animate-spin"
                style={{
                  animationDirection: "reverse",
                  animationDuration: "0.5s",
                }}
              ></div>
            </div>
          </div>

          {/* Loading Text */}
          <div className="space-y-3">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Loading Series Dashboard
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              Preparing your content...
            </p>

            {/* Animated Dots */}
            <div className="flex justify-center gap-2 pt-2">
              <div
                className="w-2 h-2 bg-primary dark:bg-primary/80 rounded-full animate-bounce"
                style={{ animationDelay: "0ms" }}
              ></div>
              <div
                className="w-2 h-2 bg-primary dark:bg-primary/80 rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              ></div>
              <div
                className="w-2 h-2 bg-primary dark:bg-primary/80 rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              ></div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-64 mx-auto">
            <div className="h-1.5 bg-slate-200 dark:bg-slate-700/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/60 dark:from-primary/80 dark:to-primary/40 rounded-full animate-[shimmer_0.8s_ease-in-out_infinite]"
                style={{
                  width: "100%",
                  animation: "shimmer 0.8s ease-in-out infinite",
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Shimmer Animation Keyframes */}
        <style>{`
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/admin/modules')}
            className="flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors mb-2"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to Modules
          </button>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Manage Series
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage TD, TP, and Exam exercises with solutions
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700/50 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              Filter by Course
            </label>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-white"
            >
              <option value="all">All Courses</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} - {course.name} ({course.level}) - Prof.{" "}
                  {course.professor}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full md:w-64">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              Filter by Type
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-white"
            >
              <option value="All">All Types</option>
              <option value="TD">TD (Travaux Dirigés)</option>
              <option value="TP">TP (Travaux Pratiques)</option>
              <option value="Exam">Exam</option>
            </select>
          </div>
          <div className="w-full md:w-72">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Search (code or professor)</label>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search course code or professor"
              className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Series Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {filteredSeries.length} Series Found
          </h2>
        </div>

        {filteredSeries.length === 0 ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500">
            <span className="material-symbols-outlined text-6xl mb-4">
              assignment
            </span>
            <p>No series found. Click "Add New Series" to create one.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden xl:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-4 text-center text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === paginatedSeries.length && paginatedSeries.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-4 h-4 text-primary rounded focus:ring-2 focus:ring-primary/20"
                      />
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
                      onClick={() => handleSort("type")}
                    >
                      Type {sortColumn === "type" && (sortDirection === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
                      onClick={() => handleSort("title")}
                    >
                      Title {sortColumn === "title" && (sortDirection === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
                      onClick={() => handleSort("course")}
                    >
                      Course {sortColumn === "course" && (sortDirection === "asc" ? "↑" : "↓")}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Solution
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {paginatedSeries.map((item) => {
                    const course = courses.find((c) => c.id === item.courseId);
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                      >
                        <td className="px-4 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(item.id!)}
                            onChange={(e) => handleSelectItem(item.id!, e.target.checked)}
                            className="w-4 h-4 text-primary rounded focus:ring-2 focus:ring-primary/20"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold ${getTypeColor(item.type)}`}
                          >
                            {item.type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-slate-900 dark:text-white">
                            {formatTitle(item.title)}
                          </div>
                          {item.description && (
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                              {item.description}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-900 dark:text-white">
                            {course?.code || "N/A"}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {course?.name}
                          </div>
                          {course?.professor && (
                            <div className="text-xs text-slate-400 mt-1">
                              {`Prof. ${course.professor}`}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {item.hasSolution ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-full text-xs font-medium">
                              <span className="material-symbols-outlined text-[14px]">
                                check_circle
                              </span>
                              Yes
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 rounded-full text-xs font-medium">
                              <span className="material-symbols-outlined text-[14px]">
                                cancel
                              </span>
                              No
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex gap-2">
                            {/* View File Button */}
                            <a
                              href={item.driveUrl || "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`p-2 rounded-lg transition-colors ${item.driveUrl
                                ? "text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/40 cursor-pointer"
                                : "text-slate-400 dark:text-slate-600 bg-slate-50 dark:bg-slate-700/50 cursor-not-allowed opacity-60"
                                }`}
                              title={
                                item.driveUrl
                                  ? "View File"
                                  : "No file attachment - PDF not found"
                              }
                              onClick={(e) =>
                                !item.driveUrl && e.preventDefault()
                              }
                            >
                              <span className="material-symbols-outlined text-[20px]">
                                {item.driveUrl ? "folder_open" : "block"}
                              </span>
                            </a>

                            {/* View Solution Button */}
                            <a
                              href={item.solutionUrl || "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`p-2 rounded-lg transition-colors ${item.hasSolution && item.solutionUrl
                                ? "text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/40 cursor-pointer"
                                : "text-slate-400 dark:text-slate-600 bg-slate-50 dark:bg-slate-700/50 cursor-not-allowed opacity-60"
                                }`}
                              title={
                                !item.hasSolution
                                  ? "No solution available"
                                  : !item.solutionUrl
                                    ? "No solution attachment - PDF not found"
                                    : "View Solution"
                              }
                              onClick={(e) =>
                                (!item.hasSolution || !item.solutionUrl) &&
                                e.preventDefault()
                              }
                            >
                              <span className="material-symbols-outlined text-[20px]">
                                {item.hasSolution && item.solutionUrl
                                  ? "lightbulb"
                                  : "block"}
                              </span>
                            </a>

                            <button
                              onClick={() => handleEdit(item)}
                              className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/40 rounded-lg transition-colors"
                              title="Edit Series"
                            >
                              <span className="material-symbols-outlined text-[20px]">
                                edit
                              </span>
                            </button>
                            <button
                              onClick={() => handleDelete(item.id!)}
                              className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-lg transition-colors"
                            >
                              <span className="material-symbols-outlined text-[20px]">
                                delete
                              </span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Items per page:
                </label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="text-sm text-slate-600 dark:text-slate-400">
                Page {currentPage} of {totalPages} ({filteredSeries.length} total)
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  ← Prev
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>

            {/* Bulk Delete Button */}
            {selectedIds.size > 0 && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-lg flex items-center justify-between">
                <span className="text-sm font-medium text-red-700 dark:text-red-300">
                  {selectedIds.size} series selected
                </span>
                <button
                  onClick={handleBulkDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <span className="material-symbols-outlined inline-block mr-1 text-[18px] align-middle">
                    delete_sweep
                  </span>
                  Delete Selected
                </button>
              </div>
            )}

            {/* Mobile Card View */}
            <div className="xl:hidden divide-y divide-slate-200 dark:divide-slate-700">
              {paginatedSeries.map((item) => {
                const course = courses.find((c) => c.id === item.courseId);
                return (
                  <div
                    key={item.id}
                    className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${getTypeColor(item.type)}`}
                      >
                        {item.type}
                      </span>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id!)}
                        onChange={(e) => handleSelectItem(item.id!, e.target.checked)}
                        className="w-4 h-4 text-primary rounded focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        {item.hasSolution && (
                          <span className="badge badge-success mb-2">
                            <span className="material-symbols-outlined text-[14px]">check_circle</span>
                            Solution
                          </span>
                        )}
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                          {formatTitle(item.title)}
                        </h3>
                        {item.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-2">
                            {item.description}
                          </p>
                        )}
                        {course && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                            <span className="material-symbols-outlined text-[14px]">
                              {course.icon}
                            </span>
                            <span className="font-semibold truncate">
                              {course.name}
                            </span>
                          </div>
                        )}
                        {course?.professor && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {`Prof. ${course.professor}`}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                      <a
                        href={item.driveUrl || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-lg transition-colors text-xs font-bold ${item.driveUrl
                          ? "text-green-600 bg-green-50 hover:bg-green-100"
                          : "text-slate-400 bg-slate-50 cursor-not-allowed opacity-60"
                          }`}
                        title={item.driveUrl ? "View File" : "No file"}
                        onClick={(e) => !item.driveUrl && e.preventDefault()}
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {item.driveUrl ? "folder_open" : "block"}
                        </span>
                        <span>File</span>
                      </a>
                      {item.hasSolution && (
                        <a
                          href={item.solutionUrl || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-lg transition-colors text-xs font-bold ${item.solutionUrl
                            ? "text-amber-600 bg-amber-50 hover:bg-amber-100"
                            : "text-slate-400 bg-slate-50 cursor-not-allowed opacity-60"
                            }`}
                          title={
                            item.solutionUrl ? "View Solution" : "No solution"
                          }
                          onClick={(e) =>
                            !item.solutionUrl && e.preventDefault()
                          }
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {item.solutionUrl ? "lightbulb" : "block"}
                          </span>
                          <span>Solution</span>
                        </a>
                      )}
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-2 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          edit
                        </span>
                      </button>
                      <button
                        onClick={() => handleDelete(item.id!)}
                        className="p-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          delete
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="series-modal-title">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-[scaleIn_0.2s_ease-out] flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center flex-shrink-0">
              <h3 id="series-modal-title" className="text-xl font-bold text-slate-900 dark:text-white">
                {editingSeries ? "Edit Series" : "Add New Series"}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Show Original Title When Editing */}
            {editingSeries && (
              <div className="sticky top-0 z-10 mx-6 mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-lg">
                <p className="text-sm text-blue-900 dark:text-blue-200">
                  <strong>Original Title:</strong>{" "}
                  <span className="text-blue-700 dark:text-blue-300">{editingSeries.title}</span>
                </p>
              </div>
            )}

            {/* Important Notice - Dismissable */}
            {showWarning && (
              <div
                onClick={() => setShowWarning(false)}
                className="mx-6 mt-4 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-800/40 rounded-lg cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                title="Click to dismiss"
              >
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-2xl flex-shrink-0">
                    warning
                  </span>
                  <div className="flex-1">
                    <h4 className="font-bold text-red-900 dark:text-red-200 mb-1">
                      ⚠️ Important: Make file public
                    </h4>
                    <p className="text-sm text-red-800 dark:text-red-300">
                      Right-click file → Share → Change to "Anyone with the
                      link"
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                      This prevents login prompts for students. Leave empty if
                      you only have the solution.
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-red-400 dark:text-red-500 text-sm">
                    close
                  </span>
                </div>
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="flex flex-col flex-1 min-h-0"
            >
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Course *
                  </label>
                  <select
                    value={formData.courseId}
                    onChange={(e) => {
                      const selectedCourse = courses.find(
                        (c) => c.id === e.target.value,
                      );
                      setFormData({
                        ...formData,
                        courseId: e.target.value,
                        language: selectedCourse?.language || "fr",
                      });
                    }}
                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-white"
                    required
                  >
                    <option value="">Select Course/Module</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.code} - {course.name} ({course.level}) - Prof.{" "}
                        {course.professor}
                        {course.language &&
                          ` [${course.language === "fr" ? "🇫🇷 FR" : "🇬🇧 EN"}]`}
                      </option>
                    ))}
                  </select>
                  {formData.courseId && (
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="text-xs text-blue-800">
                        <p>
                          <strong>Selected:</strong>{" "}
                          {courses.find((c) => c.id === formData.courseId)?.name} ({courses.find((c) => c.id === formData.courseId)?.level}) - {courses.find((c) => c.id === formData.courseId)?.academicYear}
                          {courses.find((c) => c.id === formData.courseId)?.language && (
                            <span>
                              {" "}
                              • Language:{" "}
                              {courses.find((c) => c.id === formData.courseId)?.language === "fr"
                                ? "🇫🇷 Français"
                                : "🇬🇧 English"}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Title Mode Toggle */}
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50 dark:bg-slate-900/50">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                    Title Input Mode *
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="titleMode"
                        value="auto"
                        checked={formData.titleMode === "auto"}
                        onChange={(e) =>
                          setFormData({ ...formData, titleMode: "auto" })
                        }
                        className="w-4 h-4 text-primary focus:ring-2 focus:ring-primary/20"
                      />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        🤖 Auto-generate
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="titleMode"
                        value="manual"
                        checked={formData.titleMode === "manual"}
                        onChange={(e) =>
                          setFormData({ ...formData, titleMode: "manual" })
                        }
                        className="w-4 h-4 text-primary focus:ring-2 focus:ring-primary/20"
                      />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        ✏️ Manual entry
                      </span>
                    </label>
                  </div>
                </div>

                {/* Manual Title Input */}
                {formData.titleMode === "manual" && (
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-white"
                      placeholder="e.g., TD1 : Logique Mathematique : 2023 2024"
                      required={formData.titleMode === "manual"}
                      autoFocus
                      autoComplete="on"
                      name="series-title"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Enter the complete title manually
                    </p>
                  </div>
                )}

                {/* Auto-generation fields - only show in auto mode */}
                {formData.titleMode === "auto" && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                          Type *
                        </label>
                        <select
                          value={formData.type}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              type: e.target.value as any,
                            })
                          }
                          className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-white"
                          required
                        >
                          <option value="TD">TD (Travaux Dirigés)</option>
                          <option value="TP">TP (Travaux Pratiques)</option>
                          <option value="Exam">Exam</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                          Language *
                        </label>
                        <select
                          value={formData.language}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              language: e.target.value as "fr" | "en",
                            })
                          }
                          className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-white"
                          required
                        >
                          <option value="fr">🇫🇷 Français (TD/TP/Examen)</option>
                          <option value="en">🇬🇧 English (TW/PW/Exam)</option>
                        </select>
                      </div>
                    </div>

                    {/* Structured inputs for TD/TP */}
                    {(formData.type === "TD" || formData.type === "TP") && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                              {formData.type} Number *
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={formData.seriesNumber}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  seriesNumber: e.target.value,
                                })
                              }
                              className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-white"
                              placeholder="1"
                              required
                              autoComplete="on"
                              name="series-number"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                              Academic Year{" "}
                              <span className="text-slate-400 font-normal">
                                (optional)
                              </span>
                            </label>
                            <input
                              type="number"
                              min="2010"
                              max="2050"
                              placeholder="2023"
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val) {
                                  handleYearChange(parseInt(val));
                                } else {
                                  setFormData({
                                    ...formData,
                                    academicYear: "",
                                  });
                                }
                              }}
                              className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-white"
                              autoComplete="on"
                              name="academic-year"
                              list="year-suggestions"
                            />
                            {formData.academicYear && (
                              <div className="text-xs text-slate-500 mt-1">
                                Selected: {formData.academicYear}
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                            Chapter/Topic Title{" "}
                            <span className="text-slate-400 font-normal">
                              (optional)
                            </span>
                          </label>
                          <input
                            type="text"
                            value={formData.chapterTitle}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                chapterTitle: e.target.value,
                              })
                            }
                            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-white"
                            placeholder="e.g., Logique Mathematique"
                            autoComplete="on"
                            name="chapter-title"
                            list="chapter-suggestions"
                          />
                          <p className="text-xs text-slate-500 mt-1">
                            Add a descriptive title for the series content
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Structured inputs for Exam */}
                    {formData.type === "Exam" && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                            Exam Type *
                          </label>
                          <select
                            value={formData.examType}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                examType: e.target.value as any,
                              })
                            }
                            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-white"
                            required
                          >
                            <option value="Final">Final</option>
                            <option value="TD">
                              {formData.language === "fr" ? "TD" : "TW"}
                            </option>
                            <option value="TP">
                              {formData.language === "fr" ? "TP" : "PW"}
                            </option>
                            <option value="Rattrapage">Rattrapage</option>
                            <option value="Devoir">Devoir</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                            Academic Year *
                          </label>
                          <input
                            type="number"
                            min="2010"
                            max="2050"
                            value={
                              formData.academicYear
                                ? parseInt(String(formData.academicYear).split('-')[0])
                                : ''
                            }
                            onChange={(e) => {
                              const v = e.target.value;
                              if (!v) {
                                setFormData({ ...formData, academicYear: '' });
                              } else {
                                const n = parseInt(v);
                                if (!Number.isNaN(n)) handleYearChange(n);
                              }
                            }}
                            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-white"
                            placeholder={String(new Date().getFullYear())}
                            required
                            autoComplete="on"
                            name="exam-year"
                            list="year-suggestions"
                          />
                          <div className="text-xs text-slate-500 mt-1">
                            Selected: {formData.academicYear}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Preview generated title - only in auto mode */}
                    {formData.titleMode === "auto" && (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="material-symbols-outlined text-green-600">
                            auto_awesome
                          </span>
                          <span className="text-sm font-bold text-green-900">
                            Auto-Generated Title:
                          </span>
                        </div>
                        <div className="text-lg font-mono font-bold text-green-700">
                          {generateTitle() || "(Fill fields above)"}
                        </div>
                        <div className="text-xs text-green-600 mt-1">
                          Will be saved as: {formatTitle(generateTitle())}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Drive URLs section */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    <span className="material-symbols-outlined text-lg align-middle mr-1">
                      folder
                    </span>
                    Exercise/Exam File URL {!formData.hasSolution && "*"}
                  </label>
                  <input
                    type="url"
                    value={formData.driveUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, driveUrl: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-white"
                    placeholder="https://drive.google.com/... (Optional if only solution)"
                    required={!formData.hasSolution}
                    autoComplete="on"
                    name="drive-url"
                  />
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-blue-600 text-sm mt-0.5">
                        info
                      </span>
                      <div className="text-xs text-blue-800">
                        <p className="font-semibold mb-1">
                          Important: Make file public
                        </p>
                        <p>
                          Right-click file → Share → Change to "Anyone with the
                          link"
                        </p>
                        <p className="mt-1 text-blue-600">
                          This prevents login prompts for students
                        </p>
                        <p className="mt-1 text-slate-600">
                          Leave empty if you only have the solution
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                  <input
                    type="checkbox"
                    id="hasSolution"
                    checked={formData.hasSolution}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        hasSolution: e.target.checked,
                      })
                    }
                    className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary/20"
                  />
                  <label
                    htmlFor="hasSolution"
                    className="text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    Has Solution Available
                  </label>
                </div>

                {formData.hasSolution && (
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                      <span className="material-symbols-outlined text-lg align-middle mr-1">
                        lightbulb
                      </span>
                      Solution Drive URL
                    </label>
                    <input
                      type="url"
                      value={formData.solutionUrl}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          solutionUrl: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-white"
                      placeholder="https://drive.google.com/..."
                      autoComplete="on"
                      name="solution-url"
                    />
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-blue-600 text-sm mt-0.5">
                          info
                        </span>
                        <p className="text-xs text-blue-800">
                          Also make solution file public (Anyone with the link)
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Datalist for autocomplete suggestions */}
              <datalist id="year-suggestions">
                <option value="2020" />
                <option value="2021" />
                <option value="2022" />
                <option value="2023" />
                <option value="2024" />
                <option value="2025" />
                <option value="2026" />
              </datalist>

              <datalist id="chapter-suggestions">
                <option value="Logique Mathematique" />
                <option value="Algebre" />
                <option value="Analyse" />
                <option value="Probabilites" />
                <option value="Statistiques" />
                <option value="Algorithmique" />
                <option value="Structures de Donnees" />
                <option value="Bases de Donnees" />
                <option value="Reseaux" />
                <option value="Programmation" />
              </datalist>

              <div className="p-6 pt-4 border-t border-slate-100 dark:border-slate-700 flex gap-3 flex-shrink-0 bg-slate-50 dark:bg-slate-900/50">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors"
                >
                  {editingSeries ? "Update Series" : "Create Series"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fixed Floating Add Button */}
      <button
        onClick={() => {
          // Auto-select filtered course if one is selected
          if (selectedCourseId !== "all") {
            setFormData((prev) => ({ ...prev, courseId: selectedCourseId }));
          }
          setIsModalOpen(true);
        }}
        className="fixed bottom-8 right-8 px-6 py-4 bg-primary hover:bg-primary/90 text-white font-bold rounded-full transition-all shadow-lg hover:shadow-xl flex items-center gap-2 z-40"
        title="Add New Series"
      >
        <span className="material-symbols-outlined text-2xl">add</span>
        <span className="hidden md:inline">Add Series</span>
      </button>

      {/* Notification Dialog */}
      <div className="toast-container">
        {notification && (
          <div>
            <div role="status" aria-live="polite">
              <div className={notification.type === 'success' ? 'toast toast-success' : 'toast toast-error'}>
                <div className="flex items-center justify-between">
                  <div>{notification.message}</div>
                  <button aria-label="Dismiss" onClick={() => setNotification(null)}>✕</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default AdminSeries;
