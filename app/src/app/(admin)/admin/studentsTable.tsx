//Author:
//Ian Cuchapin: functionality.
//Dilan Wijemanne: UI
//Jonty Hourn: Intergration with AWS Amplify
// Description: StudentTable component for displaying Students in the admin section
import React, { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/data';
import { type Schema } from '../../../../amplify/data/resource';
import { useRouter } from 'next/navigation';
const client = generateClient<Schema>();

interface Student {
    name: string;
    email: string;
    id: string;
    phone?: string;
}

interface StudentsTableProps {
    name?: string;
    searchTerm: string;
}

export const StudentsTable: React.FC<StudentsTableProps> = ({ searchTerm }) => {
    const [data, setData] = useState<Student[]>([]);
    const [nextToken, setNextToken] = useState<string | null>(null);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [pageTokens, setPageTokens] = useState<(string | null)[]>([null]);
    const [hasMorePages, setHasMorePages] = useState(true);
    const router = useRouter();

    const fetchStudents = React.useCallback(async (token: string | null) => {
        const { data: students, nextToken: newNextToken, errors } = await client.models.Student.list({
            filter: {
                or: [
                    { fristName: { contains: searchTerm } },
                    { lastName: { contains: searchTerm } },
                    { email: { contains: searchTerm } },
                    { phone: { contains: searchTerm } },
                ],
            },
            nextToken: token,
            limit: 15, // Limit results per page
            authMode: "userPool",
        });

        if (!errors) {
            setData(students.map(student => ({
                name: student.fristName + " " + student.lastName || "Unnamed Student",
                email: student.email || "Unknown Email",
                id: student.id,
                phone: student.phone ?? "+61 2 1234 5678",
            })));
            setNextToken(newNextToken ?? null);
            if (!newNextToken) setHasMorePages(false);
        }
    }, [searchTerm]);

    useEffect(() => {
        fetchStudents(pageTokens[currentPageIndex]);
    }, [searchTerm, currentPageIndex, pageTokens, fetchStudents]);

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

    return (
        <div className="p-6">
            <table className="min-w-full border-collapse border border-gray-600">
                <thead>
                    <tr className="bg-gray-500 text-white">
                        <th className="w-[30%] border border-gray-600 px-4 py-2 text-center">Student Name</th>
                        <th className="w-[30%] border border-gray-600 px-4 py-2 text-center">Email</th>
                        <th className="w-[20%] border border-gray-600 px-4 py-2 text-center">Phone</th>
                        <th className="w-[20%] border border-gray-600 px-4 py-2 text-center">View Details</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((student, index) => (
                        <tr key={index} className={`text-center ${index % 2 === 0 ? 'bg-gray-300' : 'bg-gray-100'}`}>
                            <td className="w-[30%] border border-gray-600 px-4 py-2">{student.name}</td>
                            <td className="w-[30%] border border-gray-600 px-4 py-2 text-center underline text-blue-600">{student.email}</td>
                            <td className='w-[20%] border border-gray-600 px-4 py-2'>{student.phone}</td>
                            <td className="w-[20%] px-2 py-2 border-r border-gray-600">
                                <div className="flex justify-center items-center w-full h-full">
                                    <span
                                        className="text-sm text-white font-bold bg-[#0033FF] px-2 py-1 border-none rounded-none cursor-pointer hover:opacity-70"
                                        onClick={() => router.push('/adminStudentForm?studentId=' + student.id)}
                                    >
                                        Student Details
                                    </span>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="flex justify-center mt-4 gap-4">
                <button
                    className="w-32 bg-[#0033FF] hover:enabled:bg-[#ED0A00] text-white border-none px-5 py-3 gap-4 disabled:opacity-50 hover:cursor-pointer disabled:cursor-not-allowed"
                    onClick={handlePreviousPage}
                    disabled={currentPageIndex === 0}
                >
                    Previous
                </button>
                <button
                    className="w-32 bg-[#0033FF] hover:enabled:bg-[#ED0A00] text-white border-none px-5 py-3 gap-4 disabled:opacity-50 hover:cursor-pointer disabled:cursor-not-allowed"
                    onClick={handleNextPage}
                    disabled={!hasMorePages}
                >
                    Next
                </button>
            </div>
        </div>
    );
};
