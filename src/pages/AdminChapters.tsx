import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Resource, Course } from '../types';
import {
  getResourcesByCourseId,
  getAllCourses,
  createResource,
  updateResource,
  deleteResource
} from '../services/database.service';

const AdminChapters: React.FC = () => {
  const navigate = useNavigate();
  const [resources, setResources] = useState<Resource[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [courseSearch, setCourseSearch] = useState<string>('');
  const [resourceFilter, setResourceFilter] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [showWarning, setShowWarning] = useState(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    chapterNumber: '' as number | string,
    description: '',
    date: new Date().toISOString().split('T')[0],
    driveUrl: '',
    resourceType: 'chapter' as 'chapter' | 'book'
  });
  const [autoNumber, setAutoNumber] = useState<boolean>(true);

  // Format title by replacing _ and - with spaces, but keep year ranges like 2024-2025
  const formatTitle = (title: string): string => {
    // First, protect year ranges by temporarily replacing them
    const yearPattern = /(\d{4})[-](\d{4})/g;
    const protectedYears: string[] = [];
    let tempTitle = title.replace(yearPattern, (match) => {
      const placeholder = `__YEAR${protectedYears.length}__`;
      protectedYears.push(match);
      return placeholder;
    });

    // Replace all _ and - with spaces
    tempTitle = tempTitle.replace(/[_-]/g, ' ');

    // Restore the year ranges
    protectedYears.forEach((year, index) => {
      tempTitle = tempTitle.replace(`__YEAR${index}__`, year);
    });

    return tempTitle;
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      fetchResources();
    }
  }, [selectedCourseId]);

  // Filtered courses by search (code, name, professor, level)
  const filteredCourses = courses.filter((c: Course) => {
    if (!courseSearch) return true;
    const q = courseSearch.trim().toLowerCase();
    return (
      (c.code || '').toLowerCase().includes(q) ||
      (c.name || '').toLowerCase().includes(q) ||
      (c.professor || '').toLowerCase().includes(q) ||
      (c.level || '').toLowerCase().includes(q) ||
      (c.academicYear || '').toLowerCase().includes(q)
    );
  });

  // Keep selectedCourseId in sync: if current selection is filtered out, pick the first match.
  useEffect(() => {
    if (!courseSearch) return; // only adjust when searching
    if (filteredCourses.length === 0) {
      // no match: clear selection
      setSelectedCourseId('');
      return;
    }
    const exists = filteredCourses.some((c: Course) => c.id === selectedCourseId);
    if (!exists) {
      setSelectedCourseId(filteredCourses[0].id);
    }
  }, [courseSearch, courses]);

  // Filtered resources by title/description/number when showing chapters
  const filteredResources = resources.filter((r: Resource) => {
    if (!resourceFilter) return true;
    const q = resourceFilter.toLowerCase();
    return (
      (r.title || '').toLowerCase().includes(q) ||
      (r.description || '').toLowerCase().includes(q) ||
      (r.chapterNumber !== undefined && String(r.chapterNumber).includes(q))
    );
  });

  const fetchCourses = async () => {
    try {
      const coursesData = await getAllCourses();
      setCourses(coursesData);
      if (coursesData.length > 0 && !selectedCourseId) {
        setSelectedCourseId(coursesData[0].id);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchResources = async () => {
    if (!selectedCourseId) return;

    setLoading(true);
    try {
      console.log('Fetching resources for courseId:', selectedCourseId);
      const resourcesData = await getResourcesByCourseId(selectedCourseId);
      console.log('Resources fetched:', resourcesData);
      setResources(resourcesData);
    } catch (error) {
      console.error('Error fetching resources:', error);
      setNotification({ type: 'error', message: 'Failed to load chapters' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (resource: Resource) => {
    setEditingResource(resource);
    setFormData({
      title: resource.title,
      chapterNumber: resource.chapterNumber ?? '',
      description: resource.description || '',
      date: resource.date,
      driveUrl: resource.driveUrl,
      resourceType: (resource as any).resourceType || 'chapter'
    });
    // When editing, disable auto-number if there is an existing chapter number
    setAutoNumber(resource.chapterNumber == null);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this chapter?')) return;

    try {
      await deleteResource(id);
      setNotification({ type: 'success', message: 'Chapter deleted successfully!' });
      await fetchResources();
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Error deleting resource:', error);
      setNotification({ type: 'error', message: 'Failed to delete chapter' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCourseId) {
      alert('Please select a course first');
      return;
    }

    const selectedCourse = courses.find((c: Course) => c.id === selectedCourseId);

    try {
      const resourceData: any = {
        title: formatTitle(formData.title), // Format title before saving
        driveUrl: formData.driveUrl,
        date: formData.date,
        courseId: selectedCourseId,
        resourceType: formData.resourceType
      };

      // Only include chapterNumber when user explicitly provided it (autoNumber = false)
      if (formData.resourceType === 'chapter' && !autoNumber && formData.chapterNumber !== '' && formData.chapterNumber !== null) {
        resourceData.chapterNumber = Number(formData.chapterNumber);
      }

      // Only add optional fields if they have values
      if (formData.description) {
        resourceData.description = formData.description;
      }

      if (selectedCourse?.academicYear) {
        resourceData.academicYear = selectedCourse.academicYear;
      }

      if (editingResource) {
        await updateResource(editingResource.id!, resourceData);
        setNotification({ type: 'success', message: 'Chapter updated successfully!' });
      } else {
        await createResource(resourceData);
        setNotification({ type: 'success', message: 'Chapter created successfully!' });
      }

      // Reset form
      setFormData({
        title: '',
        chapterNumber: '' as number | string,
        description: '',
        date: new Date().toISOString().split('T')[0],
        driveUrl: '',
        resourceType: 'chapter'
      });
      setAutoNumber(true);
      setIsEditing(false);
      setEditingResource(null);
      setIsModalOpen(false);
      await fetchResources();

      // Auto-dismiss notification after 3 seconds
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      console.error('Error saving resource:', error);
      setNotification({ type: 'error', message: `Failed to save chapter: ${error.message || 'Unknown error'}` });
    }
  };

  const handleCancel = () => {
    setFormData({
      title: '',
      chapterNumber: '' as number | string,
      description: '',
      date: new Date().toISOString().split('T')[0],
      driveUrl: '',
      resourceType: 'chapter'
    });
    setIsEditing(false);
    setEditingResource(null);
    setAutoNumber(true);
    setIsModalOpen(false);
  };

  const selectedCourse = courses.find((c: Course) => c.id === selectedCourseId);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/admin/modules')}
            className="flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors mb-2"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to Modules
          </button>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Manage Chapters</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Add and manage course chapters/resources</p>
        </div>
      </div>

      {/* Course Selector */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
          Select Course/Module
        </label>
        <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr_auto] gap-3 mb-4 items-center">
          {/* Search input - takes the most space */}
          <input
            type="text"
            placeholder="Search courses by code, name or professor"
            value={courseSearch}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCourseSearch(e.target.value)}
            className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-lg focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 font-medium text-slate-900 dark:text-white text-sm shadow-sm"
          />

          {/* Dropdown - takes good amount of space */}
          <select
            value={selectedCourseId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedCourseId(e.target.value)}
            className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-lg focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 font-medium text-slate-900 dark:text-white text-sm shadow-sm"
          >
            {filteredCourses.map((course: Course) => (
              <option key={course.id} value={course.id}>
                {course.code} - {course.name} ({course.level}) - {course.academicYear}
              </option>
            ))}
          </select>

          {/* Clear button - intentionally narrow (~w-1/6 feel on desktop) */}
          <button
            type="button"
            onClick={() => setCourseSearch('')}
            className="px-5 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors whitespace-nowrap min-w-[80px] md:min-w-[90px] md:w-32 lg:w-36 shadow-sm"
            title="Clear filter"
          >
            Clear
          </button>
        </div>
        {selectedCourse && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Professor: {selectedCourse.professor} • Level: {selectedCourse.level} • Year: {selectedCourse.academicYear}
          </p>
        )}
      </div>

      {/* Chapters List */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">library_books</span>
            Chapters for {selectedCourse?.name || 'Selected Course'}
          </h2>
          <div className="mt-2 flex items-center gap-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {filteredResources.length} chapter{filteredResources.length !== 1 ? 's' : ''} shown
            </p>
            <div className="flex-1">
              <input
                type="search"
                placeholder="Filter chapters by title, description, or number"
                value={resourceFilter}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setResourceFilter(e.target.value)}
                className="w-full md:w-96 px-3 py-2 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 z-50 flex items-center justify-center">
            <div className="text-center space-y-8 p-8">
              {/* Animated Logo/Icon */}
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="relative bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-2xl border border-slate-200 dark:border-slate-700">
                  <span className="material-symbols-outlined text-7xl text-primary animate-bounce">
                    library_books
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
                  Loading Chapters
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
                    className="h-full bg-gradient-to-r from-primary to-primary/60 dark:from-primary/80 dark:to-primary/40 rounded-full"
                    style={{
                      width: "100%",
                      animation: "shimmer 0.8s ease-in-out infinite",
                    }}
                  ></div>
                </div>
              </div>
            </div>

            <style>{`
              @keyframes shimmer {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
              }
            `}</style>
          </div>
        ) : resources.length === 0 ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500">
            <span className="material-symbols-outlined text-6xl mb-4">library_books</span>
            <p>No chapters added yet for this course.</p>
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500">
            <span className="material-symbols-outlined text-6xl mb-4">search_off</span>
            <p>No chapters match your search/filter.</p>
          </div>
        ) : (
          <>
            <div className="hidden xl:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider w-16">
                      Type
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider w-16">
                      N°
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Drive URL
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {filteredResources.map((resource: Resource) => (
                    <tr key={resource.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${(resource as any).resourceType === 'book'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                          }`}>
                          {(resource as any).resourceType === 'book' ? '📚 Book' : '📄 Ch'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-bold text-slate-900 dark:text-white">
                          {(resource as any).resourceType === 'book' ? '—' : resource.chapterNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-slate-900 dark:text-white">{formatTitle(resource.title)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-600 dark:text-slate-400 max-w-xs truncate">
                          {resource.description || '—'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                        {resource.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <a
                          href={resource.driveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">folder</span>
                          View Drive
                        </a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(resource)}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/40 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(resource.id)}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="xl:hidden divide-y divide-slate-200 dark:divide-slate-700">
              {filteredResources.map((resource: Resource) => (
                <div key={resource.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <span className={`inline-block w-full px-2 py-1 rounded text-xs font-bold mb-3 ${(resource as any).resourceType === 'book'
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                    }`}>
                    {(resource as any).resourceType === 'book' ? '📚 Book' : '📄 Chapter'}
                  </span>
                  <div className="flex items-start gap-3 mb-3">
                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs font-bold text-slate-700 dark:text-slate-300 flex-shrink-0">
                      #{resource.chapterNumber}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">{resource.title}</h3>
                      {resource.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-1">{resource.description}</p>
                      )}
                      {resource.date && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          {new Date(resource.date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                    <a
                      href={resource.driveUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 rounded-lg transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">folder</span>
                      <span>View Drive</span>
                    </a>
                    <button
                      onClick={() => handleEdit(resource)}
                      className="p-2 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(resource.id)}
                      className="p-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Fixed Floating Add Button */}
      <button
        onClick={() => {
          // Prepare modal for creating a new chapter
          setIsModalOpen(true);
          setIsEditing(false);
          setEditingResource(null);
          setFormData({
            title: '',
            chapterNumber: '' as number | string,
            description: '',
            date: new Date().toISOString().split('T')[0],
            driveUrl: '',
            resourceType: 'chapter'
          });
          setAutoNumber(true);
        }}
        className="fixed bottom-8 right-8 px-6 py-4 bg-primary hover:bg-primary/90 text-white font-bold rounded-full transition-all shadow-lg hover:shadow-xl flex items-center gap-2 z-40"
        title="Add New Chapter"
      >
        <span className="material-symbols-outlined text-2xl">add</span>
        <span className="hidden md:inline">Add Chapter</span>
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-[scaleIn_0.2s_ease-out] flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-center flex-shrink-0">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary dark:text-primary/90">
                  {isEditing ? 'edit' : 'add_circle'}
                </span>
                {isEditing ? 'Edit Chapter/Book' : 'Add New Chapter/Book'}
              </h3>
              <button
                onClick={handleCancel}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Show Original Title When Editing */}
            {isEditing && editingResource && (
              <div className="sticky top-0 z-10 mx-6 mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-lg">
                <p className="text-sm text-blue-900 dark:text-blue-200">
                  <strong>Original Title:</strong> <span className="text-blue-700 dark:text-blue-300">{editingResource.title}</span>
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
                    <h4 className="font-bold text-red-900 dark:text-red-200 mb-1">⚠️ Important: Make file public</h4>
                    <p className="text-sm text-red-800 dark:text-red-300">
                      Right-click file → Share → Change to "Anyone with the link"
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                      This prevents login prompts for students.
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-red-400 dark:text-red-500 text-sm">
                    close
                  </span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                {/* Resource Type Selector */}
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50 dark:bg-slate-900/50">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                    Resource Type *
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="resourceType"
                        value="chapter"
                        checked={formData.resourceType === 'chapter'}
                        onChange={(_e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, resourceType: 'chapter' })}
                        className="w-4 h-4 text-primary focus:ring-2 focus:ring-primary/20"
                      />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        📄 Individual Chapter
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="resourceType"
                        value="book"
                        checked={formData.resourceType === 'book'}
                        onChange={(_e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, resourceType: 'book' })}
                        className="w-4 h-4 text-primary focus:ring-2 focus:ring-primary/20"
                      />
                      <span className="text-sm font-medium text-slate-700">
                        📚 Full Course Book (Polycopié)
                      </span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                      Chapter N° {formData.resourceType === 'book' && <span className="text-slate-400 font-normal">(optional)</span>}
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={autoNumber}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAutoNumber(e.target.checked)}
                        id="autoNumber"
                        className="w-4 h-4 text-primary focus:ring-2 focus:ring-primary/20"
                        disabled={formData.resourceType === 'book'}
                        title="When checked, chapter number is auto-assigned"
                      />
                      <label htmlFor="autoNumber" className="text-sm text-slate-700 dark:text-slate-300">Auto-assign chapter number</label>
                    </div>

                    <input
                      type="number"
                      min="1"
                      value={formData.chapterNumber}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, chapterNumber: e.target.value === '' ? '' : parseInt(e.target.value) })}
                      className="w-full mt-2 px-4 py-3 border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/50 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-white"
                      placeholder={autoNumber ? 'Auto-assigned on create' : 'Enter chapter number'}
                      required={false}
                      disabled={formData.resourceType === 'book' || autoNumber}
                    />
                  </div>
                  <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    {formData.resourceType === 'chapter' ? 'Chapter Title' : 'Book Title'} *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, title: e.target.value })}
                    autoFocus
                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/50 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-white"
                      placeholder={formData.resourceType === 'chapter' ? 'e.g., Introduction to Algorithms' : 'e.g., Polycopié Complet du Cours'}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/50 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-white"
                    placeholder="Brief description"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/50 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    <span className="material-symbols-outlined text-lg align-middle mr-1">folder</span>
                    Google Drive URL *
                  </label>
                  <input
                    type="url"
                    value={formData.driveUrl}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, driveUrl: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/50 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-white"
                    placeholder="https://drive.google.com/..."
                    required
                  />
                </div>
              </div>

              <div className="p-6 pt-4 border-t border-slate-100 dark:border-slate-700/50 flex gap-3 flex-shrink-0 bg-slate-50 dark:bg-slate-800/30">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700/50 text-slate-600 dark:text-slate-300 font-bold rounded-lg hover:bg-white dark:hover:bg-slate-700/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg transition-colors"
                >
                  {isEditing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notification Dialog */}
      {notification && (
        <div className="fixed top-4 right-4 z-[60] animate-[slideInRight_0.3s_ease-out]">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl ${notification.type === 'success'
            ? 'bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800/40'
            : 'bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800/40'
            }`}>
            <span className={`material-symbols-outlined ${notification.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
              {notification.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <p className={`font-semibold ${notification.type === 'success' ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
              }`}>
              {notification.message}
            </p>
            <button
              onClick={() => setNotification(null)}
              className={`ml-2 ${notification.type === 'success' ? 'text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300' : 'text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300'
                }`}
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminChapters;
