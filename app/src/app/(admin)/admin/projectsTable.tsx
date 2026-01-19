//Author:
//Ian Cuchapin: functionality.
//Dilan Wijemanne: UI
//Jonty Hourn: Intergration with AWS Amplify
// Description: ProjectsTable component for displaying and managing projects in the admin section
import React, { useState, useEffect } from 'react';

import { FaCommentDots } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { generateClient } from 'aws-amplify/data'; // Import Amplify Data client
import { type Schema } from '../../../../amplify/data/resource'; // Import your Amplify schema

interface Project {
    id: string;
    name: string;
    status: string;
    comments: string;
}

interface ProjectsTableProps {
    name: string;
    searchTerm: string;
}

const client = generateClient<Schema>(); // Initialize Amplify Data client

export const ProjectsTable: React.FC<ProjectsTableProps> = ({ name, searchTerm }) => {


    const [data, setData] = useState<Project[] >([]);
    const [editCommentIndex, setEditCommentIndex] = useState<number | null>(null);
    const [editedComment, setEditedComment] = useState<string>("");
    const [nextToken, setNextToken] = useState<string | null>(null);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [pageTokens, setPageTokens] = useState<(string | null)[]>([null]);
    const [hasMorePages, setHasMorePages] = useState(true);
    const [isStudentModalOpen, setIsStudentModalOpen] = useState<boolean>(false);
    interface Student {
        id: string;
        name: string;
    }

    const [students, setStudents] = useState<Student[]>([]);


    const fetchProjects = React.useCallback(async (token: string | null) => {
        const filter = name.split(" ")[0];
        const { data: projects, nextToken: newNextToken, errors } = await client.models.Projects.list({
            filter: {
                and: [
                    { projectTitle: { contains: searchTerm } },
                    { projectStatus: {eq: filter} },
                ],

            },
            nextToken: token,
            limit: 15, // Limit results per page
            authMode: "userPool",
        });
        if (!errors) {
            setData(projects.map(project => ({
                name: project.projectTitle || "Untitled",
                status: project.projectStatus || "Unassigned",
                comments: project.projectModComments || "",
                id: project.id || "" // Ensure ID is included
            })));
            setNextToken(newNextToken ?? null);
            if (!newNextToken) setHasMorePages(false);
        }
    }, [searchTerm, name]);

    useEffect(() => {
        fetchProjects(pageTokens[currentPageIndex]);
    }, [searchTerm, currentPageIndex, pageTokens, fetchProjects]);
    
    const handleNextPage = () => {
        if (hasMorePages && currentPageIndex === pageTokens.length - 1) {
            setPageTokens([...pageTokens, nextToken]);
        }
        if (hasMorePages) {
            setCurrentPageIndex(currentPageIndex + 1);
        }
    };

    const handlePreviousPage = () => {
        if (currentPageIndex > 0) {
            setCurrentPageIndex(currentPageIndex - 1);
            setHasMorePages(true);
        }
    };



    const router = useRouter();


    const openStudentModal = async (projectId: string) => {
        try {
            const { data: studentsPro } = await client.models.ProjectsStudents.list({ filter: { projectId: { eq: projectId } } });
            const studentIds = studentsPro.map((student) => student.studentId);
            const studentPromises = studentIds.map(async (studentId) => {
                const { data: student } = await client.models.Student.get({ id: studentId }, { authMode: "userPool" });
                return {
                    id: student?.id || "Unknown ID",
                    name: student?.fristName + " " + student?.lastName || "Unnamed Student",
                };
            });
            const resolvedStudents = await Promise.all(studentPromises);
            setStudents(resolvedStudents);
            setIsStudentModalOpen(true);
        } catch (error) {
            console.error("Error fetching students:", error);
        }
    };

    const closeStudentModal = () => {
        setIsStudentModalOpen(false);
        setStudents([]);
    };

    return (
        <div className="p-6">
            <table className="min-w-full border-collapse border border-gray-600">
                <thead>
                    <tr className="bg-gray-500 text-white border-b border-gray-600">
                        <th className="w-[40%] px-4 py-2 text-center border-r border-gray-600">Project Name</th>
                        <th className="w-[15%] px-4 py-2 text-center border-r border-gray-600">Status</th>
                        <th className="w-[15%] px-4 py-2 text-center border-r border-gray-600">Project</th>
                        <th className="w-[15%] px-4 py-2 text-center border-r border-gray-600">Students</th>
                        <th className="w-[15%] px-4 py-2 text-center border-r border-gray-600">Comments</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((project, index) => (
                        <tr
                            key={index}
                            className={`relative border-t border-gray-300 ${index % 2 !== 0 ? 'bg-gray-300' : 'bg-gray-100'}`}
                        >
                            {/* Project Name */}
                            <td className="px-4 py-2 text-center border-r border-gray-600">{project.name}</td>

                            {/* Project Status */}
                            <td className="px-4 py-2 border-r border-gray-600">
                                <div className="flex justify-center">

                                    {project.status}

                                </div>
                            </td>

                            {/* Project Form */}
                            <td className="px-2 py-2 border-r border-gray-600">
                                <div className="flex justify-center items-center w-full h-full">
                                    <button
                                        className="text-sm text-white font-bold bg-[#0033FF] px-2 py-1 border-none rounded-none cursor-pointer hover:opacity-70"
                                        onClick={() => router.push('/adminProjectForm?projectId=' + project.id)}
                                    >
                                        View Form
                                    </button>
                                </div>
                            </td>

                            {/* Project Contact */}
                            <td className="px-2 py-2 border-r border-gray-600 text-center">
                                <button
                                    className="text-sm text-white font-bold bg-[#0033FF] px-2 py-1 border-none rounded-none cursor-pointer hover:opacity-70"
                                    onClick={() => openStudentModal(project.id)}
                                >
                                    View Students
                                </button>
                            </td>

                            {/* Comment Column */}
                            <td className="px-2 py-2 text-center relative">
                                <div
                                    className="flex justify-center cursor-pointer"
                                    onClick={() => {
                                        setEditCommentIndex(index);
                                        setEditedComment(project.comments || '');
                                    }}
                                >
                                    <FaCommentDots className="text-lg text-gray-700 hover:text-blue-500" />
                                </div>

                                {editCommentIndex === index && (
                                    <div className="absolute z-20 bg-gray-200 border p-4 w-80 min-h-32 top-full left-1/2 transform -translate-x-1/2 mt-2">
                                        <textarea
                                            value={editedComment}
                                            placeholder="Add a comment..."
                                            onChange={(e) => setEditedComment(e.target.value)}
                                            className="min-w-80 max-w-80 max-h-64 text-sm whitespace-normal word-wrap-break-word focus:outline-none"
                                            rows={5}
                                            autoFocus
                                        />
                                        <div className="flex justify-end space-x-2 mt-2">
                                            <button
                                                className="text-sm text-white font-bold bg-[#0033FF] px-2 py-1 border-none rounded-none cursor-pointer"
                                                onClick={() => {
                                                    client.models.Projects.update({
                                                        id: project.id,
                                                        projectModComments: editedComment,
                                                    }, { authMode: "userPool" })
                                                        .then(() => {
                                                            const updatedData = [...(data || [])];
                                                            updatedData[index].comments = editedComment;
                                                            setData(updatedData);
                                                        });
                                                    setEditCommentIndex(null);
                                                }}
                                            >
                                                Save
                                            </button>
                                            <button
                                                className="text-sm text-white font-bold bg-[#ED0A00] px-2 py-1 border-none rounded-none cursor-pointer"
                                                onClick={() => setEditCommentIndex(null)}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </td>

                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="flex justify-center gap-4 mt-4">
                <button
                    className="w-32 bg-[#0033FF] hover:enabled:bg-[#ED0A00] font-bold text-white border-none px-5 py-3 gap-4 disabled:opacity-50 hover:cursor-pointer disabled:cursor-not-allowed"
                    onClick={handlePreviousPage}
                    disabled={currentPageIndex === 0}
                >
                    Previous
                </button>
                <button
                    className="w-32 bg-[#0033FF] hover:enabled:bg-[#ED0A00] font-bold text-white border-none px-5 py-3 gap-4 disabled:opacity-50 hover:cursor-pointer disabled:cursor-not-allowed"
                    onClick={handleNextPage}
                    disabled={!hasMorePages}
                >
                    Next
                </button>
            </div>


            {/* Student Modal */}
            {isStudentModalOpen && (
                <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex justify-center items-center z-30" onClick={closeStudentModal}>
                    <div className="bg-white p-6 w-80 z-40" onClick={(e) => e.stopPropagation()}>
                        <h1 className="text-2xl text-[#001641] mb-4">Students</h1>
                        {students.length > 0 ? (
                            <ul>
                                {students.map((student, idx) => (
                                    <li key={idx} className="mb-2 text-lg text-[#001641]">
                                        {student.name || "Unnamed Student"}
                                        <button
                                            className="ml-2 bg-[#0033FF] text-sm text-white border-none font-bold"
                                            onClick={() => router.push('/adminStudentForm?studentId=' + student.id)}
                                        >
                                            View Details
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p>No students found.</p>
                        )}
                        <button
                            onClick={closeStudentModal}
                            className="block w-full py-2 px-4 text-center bg-[#ED0A00] text-white font-bold mt-4 border-none cursor-pointer"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
